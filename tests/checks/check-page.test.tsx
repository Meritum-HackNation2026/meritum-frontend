/**
 * The check page through the public API of `src/checks`, with a fake API behind `fetch`.
 *
 * @feature US-SPR-01, US-BEZ-07, US-DST-01, F-01, F-21
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  apiAudioUploader,
  apiCheckSender,
  apiHandoff,
  apiImageUploader,
  apiProgressSource,
  apiResultReader,
  apiSessionEraser,
} from '@/api'
import { CheckPage, type ProgressSource } from '@/checks'
import { rememberQuestion } from '@/checks/_history'
import pl from '@/copy/pl.json'
import { requestPath, sentRequest } from '../fetch-request'
import { finishedCheck } from './finished-check'

const uuid = /^[0-9a-f-]{36}$/
const copiedTabs = /w kartach z niej otwartych/
const singleTabPromise = /tylko w tej karcie|zniknie/

function fakeApi(t: TestContext, status = 202) {
  return t.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify({ check_id: 'c_01' }), { status })),
  )
}

/** Renders the form and records the check ids it hands on after the API accepted them. */
function renderPage(progress: ProgressSource = apiProgressSource): string[] {
  const opened: string[] = []
  const onAccepted = opened.push.bind(opened)
  render(
    <CheckPage
      sender={apiCheckSender}
      uploader={apiAudioUploader}
      imageUploader={apiImageUploader}
      eraser={apiSessionEraser}
      reader={apiResultReader}
      progress={progress}
      handoff={apiHandoff}
      onAccepted={onAccepted}
      {...finishedCheck()}
    />,
  )
  return opened
}

function typeAndCheck(value: string) {
  fireEvent.change(screen.getByLabelText(pl.form.input_label), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: pl.form.submit }))
}

for (const [input, message] of [
  ['ab', pl.errors.empty],
  ['ftp://example.com', pl.errors.invalid_url],
  [`https://example.com/${'a'.repeat(2100)}`, pl.errors.url_too_long],
] as const) {
  test(`"${input.slice(0, 30)}" shows a Polish message under the field and sends nothing`, (t) => {
    const fetch = fakeApi(t)
    renderPage()
    typeAndCheck(input)
    assert.equal(screen.getByRole('alert').textContent, message)
    assert.equal(fetch.mock.callCount(), 0)
  })
}

test('the message stays until the text changes', (t) => {
  fakeApi(t)
  renderPage()
  typeAndCheck('ab')
  fireEvent.click(screen.getByRole('button', { name: pl.form.submit }))
  assert.equal(screen.queryAllByRole('alert').length, 1)
  fireEvent.change(screen.getByLabelText(pl.form.input_label), { target: { value: 'abc' } })
  assert.equal(screen.queryAllByRole('alert').length, 0)
})

test('1200 characters go to POST /api/v1/checks as a web CheckRequest with the session id', async (t) => {
  const fetch = fakeApi(t)
  const text = 'Od stycznia nie zapłacisz w sklepie gotówką. '.repeat(30).slice(0, 1200)
  const opened = renderPage()
  typeAndCheck(text)
  await waitFor(() => assert.deepEqual(opened, ['c_01']))
  const request = sentRequest(fetch.mock.calls[0]?.arguments[0])
  const headers = request.headers
  assert.equal(requestPath(request), '/api/v1/checks')
  assert.equal(request.method, 'POST')
  assert.deepEqual(await request.json(), { channel: 'web', text })
  assert.equal(headers.get('X-Meritum-Session'), sessionStorage.getItem('meritum.session'))
  assert.match(headers.get('X-Meritum-Session') ?? '', uuid)
})

test('a full https link goes to the API as a url', async (t) => {
  const fetch = fakeApi(t)
  const opened = renderPage()
  typeAndCheck('https://example.com/artykul')
  await waitFor(() => assert.deepEqual(opened, ['c_01']))
  const body: unknown = await sentRequest(fetch.mock.calls[0]?.arguments[0]).json()
  assert.deepEqual(body, { channel: 'web', url: 'https://example.com/artykul' })
})

test('blocked sessionStorage still sends a session id', async (t) => {
  const fetch = fakeApi(t)
  t.mock.method(Storage.prototype, 'getItem', () => {
    throw new DOMException('blocked', 'SecurityError')
  })
  const opened = renderPage()
  typeAndCheck('Od stycznia nie zapłacisz w sklepie gotówką')
  await waitFor(() => assert.deepEqual(opened, ['c_01']))
  const { headers } = sentRequest(fetch.mock.calls[0]?.arguments[0])
  assert.match(headers.get('X-Meritum-Session') ?? '', uuid)
})

test('the session id stays the same for every check in the tab', async (t) => {
  const fetch = fakeApi(t)
  const opened = renderPage()
  typeAndCheck('Pierwsze twierdzenie')
  await waitFor(() => assert.deepEqual(opened, ['c_01']))
  typeAndCheck('Drugie twierdzenie')
  await waitFor(() => assert.equal(fetch.mock.callCount(), 2))
  const sessions = fetch.mock.calls.map((call) =>
    sentRequest(call.arguments[0]).headers.get('X-Meritum-Session'),
  )
  assert.equal(sessions[0], sessions[1])
})

test('HTTP 429 shows the rate-limit message under the field, not a verdict', async (t) => {
  fakeApi(t, 429)
  const opened = renderPage()
  typeAndCheck('Od stycznia nie zapłacisz w sklepie gotówką')
  const alert = await screen.findByRole('alert')
  assert.equal(alert.textContent, pl.errors.rate_limited)
  const verdicts = Object.values(pl.verdict)
  assert.equal(
    verdicts.some((word) => screen.queryAllByText(word).length > 0),
    false,
  )
  assert.deepEqual(opened, [])
})

test('a failed connection shows the offline message', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.reject(new TypeError('Failed to fetch')))
  renderPage()
  typeAndCheck('Od stycznia nie zapłacisz w sklepie gotówką')
  assert.equal((await screen.findByRole('alert')).textContent, pl.errors.offline)
})

test('the note under the history says it also shows in tabs opened from this one', () => {
  // The browser copies sessionStorage into tabs opened from the page (frontend#69).
  renderPage()
  const note = screen.getByText(pl.history.session_note).textContent ?? ''
  assert.match(note, copiedTabs)
  assert.doesNotMatch(note, singleTabPromise)
})

const placeholder = () => screen.getByLabelText(pl.form.input_label).getAttribute('placeholder')

test('the field under an ended check asks for the next claim', (t) => {
  fakeApi(t)
  renderPage()
  assert.equal(placeholder(), pl.conversation.next_placeholder)
})

test('the question of the check is the page’s only h1, in quotes', (t) => {
  fakeApi(t)
  rememberQuestion('c_03', 'Pytanie')
  renderPage({ watch: () => () => undefined })
  const headings = screen.getAllByRole('heading', { level: 1 })
  assert.deepEqual(
    headings.map((h) => h.textContent),
    ['„Pytanie”'],
  )
})

test('a check opened by link without its question is titled „Wynik sprawdzenia”', (t) => {
  fakeApi(t)
  renderPage()
  assert.equal(screen.getByRole('heading', { level: 1 }).textContent, pl.result.page_title)
})
