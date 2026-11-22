/**
 * The way back to the panel for staff on citizen pages (owner feedback on frontend#31).
 *
 * @feature US-MOD-05, F-25
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'
import { requestPath } from '../fetch-request'

function fakeApi(t: TestContext, me: [number, object]) {
  t.mock.method(globalThis, 'fetch', (input: unknown) => {
    const path = requestPath(input)
    if (path === '/api/v1/staff/me') return Promise.resolve(Response.json(me[1], { status: me[0] }))
    return Promise.resolve(Response.json([]))
  })
}

async function open(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] })
  const router = createRouter({ routeTree, history })
  render(<RouterProvider router={router} />)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
  return router
}

const moderator = { email: 'moderator@example.org', role: 'moderator' }

test('a staff member on a citizen page sees a link back to the panel', async (t) => {
  fakeApi(t, [200, moderator])
  await open('/')
  const header = screen.getByRole('banner')
  const link = await within(header).findByRole('link', { name: pl.staff.sign_in.title })
  assert.equal(link.getAttribute('href'), '/panel')
})

test('a citizen without a staff session sees no panel link', async (t) => {
  fakeApi(t, [401, { detail: 'Not signed in' }])
  await open('/')
  await screen.findByRole('main')
  await new Promise((resolve) => setTimeout(resolve, 0))
  const header = screen.getByRole('banner')
  assert.equal(within(header).queryByRole('link', { name: pl.staff.sign_in.title }), null)
})

test('after signing out of the panel the home page has no panel link', async (t) => {
  let isSignedIn = true
  t.mock.method(globalThis, 'fetch', (input: unknown) => {
    const path = requestPath(input)
    if (path === '/api/v1/auth/logout') {
      isSignedIn = false
      return Promise.resolve(new Response(null, { status: 204 }))
    }
    if (path === '/api/v1/auth/me') return Promise.resolve(Response.json({ csrf_token: 'tok_1' }))
    if (path === '/api/v1/staff/me') {
      return Promise.resolve(Response.json(moderator, { status: isSignedIn ? 200 : 401 }))
    }
    return Promise.resolve(Response.json([]))
  })
  const router = await open('/panel')
  fireEvent.click(await screen.findByRole('button', { name: pl.account.sign_out }))
  await waitFor(() => assert.equal(router.state.location.pathname, '/'))
  const header = screen.getByRole('banner')
  await waitFor(() =>
    assert.equal(within(header).queryByRole('link', { name: pl.staff.sign_in.title }), null),
  )
})

const phoneOnly = /\bmax-md:hidden\b/

test('below 768 px the panel link moves from the bar into the phone menu', async (t) => {
  fakeApi(t, [200, moderator])
  await open('/')
  const header = screen.getByRole('banner')
  const inBar = await within(header).findByRole('link', { name: pl.staff.sign_in.title })
  assert.match(inBar.className, phoneOnly, 'the bar keeps it from 768 px up')
  fireEvent.click(within(header).getByRole('button', { name: pl.nav.menu }))
  const menu = await screen.findByRole('dialog')
  const inMenu = await within(menu).findByRole('link', { name: pl.staff.sign_in.title })
  assert.equal(inMenu.getAttribute('href'), '/panel')
  assert.doesNotMatch(inMenu.className, phoneOnly)
})
