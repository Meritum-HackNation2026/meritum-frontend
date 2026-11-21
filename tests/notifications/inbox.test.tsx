/**
 * The notification inbox on recorded events: unread on arrival, counter, marking as read,
 * unknown kinds and unsafe links ignored, clearing the session's notifications.
 *
 * @feature US-POW-01, US-POW-04, F-26
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Notification } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import {
  createInbox,
  type NotificationsApi,
  notificationText,
  parseNotification,
} from '@/notifications'

const checkDone = {
  id: 'n_01',
  kind: 'check_done',
  status: 'unread',
  session_id: 's_7f3a9c21',
  check_id: 'c_02',
  link: '/sprawdzenia/c_02',
  created_at: '2026-11-21T14:02:24+01:00',
  retention_until: '2026-12-21T14:02:24+01:00',
} satisfies Notification

function fakeApi(saved: Notification[] = []) {
  const calls = { read: [] as string[], cleared: 0 }
  let push: (value: unknown) => void = () => undefined
  const api: NotificationsApi = {
    subscribe(onEvent) {
      push = onEvent
      return () => undefined
    },
    list: () => Promise.resolve(saved),
    markRead(id) {
      calls.read.push(id)
      return Promise.resolve()
    },
    clear() {
      calls.cleared += 1
      return Promise.resolve()
    },
  }
  return { api, calls, push: (value: unknown) => push(value) }
}

test('a streamed notification lands unread, is announced and counts as one unread', () => {
  const { api, push } = fakeApi()
  const inbox = createInbox(api)
  const announced: string[] = []
  inbox.connect((notification) => announced.push(notification.id))
  push(checkDone)
  assert.deepEqual(announced, ['n_01'])
  assert.equal(inbox.items()[0]?.status, 'unread')
  assert.equal(inbox.unread(), 1)
})

test('marking a notification as read updates the counter and tells the API', () => {
  const { api, calls, push } = fakeApi()
  const inbox = createInbox(api)
  inbox.connect(() => undefined)
  push(checkDone)
  inbox.markRead('n_01')
  assert.equal(inbox.items()[0]?.status, 'read')
  assert.equal(inbox.unread(), 0)
  assert.deepEqual(calls.read, ['n_01'])
})

test('an unknown kind, a malformed event and an off-site link are ignored', () => {
  const { api, push } = fakeApi()
  const inbox = createInbox(api)
  const announced: string[] = []
  inbox.connect((notification) => announced.push(notification.id))
  push({ ...checkDone, id: 'n_02', kind: 'promo' })
  push({ id: 'n_03' })
  push('not json at all')
  push({ ...checkDone, id: 'n_04', link: 'https://example.com/' })
  push({ ...checkDone, id: 'n_05', link: '//example.com/' })
  push({ ...checkDone, id: 'n_06', link: '/\\example.com/' })
  push({ ...checkDone, id: 'n_07', link: '/\t/example.com/' })
  push({ ...checkDone, id: 'n_08', link: 'javascript:alert(1)' })
  push({ ...checkDone, id: 'n_09', case_id: { evil: true } })
  push({ ...checkDone, id: 'n_10', status: 'archived' })
  assert.deepEqual(announced, [])
  assert.equal(inbox.items().length, 0)
})

test('the same notification twice is announced once', () => {
  const { api, push } = fakeApi()
  const inbox = createInbox(api)
  const announced: string[] = []
  inbox.connect((notification) => announced.push(notification.id))
  push(checkDone)
  push(checkDone)
  assert.deepEqual(announced, ['n_01'])
})

test('the saved inbox loads on connect without announcing toasts again', async () => {
  const { api } = fakeApi([checkDone, { ...checkDone, id: 'n_00', status: 'read' }])
  const inbox = createInbox(api)
  const announced: string[] = []
  await inbox.connect((notification) => announced.push(notification.id)).loaded
  assert.equal(inbox.items().length, 2)
  assert.equal(inbox.unread(), 1)
  assert.deepEqual(announced, [])
})

test('clearing empties the inbox and deletes the session notifications in the API', async () => {
  const { api, calls, push } = fakeApi()
  const inbox = createInbox(api)
  inbox.connect(() => undefined)
  push(checkDone)
  await inbox.clear()
  assert.equal(inbox.items().length, 0)
  assert.equal(calls.cleared, 1)
})

test('each kind gets its text from copy/pl.json', () => {
  const kinds = pl.notifications.kind
  const text = (fields: Partial<Notification>) =>
    notificationText({ ...checkDone, ...fields } as Notification)
  assert.equal(text({ kind: 'check_done' }), kinds.check_done)
  assert.equal(text({ kind: 'new_evidence' }), kinds.new_evidence)
  assert.equal(
    text({ kind: 'moderator_answer', case_id: 'S-1' }),
    'Moderator odpowiedział na sprawę S-1.',
  )
  assert.equal(
    text({ kind: 'case_assigned', case_id: 'S-2' }),
    'Nowa albo zaktualizowana sprawa S-2.',
  )
  // The contract has no step or message field yet: no raw {placeholder} reaches the user.
  assert.equal(text({ kind: 'check_progress' }), 'Sprawdzenie trwa')
  assert.equal(text({ kind: 'system' }), pl.notifications.title)
})

test('parseNotification keeps a valid notification and drops one without a date', () => {
  assert.deepEqual(parseNotification(checkDone), checkDone)
  assert.equal(parseNotification({ ...checkDone, created_at: undefined }), null)
})

test('the inbox lists newest first even when the stream beats the saved inbox', async () => {
  const older = { ...checkDone, id: 'n_00', created_at: '2026-11-20T09:00:00+01:00' }
  const { api, push } = fakeApi([older])
  const inbox = createInbox(api)
  const connection = inbox.connect(() => undefined)
  push(checkDone)
  await connection.loaded
  assert.deepEqual(
    inbox.items().map((item) => item.id),
    ['n_01', 'n_00'],
  )
})
