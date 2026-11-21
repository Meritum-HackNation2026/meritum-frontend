import { fill, t } from '@/components/meritum'
import type { Notification } from '@/contracts/meritum'
import { NOTIFICATION_KINDS } from './constants'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** Only a path inside the app: no other site, no `javascript:` (`//host` is another site too). */
const isInAppPath = (link: unknown): link is string =>
  typeof link === 'string' && link.startsWith('/') && !link.startsWith('//')

/**
 * Validates one event from the API (a trust boundary): a known kind, string ids and dates,
 * and a link inside the app.
 *
 * @param value - Parsed JSON of one stream event or inbox entry.
 * @returns The notification, or null when it must be ignored.
 * @feature US-POW-01, US-POW-04, F-26
 */
export function parseNotification(value: unknown): Notification | null {
  if (!isRecord(value)) {
    return null
  }
  const { id, kind, link, created_at: createdAt, retention_until: retentionUntil } = value
  const isKnownKind = NOTIFICATION_KINDS.some((known) => known === kind)
  const hasDates = typeof createdAt === 'string' && typeof retentionUntil === 'string'
  if (typeof id !== 'string' || !isKnownKind || !hasDates || !isInAppPath(link)) {
    return null
  }
  return value as unknown as Notification
}

/**
 * The text of a notification from `notifications.kind` in copy/pl.json. The contract carries
 * no step or message yet, so their placeholders are dropped instead of shown raw; a text left
 * empty falls back to the inbox title.
 *
 * @param notification - A validated notification.
 * @returns The Polish text to show in the toast and the inbox.
 * @feature US-POW-01, US-POW-04, F-26
 */
export function notificationText(notification: Notification): string {
  const filled = fill(t.notifications.kind[notification.kind], {
    case: notification.case_id ?? '',
  })
  const text = filled.replace(/:?\s*\{\w+\}/g, '').trim()
  return text || t.notifications.title
}
