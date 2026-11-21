import type { Notification } from '@/contracts/meritum'

/**
 * Every `Notification.kind` of the contract; an event with any other kind is ignored.
 *
 * @feature US-POW-01, US-POW-04, F-26
 */
export const NOTIFICATION_KINDS: readonly Notification['kind'][] = [
  'check_progress',
  'check_done',
  'moderator_answer',
  'new_evidence',
  'case_assigned',
  'system',
] as const

/**
 * Days a notification is kept (`retention_until`), the same as a check record (ADR-13, ADR-29).
 *
 * @feature US-POW-04, F-26
 */
export const NOTIFICATION_RETENTION_DAYS = 30
