/**
 * The page frame (frontend#122): a route fills the 320 px rail slot beside its column, and the
 * one-row footer links to „Jak działa Meritum”, the source catalogue and the privacy page, which
 * links on to the policy of every channel.
 *
 * @feature US-DST-01, US-BEZ-06, F-01, F-20, F-29
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import { AppShell, Rail } from '@/components/app-shell'
import pl from '@/copy/pl.json'
import privacy from '@/copy/privacy.json'
import { routeTree } from '@/routeTree.gen'

function quietApi(t: TestContext) {
  t.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(Response.json({ detail: 'Not signed in' }, { status: 401 })),
  )
}

async function show(router: ReturnType<typeof createRouter>) {
  render(<RouterProvider router={router} />)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
}

test('a route puts its own content into the rail beside the column', async (t) => {
  quietApi(t)
  const root = createRootRoute({ component: AppShell })
  const page = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => (
      <>
        <h1>Strona</h1>
        <Rail>
          <p>W szynie</p>
        </Rail>
      </>
    ),
  })
  const history = createMemoryHistory({ initialEntries: ['/'] })
  await show(createRouter({ routeTree: root.addChildren([page]), history }))
  const rail = await screen.findByRole('complementary')
  assert.ok(within(rail).getByText('W szynie'))
  assert.equal(within(rail).queryByRole('heading', { name: 'Strona' }), null)
  assert.ok(screen.getByRole('main').contains(rail))
})

test('the footer has the three links of the design system and the year', async (t) => {
  quietApi(t)
  const history = createMemoryHistory({ initialEntries: ['/prywatnosc'] })
  await show(createRouter({ routeTree, history }))
  const footer = screen.getByRole('contentinfo')
  const links = within(footer).getAllByRole('link')
  assert.deepEqual(
    links.map((link) => [link.textContent, link.getAttribute('href')]),
    [
      [pl.brand.name, '/'],
      [pl.result.how_it_works, '/jak-dziala'],
      [pl.method.catalog.title, '/jak-dziala#katalog'],
      [pl.nav.privacy, '/prywatnosc'],
    ],
  )
  assert.ok(within(footer).getByText(new RegExp(String(new Date().getFullYear()))))
})

test('the privacy page links to the policy of every channel', async (t) => {
  quietApi(t)
  const history = createMemoryHistory({ initialEntries: ['/prywatnosc'] })
  await show(createRouter({ routeTree, history }))
  const nav = screen.getByRole('navigation', { name: pl.nav.privacy })
  const { policies } = privacy
  const expected = [
    [policies.web.title, '/prywatnosc'],
    [policies.discord.title, '/prywatnosc/discord'],
    [policies.extension.title, '/prywatnosc/wtyczka'],
    [policies.sms.title, '/prywatnosc/sms'],
  ] as const
  for (const [title, path] of expected) {
    assert.equal(within(nav).getByRole('link', { name: title }).getAttribute('href'), path)
  }
})
