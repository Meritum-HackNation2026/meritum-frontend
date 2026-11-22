/**
 * „Linki demo” on /panel/administracja on a fake API: an administrator issues a link for a
 * technical account, copies it, sees it listed and revokes it (backend#53).
 *
 * @feature US-OBS-06, US-MOD-05, F-28, F-25
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'
import { requestPath } from '../fetch-request'

const copy = pl.staff.admin.demo_links
const origin = 'http://localhost'
const url = 'https://meritum-dev.example/api/v1/auth/demo/tok_abc123'

const asRequest = (input: unknown) =>
  input instanceof Request ? input : new Request(new URL(String(input), origin))

type Sent = { method: string; path: string; csrf: string | null; body: unknown }

/** A fake staff API that issues one link and records every write. */
function fakeApi(
  t: TestContext,
  issue: () => Response = () => Response.json(issued(), { status: 201 }),
  links: () => Response = () => Response.json([]),
) {
  const sent: Sent[] = []
  t.mock.method(globalThis, 'fetch', async (input: unknown) => {
    const request = asRequest(input)
    const path = decodeURIComponent(requestPath(input))
    const body = request.method === 'POST' ? await request.json() : null
    if (request.method !== 'GET') {
      sent.push({ method: request.method, path, csrf: request.headers.get('X-CSRF-Token'), body })
    }
    if (path === '/api/v1/staff/me') return Response.json({ email: 'a@example.org', role: 'admin' })
    if (path === '/api/v1/auth/me') return Response.json({ csrf_token: 'tok_1' })
    if (path === '/api/v1/staff/demo-links' && request.method === 'GET') return links()
    if (path === '/api/v1/staff/demo-links') return issue()
    if (path === '/api/v1/staff/demo-links/revoke') return new Response(null, { status: 204 })
    return Response.json([])
  })
  return sent
}

const issued = () => ({ id: 'new-link', url, expires_at: '2030-01-02T10:00:00Z' })

async function openRegion() {
  const history = createMemoryHistory({ initialEntries: ['/panel/administracja'] })
  const router = createRouter({ routeTree, history })
  render(<RouterProvider router={router} />)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
  return screen.findByRole('region', { name: copy.title })
}

test('issuing a link for the administrator sends the CSRF token and lists the link', async (t) => {
  const sent = fakeApi(t)
  const region = await openRegion()
  assert.ok(await within(region).findByText(copy.empty))
  fireEvent.change(within(region).getByLabelText(copy.account), { target: { value: 'admin' } })
  fireEvent.click(await within(region).findByRole('button', { name: copy.issue }))
  assert.ok(
    await within(region).findByText(
      `Wydano link dla konta „${copy.account_admin}”. Skopiuj go teraz.`,
    ),
  )
  assert.equal((within(region).getByLabelText(copy.url) as HTMLInputElement).value, url)
  assert.equal(within(region).queryByText(copy.empty), null)
  assert.equal(sent.length, 1)
  assert.equal(sent[0]?.csrf, 'tok_1')
  assert.equal(sent[0]?.path, '/api/v1/staff/demo-links')
  const body = sent[0]?.body as { account: string; expires_at: string }
  assert.equal(body.account, 'admin')
  const hours = (Date.parse(body.expires_at) - Date.now()) / 3_600_000
  assert.ok(hours > 23 && hours <= 24)
})

test('the copy button puts the link on the clipboard', async (t) => {
  fakeApi(t)
  const writeText = t.mock.fn(async (_text: string) => undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  const region = await openRegion()
  fireEvent.click(await within(region).findByRole('button', { name: copy.issue }))
  fireEvent.click(await within(region).findByRole('button', { name: copy.copy }))
  assert.ok(await within(region).findByText(copy.copied))
  assert.deepEqual(writeText.mock.calls[0]?.arguments, [url])
})

test('revoking asks first, then sends the link identifier and drops it from the list', async (t) => {
  const sent = fakeApi(t)
  const region = await openRegion()
  fireEvent.change(within(region).getByLabelText(copy.account), { target: { value: 'obywatel' } })
  fireEvent.click(await within(region).findByRole('button', { name: copy.issue }))
  fireEvent.click(await within(region).findByRole('button', { name: copy.revoke }))
  const dialog = await screen.findByRole('alertdialog')
  fireEvent.click(within(dialog).getByRole('button', { name: copy.revoke }))
  assert.ok(await within(region).findByText(`Odwołano link dla konta „${copy.account_obywatel}”.`))
  assert.ok(within(region).getByText(copy.empty))
  assert.deepEqual(sent[1], {
    method: 'POST',
    path: '/api/v1/staff/demo-links/revoke',
    csrf: 'tok_1',
    body: { id: 'new-link' },
  })
})

test('outside dev the API answers 404 and the section says links are not available', async (t) => {
  fakeApi(t, undefined, () => new Response(null, { status: 404 }))
  const region = await openRegion()
  assert.ok(await within(region).findByText(copy.unavailable))
  assert.equal(within(region).queryByRole('button', { name: copy.issue }), null)
})

test('lists a previously issued link without exposing an address and revokes it by id', async (t) => {
  const sent = fakeApi(t, undefined, () =>
    Response.json([
      {
        id: 'previous-link',
        account: 'admin',
        issued_at: '2030-01-01T10:00:00Z',
        expires_at: '2030-01-02T10:00:00Z',
      },
    ]),
  )
  const region = await openRegion()
  fireEvent.click(await within(region).findByRole('button', { name: copy.revoke }))
  assert.equal(within(region).queryByLabelText(copy.url), null)
  const dialog = await screen.findByRole('alertdialog')
  fireEvent.click(within(dialog).getByRole('button', { name: copy.revoke }))
  assert.ok(await within(region).findByText(copy.empty))
  assert.deepEqual(sent[0], {
    method: 'POST',
    path: '/api/v1/staff/demo-links/revoke',
    csrf: 'tok_1',
    body: { id: 'previous-link' },
  })
})
