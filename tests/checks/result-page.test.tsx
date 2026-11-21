/**
 * The result page through the public API of `src/checks`, reading
 * GET /api/v1/checks/{id} through the `src/api` adapter behind a fake `fetch`.
 *
 * @feature US-SPR-01, US-SPR-04, US-BEZ-07, F-01, F-17, F-21
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { render, screen, waitFor } from '@testing-library/react'
import { apiResultReader } from '@/api'
import { type ProgressSource, ResultPage } from '@/checks'
import examples from '@/contracts/examples.json'
import type { AnalysisStatus, CheckResult } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { requestPath, sentRequest } from '../fetch-request'
import { fakeHandoff } from '../moderation/fake-handoff'

const { handoff } = fakeHandoff()

const done = examples['CheckResult.done'] as CheckResult
const running: AnalysisStatus = {
  check_id: 'c_01',
  steps: [
    { code: 'receive', status: 'done' },
    { code: 'search_corpus', status: 'active' },
  ],
}
const finished: AnalysisStatus = { ...running, result: done }

/** A progress stream that never reports, so only the API read drives the page. */
const idle: ProgressSource = { watch: () => () => undefined }

type Answer = AnalysisStatus | number | 'network down'

function fakeApi(t: TestContext, ...answers: Answer[]) {
  let call = 0
  return t.mock.method(globalThis, 'fetch', () => {
    const answer = answers[Math.min(call++, answers.length - 1)]
    if (answer === 'network down') {
      return Promise.reject(new TypeError('Failed to fetch'))
    }
    const status = typeof answer === 'number' ? answer : 200
    return Promise.resolve(new Response(JSON.stringify(answer), { status }))
  })
}

/** Waits until a page that only gets failures has stopped asking, so nothing outlives the test. */
async function stopped(fetch: { mock: { callCount(): number } }) {
  await waitFor(() => assert.equal(fetch.mock.callCount(), 5))
}

function renderPage(checkId = 'c_01', pollMs = 1) {
  render(
    <ResultPage
      handoff={handoff}
      checkId={checkId}
      reader={apiResultReader}
      progress={idle}
      pollMs={pollMs}
    />,
  )
}

test('the page reads GET /api/v1/checks/{id} and shows the result card', async (t) => {
  const fetch = fakeApi(t, finished)
  renderPage()
  assert.ok(await screen.findByText(pl.verdict.false))
  assert.equal(requestPath(sentRequest(fetch.mock.calls[0]?.arguments[0])), '/api/v1/checks/c_01')
})

test('the result is inside a polite aria-live region that exists before it arrives', async (t) => {
  fakeApi(t, running, finished)
  renderPage()
  const live = document.querySelector('[aria-live="polite"]')
  assert.ok(live)
  const badge = await screen.findByText(pl.verdict.false)
  assert.equal(live.contains(badge), true)
})

test('while the check runs the page shows its steps, then the card', async (t) => {
  const fetch = fakeApi(t, running, running, finished)
  renderPage()
  assert.ok(await screen.findByText(pl.analysis.steps.search_corpus))
  assert.ok(await screen.findByText(pl.verdict.confirmed))
  assert.equal(screen.queryByText(pl.analysis.steps.search_corpus), null)
  assert.equal(fetch.mock.callCount(), 3)
})

test('an unknown check id shows the technical failure line, not a verdict', async (t) => {
  const fetch = fakeApi(t, 404)
  renderPage('c_missing')
  assert.equal((await screen.findByRole('alert')).textContent, pl.status_hint.technical_failure)
  assert.equal(screen.queryByText(pl.verdict.false), null)
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.equal(fetch.mock.callCount(), 1)
})

test('a lost connection says so and the page keeps asking until the result comes', async (t) => {
  fakeApi(t, 'network down', finished)
  renderPage('c_01', 200)
  assert.equal((await screen.findByRole('alert')).textContent, pl.errors.offline)
  assert.ok(await screen.findByText(pl.verdict.false))
  assert.equal(screen.queryByRole('alert'), null)
})

test('a lost connection shows the offline message', async (t) => {
  const fetch = fakeApi(t, 'network down')
  renderPage()
  assert.equal((await screen.findByRole('alert')).textContent, pl.errors.offline)
  await stopped(fetch)
})

test('a server error shows the busy message', async (t) => {
  const fetch = fakeApi(t, 503)
  renderPage()
  assert.equal((await screen.findByRole('alert')).textContent, pl.errors.busy)
  await stopped(fetch)
})

test('the check id is encoded into the path', async (t) => {
  const fetch = fakeApi(t, finished)
  renderPage('a/b')
  await screen.findByText(pl.verdict.false)
  assert.equal(requestPath(sentRequest(fetch.mock.calls[0]?.arguments[0])), '/api/v1/checks/a%2Fb')
})

test('after five failed reads in a row the page stops asking', async (t) => {
  const fetch = fakeApi(t, 503)
  renderPage()
  await screen.findByRole('alert')
  await stopped(fetch)
  await new Promise((resolve) => setTimeout(resolve, 50))
  assert.equal(fetch.mock.callCount(), 5)
})

test('an answer whose result is not an object is treated as a busy API', async (t) => {
  const fetch = fakeApi(t, { ...running, result: 'oops' } as unknown as AnalysisStatus)
  renderPage()
  assert.equal((await screen.findByRole('alert')).textContent, pl.errors.busy)
  await stopped(fetch)
})

test('an answer without steps is treated as a busy API, as the contract needs one step', async (t) => {
  const fetch = fakeApi(t, { ...running, steps: [] } as unknown as AnalysisStatus)
  renderPage()
  assert.equal((await screen.findByRole('alert')).textContent, pl.errors.busy)
  await stopped(fetch)
})

test('a check that never finishes ends with the technical failure line after the last read', async (t) => {
  const fetch = fakeApi(t, running)
  render(
    <ResultPage
      handoff={handoff}
      checkId="c_01"
      reader={apiResultReader}
      progress={idle}
      pollMs={0}
      maxReads={3}
    />,
  )
  assert.equal((await screen.findByRole('alert')).textContent, pl.status_hint.technical_failure)
  assert.equal(fetch.mock.callCount(), 3)
  assert.equal(screen.queryByText(pl.analysis.title), null)
})

test('a result that arrives while nothing has focus takes the focus, so it is read next', async (t) => {
  fakeApi(t, running, finished)
  renderPage()
  const card = await screen.findByRole('region', { name: pl.result.label })
  await waitFor(() => assert.ok(card.parentElement?.contains(document.activeElement)))
})

test('a result does not take the focus from a field the user is in', async (t) => {
  fakeApi(t, running, finished)
  const field = document.body.appendChild(document.createElement('textarea'))
  t.after(() => field.remove())
  field.focus()
  renderPage()
  await screen.findByRole('region', { name: pl.result.label })
  assert.equal(document.activeElement, field)
})
