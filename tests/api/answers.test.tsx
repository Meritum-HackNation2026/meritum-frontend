/**
 * The moderator-answer adapter of `src/api` behind a fake `fetch`: the quotes go to the case's
 * answer endpoint, a 422 names every quote that is not verbatim, and the picker lists the
 * sources the case's checks cited.
 *
 * @feature US-MOD-07, F-39, ADR-06
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { apiAnswers } from '@/api'
import { requestPath, sentRequest } from '../fetch-request'

type Route = { status: number; body?: unknown }

function fakeApi(t: TestContext, routes: Record<string, Route>) {
  return t.mock.method(globalThis, 'fetch', (input: unknown) => {
    const answer = routes[requestPath(input)] ?? { status: 404 }
    return Promise.resolve(new Response(JSON.stringify(answer.body ?? null), answer))
  })
}

const csrf = { '/api/v1/auth/me': { status: 200, body: { csrf_token: 'tok' } } }
const draft = { text: 'Tak.', citations: [{ source_id: 's1', fragment: 'tekst' }] }
const answerPath = '/api/v1/moderation/cases/%23S-12/answer'
const source = { id: 's1', title: 'Ustawa', publisher: 'Sejm' }

test('send posts the text and quotes with the CSRF header and gives sent', async (t) => {
  const fetch = fakeApi(t, { ...csrf, [answerPath]: { status: 200, body: {} } })
  assert.equal(await apiAnswers.send('#S-12', draft), 'sent')
  const request = sentRequest(fetch.mock.calls[1]?.arguments[0])
  assert.equal(request.method, 'POST')
  assert.deepEqual(await request.json(), {
    text: 'Tak.',
    quotes: [{ source_id: 's1', fragment: 'tekst' }],
  })
})

test('a 422 names every quote that is not verbatim', async (t) => {
  fakeApi(t, {
    ...csrf,
    [answerPath]: { status: 422, body: { detail: { rejected_quotes: [0, 2] } } },
  })
  assert.deepEqual(await apiAnswers.send('#S-12', draft), { rejected: [0, 2] })
})

test('refusals read as an ended session, a taken role or a failure', async (t) => {
  fakeApi(t, { ...csrf, [answerPath]: { status: 401 } })
  assert.equal(await apiAnswers.send('#S-12', draft), 'expired')
  fakeApi(t, { ...csrf, [answerPath]: { status: 403 } })
  assert.equal(await apiAnswers.send('#S-12', draft), 'no_access')
  fakeApi(t, { ...csrf, [answerPath]: { status: 409 } })
  assert.equal(await apiAnswers.send('#S-12', draft), 'failed')
})

test('an unreachable API is a failure, never a throw', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.reject(new TypeError('Failed to fetch')))
  assert.equal(await apiAnswers.send('#S-12', draft), 'failed')
  assert.equal(await apiAnswers.sources(['c_01']), null)
})

test('sources lists each source the checks cited once', async (t) => {
  const result = (...ids: string[]) => ({
    status: 200,
    body: {
      steps: [],
      result: {
        claims: [{ citations: ids.map((id) => ({ source: { ...source, id }, fragment: 'x' })) }],
      },
    },
  })
  fakeApi(t, { '/api/v1/checks/c_01': result('s1', 's2'), '/api/v1/checks/c_02': result('s2') })
  const found = await apiAnswers.sources(['c_01', 'c_02'])
  assert.deepEqual(
    found?.map((s) => s.id),
    ['s1', 's2'],
  )
  assert.deepEqual(found?.[0], source)
})

const closePath = '/api/v1/moderation/cases/%23S-12/close'

test('close posts the reason with the CSRF header and gives closed', async (t) => {
  const fetch = fakeApi(t, { ...csrf, [closePath]: { status: 200, body: {} } })
  assert.equal(await apiAnswers.close('#S-12', 'sprawa testowa'), 'closed')
  const request = sentRequest(fetch.mock.calls[1]?.arguments[0])
  assert.equal(request.method, 'POST')
  assert.equal(request.headers.get('X-CSRF-Token'), 'tok')
  assert.deepEqual(await request.json(), { reason: 'sprawa testowa' })
})

test('a refused close reads as an ended session, a taken role or a failure', async (t) => {
  fakeApi(t, { ...csrf, [closePath]: { status: 401 } })
  assert.equal(await apiAnswers.close('#S-12', 'x'), 'expired')
  fakeApi(t, { ...csrf, [closePath]: { status: 403 } })
  assert.equal(await apiAnswers.close('#S-12', 'x'), 'no_access')
  fakeApi(t, { ...csrf, [closePath]: { status: 409 } })
  assert.equal(await apiAnswers.close('#S-12', 'x'), 'failed')
  t.mock.method(globalThis, 'fetch', () => Promise.reject(new TypeError('Failed to fetch')))
  assert.equal(await apiAnswers.close('#S-12', 'x'), 'failed')
})
