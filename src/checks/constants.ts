import type { AnalysisStep, CheckResult } from '@/contracts/meritum'

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
 * Longest link the form accepts: `maxLength` of `CheckRequest.url` in the contract.
 *
 * @feature US-SPR-01, F-01
 */
export const MAX_URL_CHARS = 2083

/**
 * Link schemes the form accepts (`http`, `https`); any other scheme is `errors.invalid_url`.
 *
 * @feature US-SPR-01, F-01
 */
export const URL_PROTOCOLS = /^https?$/

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

/**
 * Failed reads in a row after which the result page stops asking the API; the message stays.
 *
 * @feature US-SPR-01, F-01
 */
export const MAX_FAILED_READS = 5

/**
 * Most reads of one check before the result page gives up with the technical failure line: a
 * check whose workflow failed has no result and would otherwise be read forever (about 3 min).
 *
 * @feature US-SPR-01, F-01
 */
export const MAX_READS = 120

/**
 * sessionStorage key holding this tab's checked results, newest first (ADR-13): the history
 * under the form lives as long as the browser tab.
 *
 * @feature US-SPR-09, US-BEZ-05, F-01, F-20
 */
export const HISTORY_STORAGE_KEY = 'meritum.history'

/**
 * sessionStorage key of the questions this tab sent, in the order sent, so the conversation can
 * show the citizen's own words above each answer; it lives as long as the history.
 *
 * @feature US-SPR-01, US-SPR-09, F-01
 */
export const QUESTIONS_STORAGE_KEY = 'meritum.questions'

/**
 * The four statuses of `CheckResult` in the contract; `tsc` fails when the contract adds or drops
 * one. A history entry with any other status is not shown.
 *
 * @feature US-SPR-09, F-01
 */
export const RESULT_STATUSES = {
  done: true,
  needs_clarification: true,
  out_of_scope: true,
  technical_failure: true,
} as const satisfies Record<CheckResult['status'], true>

/**
 * Largest recording the API takes, in MB (MiB, as `MAX_AUDIO_BYTES` in meritum-backend's README:
 * 413 `errors.audio_too_large` above it); shown in `form.audio_limits`.
 *
 * @feature US-SPR-11, F-08
 */
export const MAX_AUDIO_MB = 20

/**
 * `MAX_AUDIO_MB` in bytes: a bigger file is refused before it is sent.
 *
 * @feature US-SPR-11, F-08
 */
export const MAX_AUDIO_BYTES = MAX_AUDIO_MB * 1024 * 1024

/**
 * Longest recording the API takes, in minutes (422 `errors.audio_too_long` above it, as in
 * meritum-backend's README); only the API can measure it, the form shows it in the limits.
 *
 * @feature US-SPR-11, F-08
 */
export const MAX_AUDIO_MINUTES = 10

/**
 * Recording formats the API reads from the bytes (OGG Opus, MP3, M4A, WAV; any other file is
 * 415, out of scope), as named in `form.audio_limits`.
 *
 * @feature US-SPR-11, F-08
 */
export const AUDIO_FORMATS = ['OGG', 'MP3', 'M4A', 'WAV'] as const

/**
 * `accept` of the file field: the system picker offers audio files first; the API still decides
 * the format from the bytes.
 *
 * @feature US-SPR-11, F-08
 */
export const AUDIO_ACCEPT = 'audio/*,.ogg,.opus,.mp3,.m4a,.wav'

/**
 * Id of the transcription service in the processor register of copy/privacy.json; the
 * recording's notes fill `form.audio_provider` with its name and region.
 *
 * @feature US-SPR-11, F-08
 */
export const TRANSCRIBER_ID = 'speech_to_text'
