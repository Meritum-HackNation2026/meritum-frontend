/**
 * A new or changed case reaches a moderator with the panel open as a toast and an unread inbox
 * entry of kind `case_assigned`, through the same notifications module as citizens get.
 *
 * @feature US-POW-05, US-MOD-05, F-25, F-26
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'
import { requestPath } from '../fetch-request'

/** Stands in for the browser EventSource; `emit` replays one server event. */
class FakeEventSource {
  static last: FakeEventSource | undefined
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  constructor() {
    FakeEventSource.last = this
  }
  close() {
    this.onmessage = null
  }
  emit(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }))
  }
}

const caseAssigned = {
  id: 'n_21',
  kind: 'case_assigned',
  status: 'unread',
  user_id: 'u_moderator',
  case_id: '#S-12',
  link: '/panel',
  created_at: '2026-11-21T14:02:24+01:00',
  retention_until: '2026-12-21T14:02:24+01:00',
}

test('case_assigned on the open panel shows a toast and an unread inbox entry', async (t) => {
  const answers: Record<string, unknown> = {
    '/api/v1/staff/me': { email: 'moderator@example.org', role: 'moderator' },
  }
  t.mock.method(globalThis, 'fetch', (input: unknown) =>
    Promise.resolve(Response.json(answers[requestPath(input)] ?? [])),
  )
  Object.assign(globalThis, { EventSource: FakeEventSource })
  t.after(() => {
    toast.dismiss()
    Reflect.deleteProperty(globalThis, 'EventSource')
  })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/panel'] }),
  })
  render(<RouterProvider router={router} />)
  await screen.findByRole('region', { name: pl.moderation.queue_title })

  act(() => FakeEventSource.last?.emit(caseAssigned))
  const text = pl.notifications.kind.case_assigned.replace('{case}', '#S-12')
  const toaster = await screen.findByRole('region', { name: new RegExp(pl.notifications.title) })
  await waitFor(() => assert.ok(within(toaster).getByRole('link', { name: text })))

  act(() => toast.dismiss())
  fireEvent.click(screen.getByRole('button', { name: new RegExp(pl.notifications.title) }))
  const inbox = await screen.findByRole('dialog')
  assert.ok(within(inbox).getByRole('link', { name: text }))
  assert.ok(within(inbox).getByText(pl.notifications.status.unread))
})
