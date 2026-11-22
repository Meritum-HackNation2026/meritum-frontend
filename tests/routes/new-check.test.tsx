/**
 * The page of a new check at /sprawdz (frontend#123): title, lead, the field (not docked to the
 * bottom), the example claims as buttons, the AI notice and this tab's history in the rail. A
 * sent claim or a clicked example opens the address of its check. Behind a fake `fetch`.
 *
 * @feature US-SPR-01, US-SPR-09, US-BEZ-07, F-01, F-21
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

const askedLabel = /Czy prezydent może rządzić/
const done = examples['CheckResult.done'] as CheckResult

/** A progress stream that never reports, so only the API read drives the page. */
class SilentEventSource {
  close() {
    // nothing to stop: this stream never opened a connection
  }
}

/** POST /api/v1/checks accepts c_01, its read is still running, nobody is signed in. */
function fakeApi(t: TestContext) {
  const fetch = t.mock.method(globalThis, 'fetch', (input: unknown) => {
    const path = requestPath(input)
    if (path === '/api/v1/checks') {
      return Promise.resolve(Response.json({ check_id: 'c_01' }, { status: 202 }))
    }
    if (path === '/api/v1/auth/me') {
      return Promise.resolve(Response.json({ detail: 'Not signed in' }, { status: 401 }))
    }
    const running = { check_id: 'c_01', steps: [{ code: 'receive', status: 'active' }] }
    return Promise.resolve(Response.json(path.startsWith('/api/v1/checks/') ? running : []))
  })
  const original = globalThis.EventSource
  globalThis.EventSource = SilentEventSource as unknown as typeof EventSource
  t.after(() => {
    globalThis.EventSource = original
  })
  return fetch
}

async function openNewCheck() {
  const history = createMemoryHistory({ initialEntries: ['/sprawdz'] })
  const router = createRouter({ routeTree, history })
  render(<RouterProvider router={router} />)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
  return router
}

const posted = (fetch: ReturnType<typeof fakeApi>) =>
  fetch.mock.calls.filter((call) => requestPath(call.arguments[0]) === '/api/v1/checks')

test('/sprawdz has the title, the field, the examples, the AI notice and no sign-in button', async (t) => {
  fakeApi(t)
  await openNewCheck()
  const main = await screen.findByRole('main')
  assert.ok(within(main).getByRole('heading', { level: 1, name: pl.form.title }))
  assert.ok(within(main).getByText(pl.form.lead))
  const field = within(main).getByLabelText(pl.form.input_label)
  assert.equal(field.closest('.sticky'), null, 'the field is not docked to the bottom')
  assert.ok(within(main).getByText(pl.ai_notice.first_contact, { exact: false }))
  const buttons = within(main)
    .queryAllByRole('button')
    .map((button) => button.textContent)
  const claims = pl.conversation.examples.map((claim) => `„${claim}”`)
  assert.deepEqual(buttons, ['', '', pl.form.submit, ...claims])
})

test('the rail lists this tab’s checks and opens one on click', async (t) => {
  fakeApi(t)
  rememberQuestion(done.check_id, 'Czy prezydent może rządzić trzy kadencje?')
  saveCheck(done)
  const router = await openNewCheck()
  const rail = screen.getByRole('complementary')
  assert.ok(within(rail).getByRole('heading', { name: pl.history.title }))
  fireEvent.click(within(rail).getByRole('button', { name: askedLabel }))
  await waitFor(() => assert.equal(router.state.location.pathname, `/sprawdzenie/${done.check_id}`))
})

test('wysłanie twierdzenia otwiera jego stronę: „Sprawdź” goes to /sprawdzenie/<id>', async (t) => {
  const fetch = fakeApi(t)
  const router = await openNewCheck()
  const text = 'Od stycznia nie zapłacisz w sklepie gotówką'
  fireEvent.change(screen.getByLabelText(pl.form.input_label), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: pl.form.submit }))
  await waitFor(() => assert.equal(router.state.location.pathname, '/sprawdzenie/c_01'))
  assert.equal(posted(fetch).length, 1)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})

test('a clicked example is sent and opens the address of its check', async (t) => {
  const fetch = fakeApi(t)
  const router = await openNewCheck()
  const [claim = ''] = pl.conversation.examples
  fireEvent.click(screen.getByRole('button', { name: `„${claim}”` }))
  await waitFor(() => assert.equal(router.state.location.pathname, '/sprawdzenie/c_01'))
  assert.equal(posted(fetch).length, 1)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})
