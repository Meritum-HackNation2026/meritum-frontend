/**
 * The evaluation runs through the API client on a fake `fetch`: only runs, cases and
 * comparisons that validate reach the page, and nothing ever throws.
 *
 * @feature US-OBS-06, F-28
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { apiEval } from '@/api'

function fakeApi(t: TestContext, body: unknown, status = 200) {
  return t.mock.method(globalThis, 'fetch', () => Promise.resolve(Response.json(body, { status })))
}

const run = {
  id: 'run_02',
  status: 'done',
  dataset: 'golden',
  started_at: '2026-11-20T10:00:00Z',
  finished_at: '2026-11-20T10:35:00Z',
  metrics: { macro_f1: 0.71, made_up: 3, abstention: '0.9' },
}

test('runs keep known metrics with numbers and drop runs that do not validate', async (t) => {
  fakeApi(t, [run, { ...run, id: 'run_x', status: 'paused' }, { ...run, started_at: 'wczoraj' }])
  assert.deepEqual(await apiEval.runs(), [{ ...run, metrics: { macro_f1: 0.71 } }])
})

test('a 403 on the runs is no access, a network failure is null', async (t) => {
  fakeApi(t, {}, 403)
  assert.equal(await apiEval.runs(), 'no_access')
  t.mock.method(globalThis, 'fetch', () => Promise.reject(new TypeError('offline')))
  assert.equal(await apiEval.runs(), null)
})

test('a case with an unknown verdict counts as no verdict; one without an id is dropped', async (t) => {
  fakeApi(t, [{ case_id: 'g_1', verdict: 'pants' }, { verdict: 'false' }])
  assert.deepEqual(await apiEval.cases('run_02'), [{ case_id: 'g_1', verdict: null }])
})

test('a comparison keeps only metrics measured in both runs', async (t) => {
  fakeApi(t, {
    metrics: { macro_f1: { a: 0.68, b: 0.71 }, abstention: { a: 0.5 }, made_up: { a: 1, b: 2 } },
    changed_cases: [{ case_id: 'g_42', a: 'confirmed', b: 'false' }, 'nope'],
  })
  assert.deepEqual(await apiEval.compare('run_01', 'run_02'), {
    metrics: { macro_f1: { a: 0.68, b: 0.71 } },
    changed_cases: [{ case_id: 'g_42', a: 'confirmed', b: 'false' }],
  })
})

test('without a staff session a run is not sent and the session counts as ended', async (t) => {
  const fetch = fakeApi(t, { detail: 'Not signed in' }, 401)
  assert.equal(await apiEval.start('golden'), 'expired')
  const file = new File(['{}'], 'zestaw.json', { type: 'application/json' })
  assert.equal(await apiEval.upload(file), 'expired')
  const posts = fetch.mock.calls.filter((call) => call.arguments[1]?.method === 'POST')
  assert.equal(posts.length, 0)
})
