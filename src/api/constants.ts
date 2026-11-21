import type { UploadOutcome } from '@/checks'
import type { AnalysisStep } from '@/contracts/meritum'

/**
 * Endpoint that accepts a `CheckRequest` and starts a check (meritum-backend#16).
 *
 * @feature US-SPR-01, F-01
 */
export const CHECKS_ENDPOINT = '/api/v1/checks'

/**
 * Public summary of the last finished evaluation run on the golden set, without sign-in
 * (meritum-backend#35); 404 while there is no finished run.
 *
 * @feature US-ZRD-12, F-29
 */
export const LATEST_RUN_ENDPOINT = '/api/v1/eval/runs/latest'

/**
 * How long the page waits for the last-run summary before showing it has no run; the route
 * loader holds the page until then.
 *
 * @feature US-ZRD-12, F-29
 */
export const LATEST_RUN_TIMEOUT_MS = 5000

/**
 * Header carrying the random browser session id; the same name in the backend and the extension.
 *
 * @feature US-SPR-01, F-21
 */
export const SESSION_HEADER = 'X-Meritum-Session'

/**
 * sessionStorage key of the random session id, so it lives as long as the browser tab.
 *
 * @feature US-SPR-01, F-21
 */
export const SESSION_STORAGE_KEY = 'meritum.session'

/**
 * HTTP status of the API rate limit; shown as `errors.rate_limited`, never as a verdict.
 *
 * @feature US-SPR-01, F-01
 */
export const HTTP_TOO_MANY_REQUESTS = 429

/**
 * The twelve step codes of `AnalysisStep` in the contract; `tsc` fails when the contract adds or
 * drops one. A streamed event with any other code is dropped.
 *
 * @feature US-SPR-02, F-09
 */
export const STEP_CODES = {
  receive: true,
  fetch_url: true,
  transcribe_audio: true,
  screen_injection: true,
  extract_claims: true,
  search_corpus: true,
  search_web: true,
  search_fact_checks: true,
  assess_evidence: true,
  verify_citations: true,
  write_answer: true,
  save_record: true,
} as const satisfies Record<AnalysisStep['code'], true>

/**
 * The five step statuses of `AnalysisStep` in the contract; `tsc` fails when the contract adds or
 * drops one. A streamed event with any other status is dropped.
 *
 * @feature US-SPR-02, F-09
 */
export const STEP_STATUSES = {
  pending: true,
  active: true,
  done: true,
  skipped: true,
  failed: true,
} as const satisfies Record<AnalysisStep['status'], true>

/**
 * Notifications of this session (meritum-backend#27): `GET` the inbox, `DELETE` all of them,
 * `/stream` for server-sent events and `/{id}/read` to mark one as read.
 *
 * @feature US-POW-01, US-POW-04, F-26
 */
export const NOTIFICATIONS_ENDPOINT = '/api/v1/notifications'

/**
 * Query parameter carrying the session id on the notification stream, because `EventSource`
 * cannot send the session header.
 *
 * @feature US-POW-01, F-26
 */
export const SESSION_QUERY_PARAM = 'session'

/**
 * HTTP status of GET /api/v1/checks/{id} for an unknown check id.
 *
 * @feature US-SPR-01, F-01
 */
export const HTTP_NOT_FOUND = 404

/**
 * HTTP status of a staff endpoint called without a session.
 *
 * @feature US-MOD-05, F-25
 */
export const HTTP_UNAUTHORIZED = 401

/**
 * HTTP status of a staff endpoint called by an account without a role.
 *
 * @feature US-MOD-05, F-25
 */
export const HTTP_FORBIDDEN = 403

/**
 * Header that repeats the session's CSRF token on state-changing staff requests (backend#15).
 *
 * @feature US-MOD-05, F-25
 */
export const CSRF_HEADER = 'X-CSRF-Token'

/**
 * Refusals of POST /api/v1/audio by `message_key` (meritum-backend's README: 413
 * `errors.audio_too_large`, 422 `errors.audio_too_long`, 415
 * `status_hint.out_of_scope_audio_format`); a refusal with another key is `busy`.
 *
 * @feature US-SPR-11, F-08
 */
export const AUDIO_REFUSALS = {
  'errors.audio_too_large': 'audio_too_large',
  'errors.audio_too_long': 'audio_too_long',
  'status_hint.out_of_scope_audio_format': 'unsupported_format',
} as const satisfies Record<string, UploadOutcome>

/**
 * `message_key` of a 429 from POST /api/v1/audio once the daily recording limit is used up; any
 * other 429 is the per-minute limit.
 *
 * @feature US-SPR-11, F-08
 */
export const DAILY_LIMIT_KEY = 'errors.rate_limited_daily'

/**
 * Content type sent with a recording the browser could not type; the API reads the format from
 * the bytes anyway.
 *
 * @feature US-SPR-11, F-08
 */
export const UNKNOWN_AUDIO_TYPE = 'application/octet-stream'
