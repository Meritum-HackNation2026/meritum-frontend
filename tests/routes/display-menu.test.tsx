/**
 * The „Wygląd” menu in the bar (frontend#125): theme and text size on <html>, kept in
 * localStorage and applied before the first paint by the script in index.html, which follows the
 * system while nothing is stored.
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

async function openMenu(t: TestContext) {
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
  const trigger = within(bar).getByRole('button', { name: pl.display.label })
  assert.ok(trigger.querySelector('svg'), 'the trigger shows an icon')
  fireEvent.keyDown(trigger, { key: 'Enter' })
  return screen.findByRole('menu')
}

test('wybór wysokiego kontrastu zostaje po odświeżeniu strony', async (t) => {
  fakeSystem(t, false)
  loadPage()
  const menu = await openMenu(t)
  const theme = within(menu).getByRole('group', { name: pl.display.theme_title })
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
  const menu = await openMenu(t)
  fireEvent.click(within(menu).getByRole('menuitemradio', { name: pl.display.theme.dark }))
  assert.ok(html.classList.contains('dark'))
  assert.equal(html.dataset['contrast'], 'normal')
})

test('największy tekst ustawia data-text="xxl", zostaje po odświeżeniu i nie zamyka menu', async (t) => {
  fakeSystem(t, false)
  const menu = await openMenu(t)
  const sizes = within(menu).getByRole('group', { name: pl.display.text_title })
  const current = within(sizes).getByRole('menuitemradio', { name: pl.display.text.m })
  assert.equal(current.getAttribute('aria-checked'), 'true', 'the current size is announced')
  fireEvent.click(within(sizes).getByRole('menuitemradio', { name: pl.display.text.xxl }))
  assert.equal(html.dataset['text'], 'xxl')
  assert.ok(screen.getByRole('menu'), 'the menu stays open')

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
  const menu = await openMenu(t)
  fireEvent.click(within(menu).getByRole('menuitemradio', { name: pl.display.theme.dark }))
  await waitFor(() => assert.ok(html.classList.contains('dark')))
})
