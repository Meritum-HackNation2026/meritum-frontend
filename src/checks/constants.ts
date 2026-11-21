import type { AnalysisStep } from '@/contracts/meritum'

/**
 * Days a check record is kept before it is deleted (ADR-13); shown next to the form.
 *
 * @feature US-BEZ-05, F-20
 */
export const RETENTION_DAYS = 30

/**
 * Shortest text the form accepts; the design-system `toRequest()` enforces it with `errors.empty`.
 *
 * @feature US-SPR-01, F-01
 */
export const MIN_TEXT_CHARS = 3

/**
 * Longest text the form accepts: `maxLength` of `CheckRequest.text` in the contract.
 *
 * @feature US-SPR-01, F-01
 */
export const MAX_TEXT_CHARS = 4000

/**
 * The step after which a streamed answer may show verdicts (ADR-20): citations are verified.
 *
 * @feature US-SPR-02, F-09
 */
export const VERIFY_STEP = 'verify_citations'

/**
 * The strip of an accepted check before the first streamed status: the request was received.
 *
 * @feature US-SPR-02, F-09
 */
export const RECEIVED_STEPS: readonly AnalysisStep[] = [{ code: 'receive', status: 'done' }]

/**
 * Pause between two reads of a running check on the result page; the API itself waits a moment
 * for new steps before it answers.
 *
 * @feature US-SPR-01, F-01
 */
export const POLL_INTERVAL_MS = 1500
