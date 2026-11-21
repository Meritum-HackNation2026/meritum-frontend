/**
 * Endpoint that accepts a `CheckRequest` and starts a check (meritum-backend#16).
 *
 * @feature US-SPR-01, F-01
 */
export const CHECKS_ENDPOINT = '/api/v1/checks'

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
 * The five step statuses of `AnalysisStep` in the contract; a streamed event with any other is dropped.
 *
 * @feature US-SPR-02, F-09
 */
export const STEP_STATUSES: readonly string[] = ['pending', 'active', 'done', 'skipped', 'failed']
