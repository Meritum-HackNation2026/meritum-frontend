/**
 * The check page through the public API of `src/checks`, with a fake API behind `fetch`.
 *
 * @feature US-SPR-01, US-BEZ-07, US-DST-01, F-01, F-21
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { apiCheckSender } from '@/api'
import { CheckPage } from '@/checks'
import pl from '@/copy/pl.json'

const uuid = /^[0-9a-f-]{36}$/

function fakeApi(t: TestContext, status = 202) {
  return t.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify({ check_id: 'c_01' }), { status })),
  )
}

function typeAndCheck(value: string) {
  fireEvent.change(screen.getByLabelText(pl.form.input_label), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: pl.form.submit }))
}

for (const [input, message] of [
  ['ab', pl.errors.empty],
  ['ftp://example.com', pl.errors.invalid_url],
] as const) {
  test(`"${input}" shows a Polish message under the field and sends nothing`, (t) => {
    const fetch = fakeApi(t)
    render(<CheckPage sender={apiCheckSender} />)
    typeAndCheck(input)
    assert.equal(screen.getByRole('alert').textContent, message)
    assert.equal(fetch.mock.callCount(), 0)
  })
}

test('the message stays until the text changes', (t) => {
  fakeApi(t)
  render(<CheckPage sender={apiCheckSender} />)
  typeAndCheck('ab')
  fireEvent.click(screen.getByRole('button', { name: pl.form.submit }))
  assert.equal(screen.queryAllByRole('alert').length, 1)
  fireEvent.change(screen.getByLabelText(pl.form.input_label), { target: { value: 'abc' } })
  assert.equal(screen.queryAllByRole('alert').length, 0)
})

test('1200 characters go to POST /api/v1/checks as a web CheckRequest with the session id', async (t) => {
  const fetch = fakeApi(t)
  const text = 'Od stycznia nie zapłacisz w sklepie gotówką. '.repeat(30).slice(0, 1200)
  render(<CheckPage sender={apiCheckSender} />)
  typeAndCheck(text)
  await screen.findByText(pl.analysis.title)
  const [url, init] = fetch.mock.calls[0]?.arguments ?? []
  const headers = new Headers(init?.headers)
  assert.equal(url, '/api/v1/checks')
  assert.equal(init?.method, 'POST')
  assert.deepEqual(JSON.parse(String(init?.body)), { channel: 'web', text })
  assert.equal(headers.get('X-Meritum-Session'), sessionStorage.getItem('meritum.session'))
  assert.match(headers.get('X-Meritum-Session') ?? '', uuid)
})

test('a full https link goes to the API as a url', async (t) => {
  const fetch = fakeApi(t)
  render(<CheckPage sender={apiCheckSender} />)
  typeAndCheck('https://example.com/artykul')
  await screen.findByText(pl.analysis.title)
  const body = String(fetch.mock.calls[0]?.arguments[1]?.body)
  assert.deepEqual(JSON.parse(body), { channel: 'web', url: 'https://example.com/artykul' })
})

test('blocked sessionStorage still sends a session id', async (t) => {
  const fetch = fakeApi(t)
  t.mock.method(Storage.prototype, 'getItem', () => {
    throw new DOMException('blocked', 'SecurityError')
  })
  render(<CheckPage sender={apiCheckSender} />)
  typeAndCheck('Od stycznia nie zapłacisz w sklepie gotówką')
  await screen.findByText(pl.analysis.title)
  const headers = new Headers(fetch.mock.calls[0]?.arguments[1]?.headers)
  assert.match(headers.get('X-Meritum-Session') ?? '', uuid)
})

test('the session id stays the same for every check in the tab', async (t) => {
  const fetch = fakeApi(t)
  render(<CheckPage sender={apiCheckSender} />)
  typeAndCheck('Pierwsze twierdzenie')
  await screen.findByText(pl.analysis.title)
  typeAndCheck('Drugie twierdzenie')
  await waitFor(() => assert.equal(fetch.mock.callCount(), 2))
  const sessions = fetch.mock.calls.map((call) =>
    new Headers(call.arguments[1]?.headers).get('X-Meritum-Session'),
  )
  assert.equal(sessions[0], sessions[1])
})

test('HTTP 429 shows the rate-limit message under the field, not a verdict', async (t) => {
  fakeApi(t, 429)
  render(<CheckPage sender={apiCheckSender} />)
  typeAndCheck('Od stycznia nie zapłacisz w sklepie gotówką')
  const alert = await screen.findByRole('alert')
  assert.equal(alert.textContent, pl.errors.rate_limited)
  const verdicts = Object.values(pl.verdict)
  assert.equal(
    verdicts.some((word) => screen.queryAllByText(word).length > 0),
    false,
  )
  assert.equal(screen.queryAllByText(pl.analysis.title).length, 0)
})

test('a failed connection shows the offline message', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.reject(new TypeError('Failed to fetch')))
  render(<CheckPage sender={apiCheckSender} />)
  typeAndCheck('Od stycznia nie zapłacisz w sklepie gotówką')
  assert.equal((await screen.findByRole('alert')).textContent, pl.errors.offline)
})
