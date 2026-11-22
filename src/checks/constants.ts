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

/**
 * Seconds after which a live recording stops by itself: five seconds under `MAX_AUDIO_MINUTES`,
 * so the API's length check never refuses it for a few extra tenths of a second.
 *
 * @feature US-SPR-11, F-08
 */
export const RECORDING_LIMIT_SECONDS = MAX_AUDIO_MINUTES * 60 - 5

/**
 * Sample rate of a recording converted to WAV: speech needs no more, and ten minutes of 16-bit
 * mono stay near 19 MB, under `MAX_AUDIO_MB`.
 *
 * @feature US-SPR-11, F-08
 */
export const WAV_SAMPLE_RATE = 16000

/**
 * Recording types tried first with `MediaRecorder`: the API reads OGG Opus and M4A from the
 * bytes. M4A only with AAC: Chrome records plain `audio/mp4` as Opus in MP4, which
 * Speech-to-Text v2 refuses. A browser that offers neither is converted to WAV.
 *
 * @feature US-SPR-11, F-08
 */
export const NATIVE_RECORDING_TYPES = [
  { mime: 'audio/ogg;codecs=opus', extension: 'ogg' },
  { mime: 'audio/mp4;codecs=mp4a.40.2', extension: 'm4a' },
] as const

/**
 * Milliseconds between two reads of the recording clock and the sound level.
 *
 * @feature US-SPR-11, F-08
 */
export const RECORDING_TICK_MS = 100

/** Bytes before the samples of a WAV file (RIFF, fmt and data headers). @feature US-SPR-11, F-08 */
export const WAV_HEADER_BYTES = 44

/** Bytes of one 16-bit sample. @feature US-SPR-11, F-08 */
export const WAV_BYTES_PER_SAMPLE = 2

/** The WAV format code of uncompressed PCM. @feature US-SPR-11, F-08 */
export const WAV_PCM_FORMAT = 1

/** Bits of one WAV sample. @feature US-SPR-11, F-08 */
export const WAV_BITS = 16

/** Largest positive 16-bit sample. @feature US-SPR-11, F-08 */
export const WAV_INT16_MAX = 0x7fff

/** Magnitude of the most negative 16-bit sample. @feature US-SPR-11, F-08 */
export const WAV_INT16_MIN = 0x8000

/**
 * Classes of the pill buttons of the recording control („Nagraj”, „Zatrzymaj”).
 *
 * @feature US-SPR-11, F-08
 */
export const RECORDER_BUTTON =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-pill px-4 font-semibold transition-transform duration-150 ease-out-meritum active:scale-97 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

/**
 * The sign-in providers of the optional citizen account (backend#29), in the order shown.
 *
 * @feature US-SPR-10, F-31
 */
export const LOGIN_PROVIDERS = ['google', 'microsoft'] as const

/**
 * Largest image the API takes, in MB (MiB, as `IMAGE_MAX_MB` in meritum-backend: 413 above it);
 * shown in `form.image_limits`.
 *
 * @feature US-SPR-08, F-33
 */
export const MAX_IMAGE_MB = 10

/**
 * `MAX_IMAGE_MB` in bytes: a bigger file is refused before it is sent.
 *
 * @feature US-SPR-08, F-33
 */
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024

/**
 * Image formats the API reads from the bytes (any other file is 415), as named in
 * `form.image_limits` and `errors.image_format_unsupported`.
 *
 * @feature US-SPR-08, F-33
 */
export const IMAGE_FORMATS = ['PNG', 'JPEG', 'WebP'] as const

/**
 * `accept` of the image field: the system picker offers the three formats first; the API still
 * decides the format from the bytes.
 *
 * @feature US-SPR-08, F-33
 */
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp'
