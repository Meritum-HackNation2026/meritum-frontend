/**
 * The export page at /panel/eksport on a fake API: the analyst picks a period and a format and
 * gets the file; other roles never see the download button.
 *
 * @feature US-OBS-03, F-36
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'
import { analyst, calls, fakeApi } from './eval-api'

async function openExport() {
  const history = createMemoryHistory({ initialEntries: ['/panel/eksport'] })
  const router = createRouter({ routeTree, history })
  render(<RouterProvider router={router} />)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
  return router
}

const exportRoute = 'GET /api/v1/export?format=stix&days=30'

test('an analyst downloads the STIX bundle of the last 30 days and is told DISARM codes need confirming', async (t) => {
  const saved: string[] = []
  t.mock.method(URL, 'createObjectURL', () => 'blob:meritum')
  t.mock.method(URL, 'revokeObjectURL', () => undefined)
  t.mock.method(HTMLAnchorElement.prototype, 'click', function (this: HTMLAnchorElement) {
    saved.push(this.download)
  })
  const fetch = fakeApi(t, {
    'GET /api/v1/staff/me': [200, analyst],
    [exportRoute]: [200, { type: 'bundle' }],
  })
  await openExport()
  assert.ok(await screen.findByText(pl.export.disarm_notice))
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(pl.export.formats.stix) }))
  fireEvent.change(screen.getByRole('combobox', { name: pl.export.period }), {
    target: { value: '30' },
  })
  fireEvent.click(screen.getByRole('button', { name: pl.export.download }))
  const done = await screen.findByRole('status')
  await waitFor(() => assert.match(done.textContent ?? '', /\.json\.?$/))
  assert.ok(calls(fetch).includes(exportRoute))
  assert.match(saved[0] ?? '', /^meritum-eksport-30d-\d{4}-\d{2}-\d{2}\.json$/)
})

test('a failed export says so and saves nothing', async (t) => {
  const click = t.mock.method(HTMLAnchorElement.prototype, 'click', () => undefined)
  fakeApi(t, {
    'GET /api/v1/staff/me': [200, analyst],
    'GET /api/v1/export?format=json&days=7': [500, {}],
  })
  await openExport()
  fireEvent.click(await screen.findByRole('button', { name: pl.export.download }))
  assert.equal((await screen.findByRole('status')).textContent, pl.export.error)
  assert.equal(click.mock.callCount(), 0)
})

test('a moderator without the analyst role is sent back and sees no download button', async (t) => {
  const fetch = fakeApi(t, {
    'GET /api/v1/staff/me': [
      200,
      { email: 'mod@example.org', role: 'moderator', read_only: false },
    ],
  })
  const router = await openExport()
  assert.equal(router.state.location.pathname, '/panel')
  assert.equal(screen.queryByRole('button', { name: pl.export.download }), null)
  assert.equal(
    calls(fetch).some((call) => call.includes('/api/v1/export')),
    false,
  )
})
