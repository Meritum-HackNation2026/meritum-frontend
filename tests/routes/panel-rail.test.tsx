/**
 * The team panel and the privacy pages use the layout of a column and a rail (frontend#137):
 * the panel navigation, session and sign-out stand in the rail, before the content on a phone;
 * the privacy policy has „Na tej stronie” and the other channels' policies in the rail.
 *
 * @feature US-MOD-01, US-DST-01, F-01
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import pl from '@/copy/pl.json'
import privacy from '@/copy/privacy.json'
import { routeTree } from '@/routeTree.gen'
import { requestPath } from '../fetch-request'
import { fakeApi as fakeEvalApi, jury, openEval } from './eval-api'

const moderator = { email: 'moderator@example.org', role: 'moderator', read_only: false }

function fakeApi(t: TestContext) {
  t.mock.method(globalThis, 'fetch', (input: unknown) => {
    const path = requestPath(input)
    const body = path === '/api/v1/staff/me' ? moderator : []
    return Promise.resolve(Response.json(body))
  })
}

async function open(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] })
  const router = createRouter({ routeTree, history })
  render(<RouterProvider router={router} />)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
}

const column = () => screen.getByRole('main').firstElementChild as HTMLElement
const rail = () => screen.getByRole('complementary')
const follows = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

test('nawigacja panelu jest w szynie: current page, session and sign-out; the column starts with the heading', async (t) => {
  fakeApi(t)
  await open('/panel')
  const heading = await screen.findByRole('heading', { level: 1, name: pl.moderation.queue_title })
  const nav = within(rail()).getByRole('navigation')
  const current = within(nav).getByRole('link', { name: pl.moderation.queue_title })
  assert.equal(current.getAttribute('aria-current'), 'page')
  // a Lucide icon beside each item, hidden from screen readers
  for (const link of within(nav).getAllByRole('link')) {
    assert.ok(link.querySelector('svg[aria-hidden="true"]'))
  }
  assert.ok(within(rail()).getByText('moderator@example.org, rola: moderator'))
  assert.ok(within(rail()).getByRole('button', { name: pl.account.sign_out }))
  assert.equal(within(column()).queryByRole('navigation'), null)
  assert.equal(within(column()).getAllByRole('heading')[0], heading)
})

test('the jury session says „tylko do odczytu” in the rail', async (t) => {
  fakeEvalApi(t, { 'GET /api/v1/staff/me': [200, jury] })
  await openEval()
  assert.ok(await within(await screen.findByRole('complementary')).findByText(pl.jury.read_only))
})

test('strona prywatności ma spis treści w szynie: a section scrolls into view, the other policies are linked', async (t) => {
  fakeApi(t)
  const scrolled: string[] = []
  t.mock.method(Element.prototype, 'scrollIntoView', function (this: Element) {
    scrolled.push(this.id)
  })
  await open('/prywatnosc')
  await screen.findByRole('heading', { level: 1, name: privacy.policies.web.title })
  const toc = within(rail()).getByRole('navigation', { name: pl.nav.on_page })
  fireEvent.click(within(toc).getByRole('button', { name: privacy.processors.title }))
  const [id] = scrolled
  assert.ok(id)
  assert.equal(
    document.getElementById(id)?.querySelector('h2')?.textContent,
    privacy.processors.title,
  )
  const policies = within(rail()).getByRole('navigation', { name: pl.nav.privacy })
  const current = within(policies).getByRole('link', { name: privacy.policies.web.title })
  assert.equal(current.getAttribute('aria-current'), 'page')
  assert.equal(within(policies).getAllByRole('link').length, 4)
  assert.equal(within(column()).queryByRole('navigation'), null)
})

test('panel na telefonie: at 320 px the panel navigation stands before the queue', async (t) => {
  fakeApi(t)
  // happy-dom's own window API; matchMedia follows the viewport
  const { happyDOM } = window as unknown as {
    happyDOM: { setViewport: (size: { width: number; height: number }) => void }
  }
  happyDOM.setViewport({ width: 320, height: 640 })
  t.after(() => happyDOM.setViewport({ width: 1024, height: 768 }))
  await open('/panel')
  const heading = await screen.findByRole('heading', { level: 1, name: pl.moderation.queue_title })
  const nav = within(screen.getByRole('main')).getByRole('navigation')
  assert.ok(follows(nav, heading))
  assert.ok(within(nav).getByRole('link', { name: pl.moderation.queue_title }))
})
