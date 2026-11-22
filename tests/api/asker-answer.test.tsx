/**
 * The asker-answer adapter of `src/api` behind a fake `fetch`: the answer is read with this
 * tab's session, a 404 is `not_found` and any other failure, an unreachable API included, is
 * `failed`.
 *
 * @feature US-MOD-07, US-POW-02, F-39
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apiAskerAnswer } from '@/api'
import { requestPath, sentRequest } from '../fetch-request'

const body = {
  case_id: '#S-12',
  text: 'Tak, to prawda.',
  quotes: [{ source: { id: 's1', title: 'Ustawa', publisher: 'Sejm' }, fragment: 'tekst' }],
}
const path = '/api/v1/moderation/answers/%23S-12'

test('reads the answer with the session header and keeps text and cited sources', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', () => Promise.resolve(Response.json(body)))
  assert.deepEqual(await apiAskerAnswer.read('#S-12'), {
    answer: {
      text: 'Tak, to prawda.',
      citations: [{ fragment: 'tekst', source: 'Ustawa, Sejm' }],
    },
  })
  const request = sentRequest(fetch.mock.calls[0]?.arguments[0])
  assert.equal(requestPath(request).startsWith(path), true)
  assert.ok(request.headers.get('X-Meritum-Session'))
})

test('404 is not_found; other statuses and a network failure are failed', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.resolve(Response.json({}, { status: 404 })))
  assert.equal(await apiAskerAnswer.read('#S-12'), 'not_found')
  t.mock.method(globalThis, 'fetch', () => Promise.resolve(Response.json({}, { status: 500 })))
  assert.equal(await apiAskerAnswer.read('#S-12'), 'failed')
  t.mock.method(globalThis, 'fetch', () => Promise.reject(new TypeError('offline')))
  assert.equal(await apiAskerAnswer.read('#S-12'), 'failed')
})
