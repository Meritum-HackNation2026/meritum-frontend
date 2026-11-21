import type { Notification } from '@/contracts/meritum'

/**
 * Every `Notification.kind` of the contract, plus the end of an evaluation run; an event with
 * any other kind is ignored.
 *
 * shortcut: `eval_run_done` is added by hand until meritum-core#36 puts it in the contract;
 * drop the extra type on sync.
 *
 * @feature US-POW-01, US-POW-04, US-POW-05, F-26
 */
export const NOTIFICATION_KINDS: readonly (Notification['kind'] | 'eval_run_done')[] = [
  'check_progress',
  'check_done',
  'moderator_answer',
  'new_evidence',
  'case_assigned',
  'system',
  'eval_run_done',
]

/**
 * Days a notification is kept (`retention_until`), the same as a check record (ADR-13, ADR-29).
 *
 * @feature US-POW-04, F-26
 */
export const NOTIFICATION_RETENTION_DAYS = 30

/**
 * A path inside the app: one leading `/`, then no `/` or `\` right after it (browsers read
 * `//host` and `/\host` as another site) and no backslash, space or control character anywhere.
 *
 * @feature US-POW-01, F-26
 */
export const IN_APP_PATH = /^\/(?![/\\])[^\\\s\p{Cc}]*$/u
