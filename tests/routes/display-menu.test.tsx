/**
 * The „Motyw” and „Rozmiar tekstu” buttons in the bar (frontend#125, frontend#141), each with its
 * own menu: theme and text size on <html>, kept in localStorage and applied before the first paint
 * by the script in index.html, which follows the system while nothing is stored.
 *
 * @feature US-DST-01, F-01
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afterEach, type TestContext, test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'

const html = document.documentElement
const inlineScript = /<script>([\s\S]*?)<\/script>/
const headScript = inlineScript.exec(readFileSync('index.html', 'utf8'))?.[1] ?? ''

afterEach(() => {
  localStorage.clear()
  html.className = ''
  html.removeAttribute('data-contrast')
  html.removeAttribute('data-text')
})

/** A system that prefers dark or light; returns a function that flips it and fires the change. */
function fakeSystem(t: TestContext, dark: boolean) {
  const listeners: (() => void)[] = []
  let system = dark
  const query = (media: string) => ({
    get matches() {
      return media.includes('dark') && system
    },
    addEventListener: (_: string, listener: () => void) => listeners.push(listener),
  })
  t.mock.method(window, 'matchMedia', query)
  return (next: boolean) => {
    system = next
    for (const listener of listeners) listener()
  }
}

/** Runs the head script of index.html, as the browser does before the first paint. */
function loadPage() {
  new Function(headScript)()
}

/** Opens the bar button with this name and returns its menu. */
async function openMenu(t: TestContext, name: string) {
  t.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(Response.json({ detail: 'Not signed in' }, { status: 401 })),
  )
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  render(<RouterProvider router={router} />)
  const [bar] = await screen.findAllByRole('banner')
  assert.ok(bar)
  const trigger = within(bar).getByRole('button', { name })
  assert.ok(trigger.querySelector('svg'), 'the trigger shows an icon')
  fireEvent.keyDown(trigger, { key: 'Enter' })
  return screen.findByRole('menu')
}

test('wybór wysokiego kontrastu zostaje po odświeżeniu strony', async (t) => {
  fakeSystem(t, false)
  loadPage()
  const menu = await openMenu(t, pl.display.theme_title)
  const theme = within(menu).getByRole('group', { name: pl.display.theme_title })
  assert.equal(within(menu).queryByRole('group', { name: pl.display.text_title }), null)
  assert.equal(within(menu).queryByRole('menuitemradio', { name: pl.display.text.xxl }), null)
  fireEvent.click(within(theme).getByRole('menuitemradio', { name: pl.display.theme.contrast }))
  assert.ok(html.classList.contains('dark'))
  assert.equal(html.dataset['contrast'], 'more')

  html.className = ''
  html.removeAttribute('data-contrast')
  loadPage()
  assert.ok(html.classList.contains('dark'))
  assert.equal(html.dataset['contrast'], 'more')
})

test('plain dark sets data-contrast="normal"', async (t) => {
  fakeSystem(t, false)
  const menu = await openMenu(t, pl.display.theme_title)
  fireEvent.click(within(menu).getByRole('menuitemradio', { name: pl.display.theme.dark }))
  assert.ok(html.classList.contains('dark'))
  assert.equal(html.dataset['contrast'], 'normal')
})

test('największy tekst ustawia data-text="xxl", zostaje po odświeżeniu i nie zamyka menu', async (t) => {
  fakeSystem(t, false)
  const menu = await openMenu(t, pl.display.text_title)
  const sizes = within(menu).getByRole('group', { name: pl.display.text_title })
  const current = within(sizes).getByRole('menuitemradio', { name: pl.display.text.m })
  assert.equal(current.getAttribute('aria-checked'), 'true', 'the current size is announced')
  fireEvent.click(within(sizes).getByRole('menuitemradio', { name: pl.display.text.xxl }))
  assert.equal(html.dataset['text'], 'xxl')
  assert.ok(screen.getByRole('menu'), 'the menu stays open')
  assert.equal(within(menu).queryByRole('group', { name: pl.display.theme_title }), null)
  assert.equal(within(menu).queryByRole('menuitemradio', { name: pl.display.theme.dark }), null)

  html.removeAttribute('data-text')
  loadPage()
  assert.equal(html.dataset['text'], 'xxl')
})

test('bez zapisanego wyboru strona idzie za systemem, także gdy ten się zmieni', (t) => {
  const setSystem = fakeSystem(t, true)
  loadPage()
  assert.ok(html.classList.contains('dark'))
  assert.equal(html.dataset['contrast'], undefined)
  setSystem(false)
  assert.ok(!html.classList.contains('dark'))
})

test('a stored choice wins over a later system change', (t) => {
  localStorage.setItem('meritum-theme', 'light')
  const setSystem = fakeSystem(t, false)
  loadPage()
  setSystem(true)
  assert.ok(!html.classList.contains('dark'))
})

test('blocked localStorage does not break the menu', async (t) => {
  fakeSystem(t, false)
  t.mock.method(Storage.prototype, 'setItem', () => {
    throw new DOMException('blocked', 'SecurityError')
  })
  const menu = await openMenu(t, pl.display.theme_title)
  fireEvent.click(within(menu).getByRole('menuitemradio', { name: pl.display.theme.dark }))
  await waitFor(() => assert.ok(html.classList.contains('dark')))
})

/** The class lucide gives the icon the theme button shows now (the others are hidden). */
function themeIcon() {
  // an open menu hides the rest of the page from assistive technology
  const [bar] = screen.getAllByRole('banner', { hidden: true })
  assert.ok(bar)
  const button = within(bar).getByRole('button', { name: pl.display.theme_title, hidden: true })
  const current = button.querySelectorAll('svg[data-current]')
  assert.equal(current.length, 1, 'exactly one icon is the current one')
  return current[0]?.getAttribute('class') ?? ''
}

const sun = /\blucide-sun\b/
const moon = /\blucide-moon\b/
const contrast = /\blucide-contrast\b/

test('ikona przycisku „Motyw” pokazuje bieżący motyw', async (t) => {
  fakeSystem(t, false)
  const menu = await openMenu(t, pl.display.theme_title)
  assert.match(themeIcon(), sun)
  fireEvent.click(within(menu).getByRole('menuitemradio', { name: pl.display.theme.dark }))
  await waitFor(() => assert.match(themeIcon(), moon))
  await waitFor(() =>
    assert.equal(screen.queryByRole('menu'), null, 'a theme pick closes the menu'),
  )
  const [bar] = screen.getAllByRole('banner')
  assert.ok(bar)
  fireEvent.keyDown(within(bar).getByRole('button', { name: pl.display.theme_title }), {
    key: 'Enter',
  })
  const again = await screen.findByRole('menu')
  fireEvent.click(within(again).getByRole('menuitemradio', { name: pl.display.theme.contrast }))
  await waitFor(() => assert.match(themeIcon(), contrast))
})
