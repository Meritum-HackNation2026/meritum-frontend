/**
 * A fake meritum-backend for the evaluation page tests: answers by method and path, plus the
 * runs and staff sessions the tests share.
 *
 * @feature US-OBS-06, F-28
 */
import assert from 'node:assert/strict'
import type { TestContext } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, waitFor } from '@testing-library/react'
import { routeTree } from '@/routeTree.gen'
import { requestPath } from '../fetch-request'

/**
 * A status and JSON body the fake API answers with.
 *
 * @feature US-OBS-06, F-28
 */
export type Answer = [number, unknown]

/**
 * Answers `METHOD /path` with a status and body; an unknown call gets an empty list.
 *
 * @param t - The test, which restores `fetch` afterwards.
 * @param routes - Answers by `METHOD /path`, or a function giving the answer at call time.
 * @returns The `fetch` mock.
 * @feature US-OBS-06, F-28
 */
export function fakeApi(t: TestContext, routes: Record<string, Answer | (() => Answer)>) {
  return t.mock.method(globalThis, 'fetch', (input: unknown, init?: RequestInit) => {
    const method = input instanceof Request ? input.method : (init?.method ?? 'GET')
    const answer = routes[`${method} ${requestPath(input)}`]
    const [status, body] = typeof answer === 'function' ? answer() : (answer ?? [200, []])
    return Promise.resolve(Response.json(body, { status }))
  })
}

/**
 * The calls the page made, as `METHOD /path?query`.
 *
 * @param fetch - The `fetch` mock from `fakeApi`.
 * @returns One entry per call, in order.
 * @feature US-OBS-06, F-28
 */
export function calls(fetch: ReturnType<typeof fakeApi>): string[] {
  return fetch.mock.calls.map(({ arguments: [input, init] }) => {
    const method = input instanceof Request ? input.method : (init?.method ?? 'GET')
    return `${method} ${requestPath(input)}`
  })
}

/**
 * Opens /panel/eval and waits until its loader is done.
 *
 * @returns The router.
 * @feature US-OBS-06, F-28
 */
export async function openEval() {
  const history = createMemoryHistory({ initialEntries: ['/panel/eval'] })
  const router = createRouter({ routeTree, history })
  render(<RouterProvider router={router} />)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
  return router
}

/**
 * An analyst with a staff account.
 *
 * @feature US-OBS-06, F-28
 */
export const analyst = { email: 'analityk@example.org', role: 'analyst', read_only: false }

/**
 * A jury session: no address, the analyst role, read only (backend#32).
 *
 * @feature US-OBS-06, F-28
 */
export const jury = { email: null, role: 'analyst', read_only: true }

/**
 * A finished run on the golden set, the earlier of two.
 *
 * @feature US-OBS-06, F-28
 */
export const older = {
  id: 'run_01',
  status: 'done',
  dataset: 'golden',
  started_at: '2026-11-19T10:00:00Z',
  finished_at: '2026-11-19T10:40:00Z',
  metrics: { macro_f1: 0.68, citation_coverage: 0.9, latency_median_s: 14.2 },
}

/**
 * A finished run on the golden set, the later of two.
 *
 * @feature US-OBS-06, F-28
 */
export const newer = {
  id: 'run_02',
  status: 'done',
  dataset: 'golden',
  started_at: '2026-11-20T10:00:00Z',
  finished_at: '2026-11-20T10:35:00Z',
  metrics: { macro_f1: 0.71, citation_coverage: 0.92, latency_median_s: 12.4 },
}

/**
 * A run still in the worker, without metrics.
 *
 * @feature US-OBS-06, F-28
 */
export const running = { ...newer, id: 'run_03', status: 'running', finished_at: null, metrics: {} }

/**
 * The comparison of `older` and `newer`.
 *
 * @feature US-OBS-06, F-28
 */
export const comparison = {
  metrics: { macro_f1: { a: 0.68, b: 0.71 }, latency_median_s: { a: 14.2, b: 12.4 } },
  changed_cases: [{ case_id: 'g_042', a: 'insufficient_evidence', b: 'confirmed' }],
}

/**
 * The call that lists the runs.
 *
 * @feature US-OBS-06, F-28
 */
export const runsRoute = 'GET /api/v1/eval/runs'
