/**
 * The error page and the 404 page: Polish copy from the design system, a way home, and the
 * technical error never shown to the citizen.
 *
 * @feature US-DST-01, F-01
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { fireEvent, render, screen } from '@testing-library/react'
import { ErrorPage, NotFoundPage } from '@/components/route-pages'
import pl from '@/copy/pl.json'

function renderAt(page: () => React.ReactNode, path = '/') {
  const router = createRouter({
    routeTree: createRootRoute({ component: page }),
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultNotFoundComponent: NotFoundPage,
  })
  render(<RouterProvider router={router} />)
}

test('an unknown address shows the Polish 404 with a link home', async () => {
  renderAt(() => <Outlet />, '/nie-ma-takiej-strony')
  assert.ok(await screen.findByRole('heading', { name: pl.layout.not_found_title }))
  assert.ok(screen.getByText(pl.layout.not_found_text))
  assert.equal(screen.getByRole('link', { name: pl.layout.back_home }).getAttribute('href'), '/')
  assert.equal(document.body.textContent?.includes('Not Found'), false)
})

test('the error page is in Polish, hides the technical error and retries on request', async (t) => {
  t.mock.method(console, 'error', () => undefined)
  let resets = 0
  renderAt(() => (
    <ErrorPage error={new TypeError('l is not a function')} reset={() => (resets += 1)} />
  ))
  assert.ok(await screen.findByRole('heading', { name: pl.layout.error_title }))
  assert.equal(document.body.textContent?.includes('l is not a function'), false)
  assert.equal(document.body.textContent?.includes('Something went wrong'), false)
  fireEvent.click(screen.getByRole('button', { name: pl.layout.error_retry }))
  assert.equal(resets, 1)
  assert.ok(screen.getByRole('link', { name: pl.layout.back_home }))
})
