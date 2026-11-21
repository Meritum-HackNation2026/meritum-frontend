/**
 * The administration page at /panel/administracja on a fake API: staff accounts and the
 * high-risk topics, for administrators only (backend#22).
 *
 * @feature US-MOD-05, F-25, F-20
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'
import { requestPath } from '../fetch-request'

const admin = { email: 'admin@example.org', role: 'admin' }
const analyst = { email: 'analityk@example.org', role: 'analyst' }
const origin = 'http://localhost'
const transport = { name: 'transport', keywords: ['diesel', 'strefa czystego transportu'] }

type Sent = { method: string; path: string; csrf: string | null; body: unknown }

/** A stateful fake of the staff API: lists, grants, revokes, topics; records each write. */
function fakeApi(t: TestContext, me: object = admin) {
  let accounts: object[] = [analyst]
  let topics: object[] = [transport]
  const sent: Sent[] = []
  const created = (body: unknown) => Response.json(body, { status: 201 })
  const answers: Record<string, (body: unknown) => Response> = {
    'GET /api/v1/staff/me': () => Response.json(me),
    'GET /api/v1/auth/me': () => Response.json({ csrf_token: 'tok_1' }),
    'GET /api/v1/staff': () => Response.json(accounts),
    'GET /api/v1/moderation/topics': () => Response.json(topics),
    'POST /api/v1/staff': (body) => {
      accounts = [...accounts, body as object]
      return created(body)
    },
    'POST /api/v1/moderation/topics': (body) => {
      topics = [...topics, body as object]
      return created(body)
    },
  }
  const fetch = t.mock.method(globalThis, 'fetch', async (input: unknown) => {
    const request = input instanceof Request ? input : new Request(new URL(String(input), origin))
    const path = decodeURIComponent(requestPath(input))
    const body = request.method === 'POST' ? await request.json() : null
    if (request.method !== 'GET') {
      const csrf = request.headers.get('X-CSRF-Token')
      sent.push({ method: request.method, path, csrf, body })
    }
    const answer = answers[`${request.method} ${path}`]
    if (answer) return answer(body)
    return request.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json([])
  })
  const reads = () => fetch.mock.calls.map((call) => requestPath(call.arguments[0]))
  return { sent, reads }
}

async function open(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] })
  const router = createRouter({ routeTree, history })
  render(<RouterProvider router={router} />)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
  return router
}

const accounts = () => screen.findByRole('region', { name: pl.staff.admin.accounts.title })
const topicsRegion = () => screen.findByRole('region', { name: pl.staff.admin.topics.title })

test('an administrator sees the administration link, the accounts and the topics', async (t) => {
  fakeApi(t)
  await open('/panel')
  const nav = await screen.findByRole('navigation')
  fireEvent.click(within(nav).getByRole('link', { name: pl.staff.admin.title }))
  assert.ok(within(await accounts()).getByText(analyst.email))
  const topics = await topicsRegion()
  assert.ok(within(topics).getByText(transport.name))
  assert.ok(within(topics).getByText('diesel, strefa czystego transportu'))
})

test('a new moderator account is saved with the CSRF token and shows on the list', async (t) => {
  const { sent } = fakeApi(t)
  await open('/panel/administracja')
  const region = await accounts()
  fireEvent.change(within(region).getByLabelText(pl.staff.admin.accounts.email), {
    target: { value: 'nowy@example.org' },
  })
  fireEvent.change(within(region).getByLabelText(pl.staff.admin.accounts.role), {
    target: { value: 'moderator' },
  })
  fireEvent.click(within(region).getByRole('button', { name: pl.staff.admin.accounts.add }))
  assert.ok(await within(region).findByText('Dodano konto nowy@example.org z rolą moderator.'))
  assert.ok(within(region).getByRole('cell', { name: 'nowy@example.org' }))
  assert.deepEqual(sent, [
    {
      method: 'POST',
      path: '/api/v1/staff',
      csrf: 'tok_1',
      body: { email: 'nowy@example.org', role: 'moderator' },
    },
  ])
})

test('an address without a domain is refused before anything is sent', async (t) => {
  const { sent } = fakeApi(t)
  await open('/panel/administracja')
  const region = await accounts()
  fireEvent.change(within(region).getByLabelText(pl.staff.admin.accounts.email), {
    target: { value: 'nowy@' },
  })
  fireEvent.click(within(region).getByRole('button', { name: pl.staff.admin.accounts.add }))
  assert.ok(await within(region).findByText(pl.staff.admin.accounts.invalid_email))
  assert.deepEqual(sent, [])
})

test('an address already on the list is not added twice', async (t) => {
  const { sent } = fakeApi(t)
  await open('/panel/administracja')
  const region = await accounts()
  fireEvent.change(within(region).getByLabelText(pl.staff.admin.accounts.email), {
    target: { value: analyst.email },
  })
  fireEvent.click(within(region).getByRole('button', { name: pl.staff.admin.accounts.add }))
  assert.ok(await within(region).findByText(pl.staff.admin.accounts.duplicate))
  assert.deepEqual(sent, [])
})

test('taking access away asks first, then removes the account', async (t) => {
  const { sent } = fakeApi(t)
  await open('/panel/administracja')
  const region = await accounts()
  fireEvent.click(within(region).getByRole('button', { name: pl.staff.admin.accounts.remove }))
  const dialog = await screen.findByRole('alertdialog')
  assert.ok(within(dialog).getByText(`Odebrać dostęp do panelu osobie ${analyst.email}?`))
  fireEvent.click(within(dialog).getByRole('button', { name: pl.staff.admin.accounts.remove }))
  assert.ok(await within(region).findByText(`Odebrano dostęp osobie ${analyst.email}.`))
  assert.ok(within(region).getByText(pl.staff.admin.accounts.empty))
  assert.deepEqual(sent, [
    { method: 'DELETE', path: `/api/v1/staff/${analyst.email}`, csrf: 'tok_1', body: null },
  ])
})

test('a new topic "wybory" with keywords is saved and shows on the list', async (t) => {
  const { sent } = fakeApi(t)
  await open('/panel/administracja')
  const region = await topicsRegion()
  fireEvent.change(within(region).getByLabelText(pl.staff.admin.topics.name), {
    target: { value: 'wybory' },
  })
  fireEvent.change(within(region).getByLabelText(pl.staff.admin.topics.keywords), {
    target: { value: 'wybory, głosowanie,, komisja wyborcza ' },
  })
  fireEvent.click(within(region).getByRole('button', { name: pl.staff.admin.topics.add }))
  assert.ok(await within(region).findByText('Dodano temat „wybory”.'))
  assert.ok(within(region).getByRole('cell', { name: 'wybory' }))
  assert.deepEqual(sent, [
    {
      method: 'POST',
      path: '/api/v1/moderation/topics',
      csrf: 'tok_1',
      body: { name: 'wybory', keywords: ['wybory', 'głosowanie', 'komisja wyborcza'] },
    },
  ])
})

test('removing a topic deletes it on the API and empties the list', async (t) => {
  const { sent } = fakeApi(t)
  await open('/panel/administracja')
  const region = await topicsRegion()
  fireEvent.click(within(region).getByRole('button', { name: pl.staff.admin.topics.remove }))
  assert.ok(await within(region).findByText('Usunięto temat „transport”.'))
  assert.ok(within(region).getByText(pl.staff.admin.topics.empty))
  assert.deepEqual(sent, [
    { method: 'DELETE', path: '/api/v1/moderation/topics/transport', csrf: 'tok_1', body: null },
  ])
})

test('a moderator sees no administration link and never gets the accounts', async (t) => {
  const { reads } = fakeApi(t, { email: 'moderator@example.org', role: 'moderator' })
  const router = await open('/panel/administracja')
  const nav = await screen.findByRole('navigation')
  assert.equal(within(nav).queryByRole('link', { name: pl.staff.admin.title }), null)
  assert.equal(router.state.location.pathname, '/panel')
  assert.equal(reads().includes('/api/v1/staff'), false)
  assert.equal(reads().includes('/api/v1/moderation/topics'), false)
})

test('signing in from the administration page comes back to it', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.resolve(Response.json({}, { status: 401 })))
  await open('/panel/administracja')
  const google = await screen.findByRole('link', { name: pl.account.sign_in_google })
  assert.equal(
    google.getAttribute('href'),
    '/api/v1/auth/login/google?return_to=%2Fpanel%2Fadministracja',
  )
})
