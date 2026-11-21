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
