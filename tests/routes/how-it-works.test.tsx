/**
 * The "Jak działa Meritum" page has its own address, /jak-dziala, linked from the footer of
 * every page, and is public: it renders without any sign-in.
 *
 * @feature US-ZRD-12, F-29
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'

function openPage(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] })
  render(<RouterProvider router={createRouter({ routeTree, history })} />)
}

test('/jak-dziala shows the page and, with no finished run, no numbers', async () => {
  openPage('/jak-dziala')
  await screen.findByRole('heading', { level: 1, name: pl.result.how_it_works })
  assert.ok(screen.getByText(pl.method.metrics.no_run))
})

test('the footer of every page links to /jak-dziala', async () => {
  openPage('/prywatnosc')
  const link = await screen.findByRole('link', { name: pl.result.how_it_works })
  assert.equal(link.getAttribute('href'), '/jak-dziala')
})
