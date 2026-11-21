/**
 * The hand-off adapter of `src/api` („Przekaż moderatorom”, „Zgłoś błąd”) behind a fake `fetch`:
 * a case number only from an answer that saved the case.
 *
 * @feature US-MOD-03, US-MOD-06, F-24, ADR-22
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { apiHandoff } from '@/api'
import { requestPath, sentRequest } from '../fetch-request'

type Answer = { status: number; body?: unknown } | 'network down'

function fakeApi(t: TestContext, answer: Answer) {
  return t.mock.method(globalThis, 'fetch', () => {
    if (answer === 'network down') {
      return Promise.reject(new TypeError('Failed to fetch'))
    }
    return Promise.resolve(new Response(JSON.stringify(answer.body ?? null), answer))
  })
}

const saved = { escalation: { state: 'created', case_id: '#S-12' }, message_key: 'x' }
const joined = { escalation: { state: 'updated', case_id: '#S-12' }, message_key: 'x' }
const notSaved = { escalation: { state: 'recommended' }, message_key: 'escalation.recommended' }

test('escalate posts to the claim and returns the saved case number', async (t) => {
  const fetch = fakeApi(t, { status: 200, body: saved })
  assert.deepEqual(await apiHandoff.escalate('c_01', 2), { caseId: '#S-12' })
  const request = sentRequest(fetch.mock.calls[0]?.arguments[0])
  assert.equal(request.method, 'POST')
  assert.equal(requestPath(request), '/api/v1/checks/c_01/claims/2/escalate')
})

test('joining an existing case gives the same outcome as creating one', async (t) => {
  fakeApi(t, { status: 200, body: joined })
  assert.deepEqual(await apiHandoff.escalate('c_01', 0), { caseId: '#S-12' })
})

test('a 503 without a saved case gives no case number', async (t) => {
  fakeApi(t, { status: 503, body: notSaved })
  assert.equal(await apiHandoff.escalate('c_01', 0), 'busy')
})

test('an answer that claims success without a case number gives no case number', async (t) => {
  fakeApi(t, { status: 200, body: notSaved })
  assert.equal(await apiHandoff.escalate('c_01', 0), 'busy')
})

test('429 is the rate limit and a network failure is offline', async (t) => {
  fakeApi(t, { status: 429 })
  assert.equal(await apiHandoff.escalate('c_01', 0), 'rate_limited')
  t.mock.restoreAll()
  fakeApi(t, 'network down')
  assert.equal(await apiHandoff.dispute('c_01', 0, ''), 'offline')
})

test('dispute posts the justification to the claim and returns the case number', async (t) => {
  const fetch = fakeApi(t, { status: 200, body: saved })
  assert.deepEqual(await apiHandoff.dispute('c_01', 1, 'Zła data'), { caseId: '#S-12' })
  const request = sentRequest(fetch.mock.calls[0]?.arguments[0])
  assert.equal(requestPath(request), '/api/v1/checks/c_01/claims/1/dispute')
  assert.deepEqual(await request.json(), { justification: 'Zła data' })
})

test('a dispute without a justification sends none', async (t) => {
  const fetch = fakeApi(t, { status: 200, body: saved })
  await apiHandoff.dispute('c_01', 0, '   ')
  const request = sentRequest(fetch.mock.calls[0]?.arguments[0])
  assert.deepEqual(await request.json(), { justification: null })
})
