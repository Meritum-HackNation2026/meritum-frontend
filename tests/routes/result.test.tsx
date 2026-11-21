/**
 * The result address /sprawdzenie/{id} reads that check from GET /api/v1/checks/{id} and
 * shows its card.
 *
 * @feature US-SPR-01, US-SPR-04, F-01, F-17
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import examples from '@/contracts/examples.json'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'

test('/sprawdzenie/c_01 shows the card of check c_01', async (t) => {
  const status = { check_id: 'c_01', steps: [], result: examples['CheckResult.done'] }
  const fetch = t.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify(status))),
  )
  const history = createMemoryHistory({ initialEntries: ['/sprawdzenie/c_01'] })
  render(<RouterProvider router={createRouter({ routeTree, history })} />)
  assert.ok(await screen.findByText(pl.verdict.false))
  assert.equal(fetch.mock.calls[0]?.arguments[0], '/api/v1/checks/c_01')
})
