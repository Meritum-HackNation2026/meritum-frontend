/**
 * The home and result pages as one conversation (meritum-frontend#67): the citizen's question
 * and Meritum's answer in one thread, this tab's checks as earlier turns, and a welcome with
 * example claims on an empty tab. Behind a fake `fetch` and a silent progress stream.
 *
 * @feature US-SPR-01, US-SPR-09, F-01
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { rememberQuestion, saveCheck } from '@/checks'
import examples from '@/contracts/examples.json'
import type { CheckResult } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'
import { requestPath } from '../fetch-request'

const done = examples['CheckResult.done'] as CheckResult
const abstain = examples['CheckResult.abstain'] as CheckResult
const running = { check_id: 'c_01', steps: [{ code: 'receive', status: 'active' }] }

/** A progress stream that never reports, so only the API read drives the page. */
class SilentEventSource {
  close() {
    return undefined
  }
}

/** POST /api/v1/checks accepts c_01, its read is still running, the inbox is empty. */
function fakeApi(t: TestContext) {
  const fetch = t.mock.method(globalThis, 'fetch', (input: unknown) => {
    const path = requestPath(input)
    if (path === '/api/v1/audio') {
      return Promise.resolve(new Response(JSON.stringify({ audio_id: 'a_01' }), { status: 201 }))
    }
    if (path === '/api/v1/checks') {
      return Promise.resolve(new Response(JSON.stringify({ check_id: 'c_01' }), { status: 202 }))
    }
    const answer = path.startsWith('/api/v1/checks/') ? running : []
    return Promise.resolve(new Response(JSON.stringify(answer)))
  })
  const original = globalThis.EventSource
  globalThis.EventSource = SilentEventSource as unknown as typeof EventSource
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

const thread = () => screen.findByRole('list', { name: pl.conversation.label })
/** The thread's own turns; the analysis steps inside a turn are a list too. */
const turnsOf = (list: HTMLElement) => Array.from(list.children) as HTMLElement[]

test('puste wejście: a welcome, the example claims to click and the message field', async (t) => {
  fakeApi(t)
  const router = renderAt('/')
  assert.ok(await screen.findByText(pl.brand.taglines[0] ?? ''))
  for (const claim of pl.conversation.examples) {
    assert.ok(screen.getByRole('button', { name: `„${claim}”` }))
  }
  assert.ok(screen.getByLabelText(pl.form.input_label))
  assert.equal(screen.queryByRole('list', { name: pl.conversation.label }), null)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})

test('a clicked example is sent as the question and the steps follow it in the thread', async (t) => {
  const fetch = fakeApi(t)
  const router = renderAt('/')
  const [claim = ''] = pl.conversation.examples
  fireEvent.click(await screen.findByRole('button', { name: `„${claim}”` }))
  await waitFor(() => assert.equal(router.state.location.pathname, '/sprawdzenie/c_01'))
  const [turn] = turnsOf(await thread()) as [HTMLElement]
  assert.ok(within(turn).getByText(claim))
  assert.ok(await within(turn).findByText(pl.analysis.title))
  const posted = fetch.mock.calls.find(
    (call) => requestPath(call.arguments[0]) === '/api/v1/checks',
  )
  assert.ok(posted)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})

test('sprawdzenie wygląda jak rozmowa: the sent text stands above Meritum’s steps', async (t) => {
  fakeApi(t)
  const router = renderAt('/')
  const text = 'Od stycznia nie zapłacisz w sklepie gotówką'
  fireEvent.change(await screen.findByLabelText(pl.form.input_label), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: pl.form.submit }))
  await waitFor(() => assert.equal(router.state.location.pathname, '/sprawdzenie/c_01'))
  const [turn] = turnsOf(await thread()) as [HTMLElement]
  const question = within(turn).getByText(text)
  const steps = await within(turn).findByText(pl.analysis.title)
  const isAbove = Boolean(
    question.compareDocumentPosition(steps) & Node.DOCUMENT_POSITION_FOLLOWING,
  )
  assert.equal(isAbove, true)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})

test('historia sesji to wątek: two checks are two question–answer turns, oldest first', async (t) => {
  fakeApi(t)
  rememberQuestion(done.check_id, 'Czy prezydent może rządzić trzy kadencje?')
  saveCheck(done)
  rememberQuestion(abstain.check_id, 'Drugie pytanie')
  saveCheck(abstain)
  const router = renderAt('/')
  const turns = turnsOf(await thread())
  assert.equal(turns.length, 2)
  const [first, second] = turns as [HTMLElement, HTMLElement]
  assert.ok(within(first).getByText('Czy prezydent może rządzić trzy kadencje?'))
  assert.ok(within(first).getByText(done.claims?.[0]?.claim ?? ''))
  assert.ok(within(second).getByText('Drugie pytanie'))
  assert.equal(screen.queryByRole('list', { name: pl.history.title }), null)
  assert.equal(screen.queryByText(pl.brand.taglines[0] ?? ''), null)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})

test('a result address shows the earlier turns of this tab above its own check', async (t) => {
  fakeApi(t)
  saveCheck(abstain)
  const router = renderAt('/sprawdzenie/c_01')
  const turns = turnsOf(await thread())
  assert.equal(turns.length, 2)
  assert.ok(within(turns[0] as HTMLElement).getByText(abstain.claims?.[0]?.claim ?? ''))
  assert.ok(await within(turns[1] as HTMLElement).findByText(pl.analysis.title))
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
      const picker = screen.getByLabelText(pl.conversation.attach_audio)
      fireEvent.change(picker, { target: { files: [file] } })
      fireEvent.click(screen.getByRole('button', { name: pl.form.submit }))
    },
    'Nagranie: wywiad.mp3',
  ],
] as const) {
  test(`${kind} stands in the thread as the question above Meritum’s steps`, async (t) => {
    fakeApi(t)
    const router = renderAt('/')
    await screen.findByLabelText(pl.form.input_label)
    send()
    await waitFor(() => assert.equal(router.state.location.pathname, '/sprawdzenie/c_01'))
    const [turn] = turnsOf(await thread()) as [HTMLElement]
    const shown = within(turn).getByText(question)
    const steps = await within(turn).findByText(pl.analysis.title)
    assert.ok(shown.compareDocumentPosition(steps) & Node.DOCUMENT_POSITION_FOLLOWING)
    await waitFor(() => assert.equal(router.state.status, 'idle'))
  })
}
