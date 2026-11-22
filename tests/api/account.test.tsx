/**
 * The citizen account adapter against a fake API behind `fetch`.
 *
 * @feature US-SPR-10, US-BEZ-05, F-31
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { apiAccount } from '@/api'
import { requestPath, sentRequest } from '../fetch-request'

const me = {
  provider: 'google',
  subject: 's1',
  email: 'ola@example.com',
  email_verified: true,
  csrf_token: 'tok',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

function fakeApi(t: TestContext, answers: Record<string, Response>) {
  return t.mock.method(globalThis, 'fetch', (input: unknown) => {
    const request = sentRequest(input)
    const answer = answers[`${request.method} ${requestPath(input)}`]
    return Promise.resolve(answer ?? json({}, 404))
  })
}

test('the session is the signed-in account, or null without a session', async (t) => {
  fakeApi(t, { 'GET /api/v1/auth/me': json(me) })
  assert.deepEqual(await apiAccount.session(), { email: 'ola@example.com' })
  t.mock.restoreAll()
  fakeApi(t, { 'GET /api/v1/auth/me': json({}, 401) })
  assert.equal(await apiAccount.session(), null)
})

test('the history is the account checks with their masked questions', async (t) => {
  fakeApi(t, {
    'GET /api/v1/me/checks': json([
      {
        check_id: 'c1',
        channel: 'web',
        received_at: '2026-11-22T10:00:00Z',
        question_masked: 'Pytanie',
        status: 'done',
        verdicts: [],
      },
    ]),
  })
  assert.deepEqual(await apiAccount.history(), [
    { checkId: 'c1', at: '2026-11-22T10:00:00Z', question: 'Pytanie' },
  ])
})

test('the history is empty when the API is not reachable', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.reject(new TypeError('offline')))
  assert.deepEqual(await apiAccount.history(), [])
})

test('login goes through the provider address and comes back to the page', () => {
  assert.equal(apiAccount.loginUrl('microsoft', '/'), '/api/v1/auth/login/microsoft?return_to=%2F')
})

for (const [name, path, eraser] of [
  ['the history', '/api/v1/me/checks', apiAccount.historyEraser],
  ['the account', '/api/v1/me', apiAccount.accountEraser],
] as const) {
  test(`deleting ${name} sends the CSRF token and is true once accepted`, async (t) => {
    const calls = fakeApi(t, {
      'GET /api/v1/auth/me': json(me),
      [`DELETE ${path}`]: json({ deleted: 2 }, 202),
    })
    assert.equal(await eraser.erase(), true)
    const sent = sentRequest(calls.mock.calls.at(-1)?.arguments[0])
    assert.equal(sent.headers.get('X-CSRF-Token'), 'tok')
  })

  test(`deleting ${name} is false without a session or a reachable API`, async (t) => {
    fakeApi(t, { 'GET /api/v1/auth/me': json({}, 401) })
    assert.equal(await eraser.erase(), false)
    t.mock.restoreAll()
    t.mock.method(globalThis, 'fetch', () => Promise.reject(new TypeError('offline')))
    assert.equal(await eraser.erase(), false)
  })
}

test('signing out posts the logout with the CSRF token', async (t) => {
  const calls = fakeApi(t, {
    'GET /api/v1/auth/me': json(me),
    'POST /api/v1/auth/logout': json(null, 204),
  })
  assert.equal(await apiAccount.signOut(), true)
  assert.equal(
    sentRequest(calls.mock.calls.at(-1)?.arguments[0]).headers.get('X-CSRF-Token'),
    'tok',
  )
})
