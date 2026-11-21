/**
 * The result address /sprawdzenie/{id} reads that check from GET /api/v1/checks/{id} and
 * shows its card.
 *
 * @feature US-SPR-01, US-SPR-04, F-01, F-17
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import examples from '@/contracts/examples.json'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'

/** A progress stream that never reports, so only the API read drives the page. */
class SilentEventSource {
  closed = false

  close() {
    this.closed = true
  }
}

test('/sprawdzenie/c_01 shows the card of check c_01', async (t) => {
  const status = {
    check_id: 'c_01',
    steps: [{ code: 'receive', status: 'done' }],
    result: examples['CheckResult.done'],
  }
  // the layout also asks for notifications; those get an empty list
  const fetch = t.mock.method(globalThis, 'fetch', (url: string) =>
    Promise.resolve(new Response(JSON.stringify(url.startsWith('/api/v1/checks') ? status : []))),
  )
  const original = globalThis.EventSource
  globalThis.EventSource = SilentEventSource as unknown as typeof EventSource
  t.after(() => {
    globalThis.EventSource = original
  })
  const history = createMemoryHistory({ initialEntries: ['/sprawdzenie/c_01'] })
  const router = createRouter({ routeTree, history })
  render(<RouterProvider router={router} />)
  assert.ok(await screen.findByText(pl.verdict.false))
  const urls = fetch.mock.calls.map((call) => call.arguments[0])
  assert.ok(urls.includes('/api/v1/checks/c_01'))
  // the router finishes its own async work, so nothing outlives the test
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})

const running = { check_id: 'c_01', steps: [{ code: 'receive', status: 'active' }] }

test('an accepted check from the form opens /sprawdzenie/{id}', async (t) => {
  t.mock.method(globalThis, 'fetch', (url: string) =>
    Promise.resolve(
      url === '/api/v1/checks'
        ? new Response(JSON.stringify({ check_id: 'c_01' }), { status: 202 })
        : new Response(JSON.stringify(url.startsWith('/api/v1/checks/') ? running : []), {
            status: 200,
          }),
    ),
  )
  const original = globalThis.EventSource
  globalThis.EventSource = SilentEventSource as unknown as typeof EventSource
  t.after(() => {
    globalThis.EventSource = original
  })
  const history = createMemoryHistory({ initialEntries: ['/'] })
  const router = createRouter({ routeTree, history })
  render(<RouterProvider router={router} />)
  fireEvent.change(await screen.findByLabelText(pl.form.input_label), {
    target: { value: 'Od stycznia nie zapłacisz w sklepie gotówką' },
  })
  fireEvent.click(screen.getByRole('button', { name: pl.form.submit }))
  await waitFor(() => assert.equal(router.state.location.pathname, '/sprawdzenie/c_01'))
  assert.ok(await screen.findByText(pl.analysis.title))
  await waitFor(() => assert.equal(router.state.status, 'idle'))
})
