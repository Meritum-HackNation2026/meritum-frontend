import type { NotificationsApi } from '@/notifications'
import { sessionId } from './_session'
import { NOTIFICATIONS_ENDPOINT, SESSION_HEADER, SESSION_QUERY_PARAM } from './constants'

const parse = (data: string): unknown => {
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

/** Drops an event addressed to another session; the server checks this too. */
const isForOtherSession = (value: unknown): boolean => {
  const session = (value as { session_id?: unknown } | null)?.session_id
  return typeof session === 'string' && session !== sessionId()
}

const send = async (path: string, method: string): Promise<Response | null> => {
  try {
    return await fetch(`${NOTIFICATIONS_ENDPOINT}${path}`, {
      method,
      headers: { [SESSION_HEADER]: sessionId() },
      keepalive: method !== 'GET', // a read mark still goes out when the click leaves the page
    })
  } catch {
    return null
  }
}

/**
 * Notifications API of meritum-backend for this tab's session: server-sent events through
 * `EventSource` and the inbox over `fetch`. Never throws: an unreachable API is an empty inbox.
 *
 * @feature US-POW-01, US-POW-04, F-26
 */
export const apiNotifications: NotificationsApi = {
  subscribe(onEvent) {
    // shortcut: no EventSource (old browser, tests without a fake) means the inbox loads only on start.
    if (typeof EventSource === 'undefined') {
      return () => undefined
    }
    const query = new URLSearchParams({ [SESSION_QUERY_PARAM]: sessionId() })
    const source = new EventSource(`${NOTIFICATIONS_ENDPOINT}/stream?${query}`)
    source.onmessage = (event: MessageEvent<string>) => {
      const value = parse(event.data)
      if (!isForOtherSession(value)) {
        onEvent(value)
      }
    }
    return () => source.close()
  },
  async list() {
    const response = await send('', 'GET')
    const body: unknown = response?.ok ? await response.json().catch(() => null) : null
    return Array.isArray(body) ? body.filter((value) => !isForOtherSession(value)) : []
  },
  async markRead(id) {
    await send(`/${encodeURIComponent(id)}/read`, 'POST')
  },
  async clear() {
    await send('', 'DELETE')
  },
}
