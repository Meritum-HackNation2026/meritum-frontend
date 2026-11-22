/**
 * The sticky top bar of every page (frontend#122): mark and logotype, „Sprawdź” and „Jak działa”
 * with icons and aria-current, the notifications, „Zaloguj się” or the account menu, the same two
 * links in a menu on a phone, and a scroll padding that keeps the focused element below the bar.
 *
 * @feature US-SPR-01, US-DST-01, US-POW-01, F-01, F-26
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { type TestContext, test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'
import { requestPath } from '../fetch-request'

function fakeApi(t: TestContext, me: [number, object]) {
  t.mock.method(globalThis, 'fetch', (input: unknown) => {
    if (requestPath(input) === '/api/v1/auth/me') {
      return Promise.resolve(Response.json(me[1], { status: me[0] }))
    }
    return Promise.resolve(Response.json({ detail: 'Not signed in' }, { status: 401 }))
  })
}

async function open(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] })
  const router = createRouter({ routeTree, history })
  render(<RouterProvider router={router} />)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
  // the first banner is the bar; /jak-dziala has an article header of its own
  const [bar] = screen.getAllByRole('banner')
  assert.ok(bar)
  return bar
}

const sticky = /\bsticky\b/
const barHeightToken = /--spacing-bar:\s*4rem;/
const scrollPaddingFromBar = /scroll-padding-top:\s*calc\(var\(--spacing-bar\)/
const signedOut: [number, object] = [401, { detail: 'Not signed in' }]

test('the bar shows the logotype, both links with icons, the bell and „Zaloguj się”', async (t) => {
  fakeApi(t, signedOut)
  const bar = await open('/jak-dziala')
  assert.equal(within(bar).getByRole('link', { name: pl.brand.name }).getAttribute('href'), '/')
  const nav = within(bar).getByRole('navigation', { name: pl.nav.menu })
  const check = within(nav).getByRole('link', { name: pl.nav.check })
  const how = within(nav).getByRole('link', { name: pl.nav.how })
  assert.equal(check.getAttribute('href'), '/sprawdz')
  assert.equal(how.getAttribute('href'), '/jak-dziala')
  assert.ok(check.querySelector('svg') && how.querySelector('svg'), 'each link has an icon')
  assert.equal(how.getAttribute('aria-current'), 'page')
  assert.equal(check.getAttribute('aria-current'), null)
  assert.ok(within(bar).getByRole('button', { name: new RegExp(pl.notifications.title) }))
  assert.ok(await within(bar).findByRole('button', { name: pl.nav.sign_in }))
})

test('„Zaloguj się” offers the Google and Microsoft sign-in of the check page', async (t) => {
  fakeApi(t, signedOut)
  const bar = await open('/')
  fireEvent.keyDown(await within(bar).findByRole('button', { name: pl.nav.sign_in }), {
    key: 'Enter',
  })
  const google = await screen.findByRole('menuitem', { name: pl.account.sign_in_google })
  assert.equal(google.getAttribute('href'), '/api/v1/auth/login/google?return_to=%2F')
  assert.ok(screen.getByRole('menuitem', { name: pl.account.sign_in_microsoft }))
})

test('a signed-in citizen sees an avatar with an account menu', async (t) => {
  fakeApi(t, [200, { email: 'ola@example.org', provider: 'google' }])
  const bar = await open('/')
  const avatar = await within(bar).findByRole('button', { name: pl.nav.account })
  assert.equal(within(bar).queryByRole('button', { name: pl.nav.sign_in }), null)
  fireEvent.keyDown(avatar, { key: 'Enter' })
  const menu = await screen.findByRole('menu')
  assert.ok(within(menu).getByText(pl.account.signed_in_as.replace('{email}', 'ola@example.org')))
  assert.ok(within(menu).getByRole('menuitem', { name: pl.account.sign_out }))
})

test('on a phone the menu in the bar holds the same two links', async (t) => {
  fakeApi(t, signedOut)
  const bar = await open('/')
  fireEvent.click(within(bar).getByRole('button', { name: pl.nav.menu }))
  const menu = await screen.findByRole('dialog')
  const links = within(menu).getAllByRole('link')
  assert.deepEqual(
    links.map((link) => [link.textContent, link.getAttribute('href')]),
    [
      [pl.nav.check, '/sprawdz'],
      [pl.nav.how, '/jak-dziala'],
    ],
  )
})

const fromSm = /\bmax-sm:hidden\b/
const belowSm = /\bsm:hidden\b/

test('„Motyw” and „Rozmiar tekstu” are two buttons in the bar, in the phone menu below 640 px', async (t) => {
  fakeApi(t, signedOut)
  const bar = await open('/')
  const theme = within(bar).getByRole('button', { name: pl.display.theme_title })
  const text = within(bar).getByRole('button', { name: pl.display.text_title })
  assert.notEqual(theme, text)
  assert.match(theme.parentElement?.className ?? '', fromSm)
  fireEvent.click(within(bar).getByRole('button', { name: pl.nav.menu }))
  const menu = await screen.findByRole('dialog')
  const inMenu = within(menu).getByRole('button', { name: pl.display.text_title })
  assert.ok(within(menu).getByRole('button', { name: pl.display.theme_title }))
  assert.match(inMenu.parentElement?.className ?? '', belowSm)
})

test('the page keeps the focused element below the sticky bar (WCAG 2.4.11)', async (t) => {
  fakeApi(t, signedOut)
  const bar = await open('/')
  assert.match(bar.className, sticky)
  const row = bar.firstElementChild
  assert.ok(row?.classList.contains('h-bar'), 'the bar has the height of --spacing-bar')
  const css = readFileSync('src/index.css', 'utf8')
  assert.match(css, barHeightToken)
  assert.match(css, scrollPaddingFromBar)
})
