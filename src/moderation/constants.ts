/**
 * Longest justification of „Zgłoś błąd” the API reads (`JUSTIFICATION_INPUT_MAX_CHARS` in
 * meritum-backend); it masks it before anything is stored.
 *
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
 */
export const MAX_JUSTIFICATION_CHARS = 4000
