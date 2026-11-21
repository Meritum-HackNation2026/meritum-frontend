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
