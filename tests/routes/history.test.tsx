/**
 * This tab's checks as the conversation thread (scenario „powrót do wyniku”) and
 * „Usuń moje sprawdzenia” (scenario „usunięcie sprawdzeń”), behind a fake `fetch`.
 *
 * @feature US-SPR-09, US-BEZ-05, F-01, F-20
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { rememberQuestion, saveCheck, savedChecks } from '@/checks'
import examples from '@/contracts/examples.json'
import type { CheckResult } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'
import { requestPath } from '../fetch-request'

const done = examples['CheckResult.done'] as CheckResult
// no session id: the adapter drops notifications addressed to another session
const notification = { ...examples.Notification, session_id: undefined }

const methodOf = (input: unknown, init?: RequestInit) =>
  input instanceof Request ? input.method : (init?.method ?? 'GET')

/** Answers every call: `deleteStatus` for the session delete, the inbox list otherwise. */
function fakeApi(t: TestContext, deleteStatus = 202) {
  return t.mock.method(globalThis, 'fetch', (input: unknown, init?: RequestInit) => {
    const path = requestPath(input)
    if (path.startsWith('/api/v1/sessions/')) {
      return Promise.resolve(new Response(JSON.stringify({ deleted: 2 }), { status: deleteStatus }))
    }
    const body = methodOf(input, init) === 'GET' ? [notification] : null
    return Promise.resolve(new Response(JSON.stringify(body)))
  })
}

function calls(fetch: ReturnType<typeof fakeApi>) {
  return fetch.mock.calls.map(
    ({ arguments: [input, init] }) => `${methodOf(input, init)} ${requestPath(input)}`,
  )
}

function renderAt(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  render(<RouterProvider router={router} />)
  return router
}

test('powrót do wyniku: a kept check shows its card in the thread without asking the API', async (t) => {
  const fetch = fakeApi(t)
  saveCheck(done)
  const router = renderAt('/')
  const thread = await screen.findByRole('list', { name: pl.conversation.label })
  assert.ok(within(thread).getByText(done.claims?.[0]?.claim ?? ''))
  assert.ok(within(thread).getByText(pl.verdict.false))
  assert.ok(!calls(fetch).some((call) => call.includes('/api/v1/checks')))
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})

async function confirmDelete(answer: string) {
  fireEvent.click(await screen.findByRole('button', { name: pl.form.delete_session }))
  const dialog = await screen.findByRole('alertdialog', { name: pl.form.delete_session_title })
  assert.ok(within(dialog).getByText(pl.form.delete_session_text))
  fireEvent.click(within(dialog).getByRole('button', { name: answer }))
}

test('usunięcie sprawdzeń: the API, sessionStorage and the inbox are emptied', async (t) => {
  const fetch = fakeApi(t)
  rememberQuestion(done.check_id, 'Czy prezydent może rządzić trzy kadencje?')
  saveCheck(done)
  const router = renderAt('/')
  await confirmDelete(pl.form.delete_session_yes)
  assert.ok(await screen.findByText(pl.channel_privacy.deleted))
  // the citizen's own questions go too, or they would come back as turns on reload
  assert.equal(sessionStorage.getItem('meritum.questions'), null)
  const session = sessionStorage.getItem('meritum.session')
  assert.ok(calls(fetch).includes(`DELETE /api/v1/sessions/${session}/checks`))
  assert.ok(calls(fetch).includes('DELETE /api/v1/notifications'))
  assert.deepEqual(savedChecks(), [])
  assert.ok(screen.getByText(pl.brand.taglines[0] ?? ''))
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})

test('„Anuluj” closes the dialog and deletes nothing', async (t) => {
  const fetch = fakeApi(t)
  saveCheck(done)
  const router = renderAt('/')
  await confirmDelete(pl.form.delete_session_cancel)
  await waitFor(() => assert.equal(screen.queryByRole('alertdialog'), null))
  assert.ok(!calls(fetch).some((call) => call.startsWith('DELETE')))
  assert.equal(savedChecks().length, 1)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})

test('a refused deletion says so and keeps the history to try again', async (t) => {
  const fetch = fakeApi(t, 503)
  saveCheck(done)
  const router = renderAt('/')
  await confirmDelete(pl.form.delete_session_yes)
  assert.ok(await screen.findByText(pl.extension.popup_delete_failed))
  assert.ok(!calls(fetch).includes('DELETE /api/v1/notifications'))
  assert.equal(savedChecks().length, 1)
  assert.ok(screen.getByRole('list', { name: pl.conversation.label }))
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})

test('deleting on a result address empties the thread there and says so', async (t) => {
  fakeApi(t)
  saveCheck(done)
  const router = renderAt('/sprawdzenie/c_01')
  await confirmDelete(pl.form.delete_session_yes)
  assert.ok(await screen.findByText(pl.channel_privacy.deleted))
  assert.equal(router.state.location.pathname, '/sprawdzenie/c_01')
  assert.equal(screen.queryByRole('list', { name: pl.conversation.label }), null)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})
