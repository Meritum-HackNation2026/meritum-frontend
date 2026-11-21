/**
 * The "Jak działa Meritum" page has its own address, /jak-dziala, linked from the footer of
 * every page, and is public: it renders without any sign-in.
 *
 * @feature US-ZRD-12, F-29
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'

function openPage(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] })
  render(<RouterProvider router={createRouter({ routeTree, history })} />)
}

function fakeApi(t: TestContext, body: unknown, status: number) {
  t.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  )
}

test('/jak-dziala shows the metrics of the last run from the API', async (t) => {
  fakeApi(
    t,
    {
      finished_at: '2026-11-20T18:30:00Z',
      bundle_url: 'https://example.org/evals',
      metrics: { macro_f1: 0.71 },
    },
    200,
  )
  openPage('/jak-dziala')
  await screen.findByRole('heading', { level: 1, name: pl.result.how_it_works })
  assert.ok(await screen.findByText(pl.method.metrics.names.macro_f1))
  assert.ok(screen.getByText('0,71'))
  assert.equal(screen.queryAllByText(pl.method.metrics.no_run).length, 0)
})

test('/jak-dziala with no finished run shows the message and no numbers', async (t) => {
  fakeApi(t, { detail: 'not found' }, 404)
  openPage('/jak-dziala')
  assert.ok(await screen.findByText(pl.method.metrics.no_run))
  assert.equal(screen.queryAllByText(pl.method.metrics.names.macro_f1).length, 0)
})

test('the footer of every page links to /jak-dziala', async () => {
  openPage('/prywatnosc')
  const link = await screen.findByRole('link', { name: pl.result.how_it_works })
  assert.equal(link.getAttribute('href'), '/jak-dziala')
})
