/**
 * The public summary of the last evaluation run through the API client, with a fake API
 * behind `fetch`: a valid summary comes back, anything else means "no finished run".
 *
 * @feature US-ZRD-12, F-29
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { apiLatestRunSource } from '@/api'

const summary = {
  finished_at: '2026-11-20T18:30:00Z',
  bundle_url: 'https://github.com/Meritum-HackNation2026/meritum-core/tree/main/evals',
  metrics: { macro_f1: 0.71, latency_median_s: 12.4 },
}

function fakeApi(t: TestContext, body: unknown, status = 200) {
  return t.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  )
}

test('a valid summary is read from GET /api/v1/eval/runs/latest', async (t) => {
  const fetch = fakeApi(t, summary)
  assert.deepEqual(await apiLatestRunSource.latestRun(), summary)
  assert.equal(fetch.mock.calls[0]?.arguments[0], '/api/v1/eval/runs/latest')
})

test('unknown metrics and non-numbers are dropped, never shown', async (t) => {
  fakeApi(t, { ...summary, metrics: { macro_f1: 0.71, made_up: 3, abstention: '0.9' } })
  assert.deepEqual((await apiLatestRunSource.latestRun())?.metrics, { macro_f1: 0.71 })
})

for (const [name, body, status] of [
  ['404 (no finished run yet)', { detail: 'not found' }, 404],
  ['a summary without a date', { ...summary, finished_at: 3 }, 200],
  ['a reproduction link that is not https', { ...summary, bundle_url: 'javascript:alert(1)' }, 200],
  ['a body that is not an object', 'nope', 200],
] as const) {
  test(`${name} means no finished run`, async (t) => {
    fakeApi(t, body, status)
    assert.equal(await apiLatestRunSource.latestRun(), null)
  })
}

test('a network failure means no finished run', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.reject(new TypeError('offline')))
  assert.equal(await apiLatestRunSource.latestRun(), null)
})
