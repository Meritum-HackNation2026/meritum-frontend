import type { Notification } from '@/contracts/meritum'
import { parseNotification } from './_parse'
import type { NotificationsApi } from './ports'

/**
 * This session's notifications, newest first, as a store React reads with
 * `useSyncExternalStore`.
 *
 * @feature US-POW-01, US-POW-04, F-26
 */
export interface Inbox {
  /** The current notifications, newest first; the same array until something changes. */
  items(): readonly Notification[]
  /** How many notifications are unread. */
  unread(): number
  /** Calls `listener` after every change; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void
  /**
   * Loads the saved inbox and opens the stream; each new notification is passed to `onNew`
   * (the toast). `loaded` settles once the saved inbox is in; `close` ends the stream.
   */
  connect(onNew: (notification: Notification) => void): { loaded: Promise<void>; close: () => void }
  /** Marks one notification as read, here and on the server. */
  markRead(id: string): void
  /** Deletes this session's notifications, here and on the server. */
  clear(): Promise<void>
}

const newestFirst = (a: Notification, b: Notification) =>
  Date.parse(b.created_at) - Date.parse(a.created_at)

/**
 * Builds the inbox over the notifications API. Invalid events, unknown kinds and repeated ids
 * are ignored.
 *
 * @param api - The notifications API adapter.
 * @returns The inbox store.
 * @feature US-POW-01, US-POW-04, F-26
 */
export function createInbox(api: NotificationsApi): Inbox {
  let items: readonly Notification[] = []
  const listeners = new Set<() => void>()
  const set = (next: readonly Notification[]) => {
    items = next
    for (const listener of listeners) {
      listener()
    }
  }
  const add = (value: unknown): Notification | null => {
    const parsed = parseNotification(value)
    if (!parsed || items.some((item) => item.id === parsed.id)) {
      return null
    }
    const notification: Notification = { ...parsed, status: parsed.status ?? 'unread' }
    // The stream may deliver before the saved inbox loads, so keep the order by date.
    set([notification, ...items].toSorted(newestFirst))
    return notification
  }

  return {
    items: () => items,
    unread: () => items.filter((item) => item.status !== 'read').length,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    connect(onNew) {
      const close = api.subscribe((value) => {
        const added = add(value)
        if (added) {
          onNew(added)
        }
      })
      const loaded = api.list().then((saved) => {
        for (const value of saved) {
          add(value)
        }
      })
      return { loaded, close }
    },
    markRead(id) {
      if (!items.some((item) => item.id === id && item.status !== 'read')) {
        return
      }
      set(items.map((item) => (item.id === id ? { ...item, status: 'read' } : item)))
      api.markRead(id)
    },
    async clear() {
      set([])
      await api.clear()
    },
  }
}
