import type { NotificationsApi } from '@/notifications'
import { sessionId } from './_session'
import {
  NOTIFICATIONS_ENDPOINT,
  NOTIFICATIONS_MAX_RETRIES,
  NOTIFICATIONS_RETRY_MS,
  NOTIFICATIONS_STABLE_MS,
  SESSION_HEADER,
  SESSION_QUERY_PARAM,
} from './constants'

const parse = (data: string): unknown => {
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

/** Drops an event addressed to another session; the server checks this too. */
const isForOtherSession = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null || !('session_id' in value)) {
    return false
  }
  return typeof value.session_id === 'string' && value.session_id !== sessionId()
}

const send = async (path: string, method: 'GET' | 'POST' | 'DELETE'): Promise<Response | null> => {
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
 * `EventSource` and the inbox over `fetch`. Never throws: an unreachable API is an empty inbox,
 * and a stream that keeps failing is retried `NOTIFICATIONS_MAX_RETRIES` times with a doubling
 * pause, then left closed.
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
    let source: EventSource
    let retry: ReturnType<typeof setTimeout> | undefined
    let failures = 0
    let openedAt: number | undefined
    const open = () => {
      openedAt = undefined
      source = new EventSource(`${NOTIFICATIONS_ENDPOINT}/stream?${query}`)
      source.onopen = () => {
        openedAt = Date.now()
      }
      source.onmessage = (event: MessageEvent<string>) => {
        failures = 0
        const value = parse(event.data)
        if (!isForOtherSession(value)) {
          onEvent(value)
        }
      }
      // The browser would reconnect a dropped stream every few seconds forever; close it
      // and retry with a doubling pause, then give up (no worker, a 404 or 502 by a proxy).
      source.onerror = () => {
        source.close()
        const wasStable = openedAt !== undefined && Date.now() - openedAt >= NOTIFICATIONS_STABLE_MS
        if (wasStable) {
          failures = 0
        }
        if (failures < NOTIFICATIONS_MAX_RETRIES) {
          retry = setTimeout(open, NOTIFICATIONS_RETRY_MS * 2 ** failures)
          failures += 1
        }
      }
    }
    open()
    return () => {
      clearTimeout(retry)
      source.close()
    }
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
