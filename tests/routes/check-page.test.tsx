/**
 * One check is one page at /sprawdzenie/{id} (meritum-frontend#126): the question as the h1
 * quote, the progress bar while the check runs, the result as a list of claims with the field
 * „Sprawdź kolejną informację” under it, and this tab's earlier checks in the rail. Behind a
 * fake `fetch` and a fake progress stream.
 *
 * @feature US-SPR-01, US-SPR-02, US-SPR-04, US-SPR-09, F-01, F-09, F-17, F-20
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { rememberQuestion, saveCheck } from '@/checks'
import examples from '@/contracts/examples.json'
import type { CheckResult } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'
import { requestPath } from '../fetch-request'

const done = examples['CheckResult.done'] as CheckResult
const abstain = examples['CheckResult.abstain'] as CheckResult
const threeClaims: CheckResult = {
  ...done,
  check_id: 'c_09',
  claims: [...(done.claims ?? []), ...(abstain.claims ?? [])],
}
const running = { check_id: 'c_01', steps: [{ code: 'receive', status: 'active' }] }

/** A progress stream the test drives: `emit` sends one status to the page. */
class FakeEventSource {
  static last: FakeEventSource | undefined
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  constructor() {
    FakeEventSource.last = this
  }
  emit(status: unknown) {
    this.onmessage?.({ data: JSON.stringify(status) })
  }
  close() {
    // nothing to stop: this stream never opened a connection
  }
}

/** POST /api/v1/checks accepts `accepted`, its read is still running, the inbox is empty. */
function fakeApi(t: TestContext, accepted = 'c_01') {
  const fetch = t.mock.method(globalThis, 'fetch', (input: unknown) => {
    const path = requestPath(input)
    if (path === '/api/v1/audio') {
      return Promise.resolve(new Response(JSON.stringify({ audio_id: 'a_01' }), { status: 201 }))
    }
    if (path === '/api/v1/checks') {
      return Promise.resolve(new Response(JSON.stringify({ check_id: accepted }), { status: 202 }))
    }
    const answer = path.startsWith('/api/v1/checks/') ? running : []
    return Promise.resolve(new Response(JSON.stringify(answer)))
  })
  const original = globalThis.EventSource
  globalThis.EventSource = FakeEventSource as unknown as typeof EventSource
  t.after(() => {
    globalThis.EventSource = original
  })
  return fetch
}

function renderAt(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  render(<RouterProvider router={router} />)
  return router
}

const firstQuestion = /Pierwsze pytanie/
const runningQuestion = /Sprawdzenie, które trwa/
const heading = () => screen.findByRole('heading', { level: 1 })
const rail = () => screen.getByRole('complementary')
const nextField = () => screen.queryByRole('region', { name: pl.check_page.next })

test('sprawdzenie w toku: a progress bar with the step counter under the quote, no field', async (t) => {
  fakeApi(t)
  rememberQuestion('c_01', 'Od stycznia nie zapłacisz w sklepie gotówką')
  const router = renderAt('/sprawdzenie/c_01')
  const h1 = await heading()
  assert.ok(h1.textContent?.includes('Od stycznia nie zapłacisz w sklepie gotówką'))
  await waitFor(() => assert.ok(FakeEventSource.last))
  act(() =>
    FakeEventSource.last?.emit({
      check_id: 'c_01',
      steps: [
        { code: 'receive', status: 'done' },
        { code: 'extract_claims', status: 'active' },
        { code: 'write_answer', status: 'pending' },
      ],
    }),
  )
  const bar = await screen.findByRole('progressbar')
  assert.ok(await screen.findByText(pl.analysis.step_of.replace('{n}', '2').replace('{of}', '3')))
  assert.ok(h1.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING)
  assert.equal(screen.queryByLabelText(pl.form.input_label), null)
  assert.equal(nextField(), null)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})

test('gotowy wynik: the summary, three open claim rows and the next-check field under them', async (t) => {
  fakeApi(t)
  rememberQuestion(threeClaims.check_id, 'Trzy twierdzenia naraz')
  saveCheck(threeClaims)
  const router = renderAt(`/sprawdzenie/${threeClaims.check_id}`)
  assert.ok((await heading()).textContent?.includes('Trzy twierdzenia naraz'))
  const result = screen.getByRole('region', { name: pl.result.label })
  assert.ok(within(result).getByRole('heading', { name: new RegExp(pl.result.claims_title) }))
  const rows = within(result).getAllByRole('button', { expanded: true })
  assert.equal(rows.length, 3)
  for (const claim of threeClaims.claims ?? []) {
    assert.ok(within(result).getByText(claim.explanation))
  }
  const field = nextField()
  assert.ok(field)
  assert.ok(within(field).getByLabelText(pl.form.input_label))
  assert.ok(result.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})

test('kolejne sprawdzenie ma własną stronę: the next claim opens its page, the previous one is in the rail', async (t) => {
  fakeApi(t, 'c_10')
  rememberQuestion(done.check_id, 'Pierwsze pytanie')
  saveCheck(done)
  const router = renderAt(`/sprawdzenie/${done.check_id}`)
  await heading()
  const field = nextField()
  assert.ok(field)
  const text = 'Drugie twierdzenie do sprawdzenia'
  fireEvent.change(within(field).getByLabelText(pl.form.input_label), { target: { value: text } })
  fireEvent.click(within(field).getByRole('button', { name: pl.form.submit }))
  await waitFor(() => assert.equal(router.state.location.pathname, '/sprawdzenie/c_10'))
  await waitFor(async () => assert.match((await heading()).textContent ?? '', new RegExp(text)))
  assert.ok(within(rail()).getByRole('button', { name: firstQuestion }))
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})

test('the rail has „Nowe sprawdzenie” to /sprawdz and names a running check in a word', async (t) => {
  fakeApi(t)
  rememberQuestion('c_01', 'Sprawdzenie, które trwa')
  const router = renderAt('/sprawdzenie/c_01')
  await heading()
  const history = within(rail())
  const running = history.getByRole('button', { name: runningQuestion })
  assert.ok(within(running).getByText(pl.analysis.step_status.active))
  fireEvent.click(history.getByRole('button', { name: pl.check_page.new }))
  await waitFor(() => assert.equal(router.state.location.pathname, '/sprawdz'))
})

test('a clicked example on /sprawdz opens the check’s page with the claim as the heading', async (t) => {
  const fetch = fakeApi(t)
  const router = renderAt('/sprawdz')
  const [claim = ''] = pl.conversation.examples
  fireEvent.click(await screen.findByRole('button', { name: `„${claim}”` }))
  await waitFor(() => assert.equal(router.state.location.pathname, '/sprawdzenie/c_01'))
  await waitFor(async () => assert.match((await heading()).textContent ?? '', new RegExp(claim)))
  assert.ok(await screen.findByText(pl.analysis.title))
  assert.ok(fetch.mock.calls.some((call) => requestPath(call.arguments[0]) === '/api/v1/checks'))
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})

test('a result opened by link without a known question is titled „Wynik sprawdzenia”', async (t) => {
  fakeApi(t)
  saveCheck(abstain)
  const router = renderAt(`/sprawdzenie/${abstain.check_id}`)
  assert.equal((await heading()).textContent, pl.result.page_title)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})

for (const [kind, send, question] of [
  [
    'a pasted link',
    () => {
      const field = screen.getByLabelText(pl.form.input_label)
      fireEvent.change(field, { target: { value: 'https://example.com/artykul' } })
      fireEvent.click(screen.getByRole('button', { name: pl.form.submit }))
    },
    'https://example.com/artykul',
  ],
  [
    'a recording',
    () => {
      const file = new File(['ID3'], 'wywiad.mp3', { type: 'audio/mpeg' })
      fireEvent.click(screen.getByRole('button', { name: pl.conversation.attach_audio }))
      const picker = document.querySelector('input[type="file"]') as HTMLInputElement
      fireEvent.change(picker, { target: { files: [file] } })
      fireEvent.click(screen.getByRole('button', { name: pl.form.submit }))
    },
    'Nagranie: wywiad.mp3',
  ],
] as const) {
  test(`${kind} is the heading of its page above the progress`, async (t) => {
    fakeApi(t)
    const router = renderAt('/sprawdz')
    await screen.findByLabelText(pl.form.input_label)
    send()
    await waitFor(() => assert.equal(router.state.location.pathname, '/sprawdzenie/c_01'))
    await waitFor(async () => assert.ok((await heading()).textContent?.includes(question)))
    const steps = await screen.findByText(pl.analysis.title)
    assert.ok((await heading()).compareDocumentPosition(steps) & Node.DOCUMENT_POSITION_FOLLOWING)
    await waitFor(() => assert.equal(router.state.status, 'idle'))
  })
}
