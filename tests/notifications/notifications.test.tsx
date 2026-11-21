/**
 * The app's notifications on recorded server-sent events, through the real API adapter with a
 * fake EventSource and fetch: toast on another page, unread inbox with counter, click to read.
 *
 * @feature US-POW-01, US-POW-04, F-26
 */
import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { toast } from 'sonner'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'

/** Stands in for the browser EventSource; `emit` replays one recorded server event. */
class FakeEventSource {
  static last: FakeEventSource | undefined
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  closed = false
  readonly url: string
  constructor(url: string) {
    this.url = url
    FakeEventSource.last = this
  }
  close() {
    this.closed = true
  }
  emit(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }))
  }
}

const streamUrl = /\/api\/v1\/notifications\/stream\?session=s_7f3a9c21$/
const requests: string[] = []
const realFetch = globalThis.fetch
let saved: unknown[] = []

beforeEach(() => {
  sessionStorage.setItem('meritum.session', 's_7f3a9c21')
  requests.length = 0
  saved = []
  Object.assign(globalThis, { EventSource: FakeEventSource })
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(`${init?.method ?? 'GET'} ${String(input)}`)
    return Promise.resolve(Response.json(saved))
  }
})

afterEach(() => {
  toast.dismiss()
  globalThis.fetch = realFetch
  Reflect.deleteProperty(globalThis, 'EventSource')
})

const checkDone = {
  id: 'n_01',
  kind: 'check_done',
  status: 'unread',
  session_id: 's_7f3a9c21',
  check_id: 'c_02',
  link: '/sprawdzenia/c_02',
  created_at: '2026-11-21T14:02:24+01:00',
  retention_until: '2026-12-21T14:02:24+01:00',
}

async function openApp(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] })
  const router = createRouter({ routeTree, history })
  render(<RouterProvider router={router} />)
  await screen.findByRole('main')
  return router
}

function bell() {
  return screen.getByRole('button', { name: new RegExp(pl.notifications.title) })
}

test('check_done on another page shows a toast linking to the result', async () => {
  await openApp('/prywatnosc')
  assert.match(FakeEventSource.last?.url ?? '', streamUrl)
  act(() => FakeEventSource.last?.emit(checkDone))
  const toastLink = await screen.findByRole('link', { name: pl.notifications.kind.check_done })
  assert.equal(toastLink.getAttribute('href'), '/sprawdzenia/c_02')
  fireEvent.click(toastLink)
  assert.ok(requests.includes('POST /api/v1/notifications/n_01/read'))
})

test('the saved inbox of this session counts its unread ones; other sessions are dropped', async () => {
  saved = [checkDone, { ...checkDone, id: 'n_08', session_id: 's_other' }]
  await openApp('/')
  assert.ok(requests.includes('GET /api/v1/notifications'))
  await screen.findByText(pl.notifications.unread.replace('{count}', '1'))
})

test('an ignored toast stays unread in the inbox; clicking it opens the result and reads it', async () => {
  const router = await openApp('/')
  act(() => FakeEventSource.last?.emit(checkDone))
  await screen.findByText(pl.notifications.unread.replace('{count}', '1'))
  act(() => toast.dismiss())

  fireEvent.click(bell())
  const inbox = await screen.findByRole('dialog')
  within(inbox).getByText(pl.notifications.status.unread)
  within(inbox).getByText(pl.notifications.retention.replace('{days}', '30'))
  fireEvent.click(within(inbox).getByRole('link', { name: pl.notifications.kind.check_done }))

  assert.equal(router.state.location.pathname, '/sprawdzenia/c_02')
  assert.ok(requests.includes('POST /api/v1/notifications/n_01/read'))
  fireEvent.click(bell())
  const reopened = await screen.findByRole('dialog')
  within(reopened).getByText(pl.notifications.status.read)
  assert.equal(screen.queryAllByText(pl.notifications.unread.replace('{count}', '1')).length, 0)
  within(reopened).getByText(pl.notifications.unread.replace('{count}', '0'))
})

test('a notification for another session is dropped', async () => {
  await openApp('/')
  act(() => FakeEventSource.last?.emit({ ...checkDone, id: 'n_09', session_id: 's_other' }))
  fireEvent.click(bell())
  const inbox = await screen.findByRole('dialog')
  within(inbox).getByText(pl.notifications.empty)
})
