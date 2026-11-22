import copy from '@/copy/pl.json'
import type { EvalRunStatus, ExportFormat } from './ports'

/**
 * Every run status, in the order of `evaluation.status` in copy/pl.json.
 *
 * @feature US-OBS-06, F-28
 */
export const EVAL_RUN_STATUSES = Object.keys(copy.evaluation.status) as EvalRunStatus[]

/**
 * The dataset name of the golden set (`evaluation.golden_set`).
 *
 * @feature US-OBS-06, F-28
 */
export const GOLDEN_SET = 'golden'

/**
 * How often the page reads the runs again while one is queued or running.
 *
 * @feature US-OBS-06, F-28
 */
export const EVAL_POLL_MS = 5000

/**
 * Locale of the numbers on the evaluation page.
 *
 * @feature US-OBS-06, F-28
 */
export const EVAL_LOCALE = 'pl-PL'

/**
 * Most decimal places a metric value shows, as on „Jak działa Meritum”.
 *
 * @feature US-OBS-06, F-28
 */
export const EVAL_FRACTION_DIGITS = 2

/**
 * How many finished runs the comparison takes; a further pick replaces the oldest one.
 *
 * @feature US-OBS-06, F-28
 */
export const COMPARED_RUNS = 2

/**
 * Case files the upload accepts (US-OBS-05): JSON or CSV.
 *
 * @feature US-OBS-05, F-28
 */
export const CASE_FILE_TYPES = '.json,.csv,application/json,text/csv'

/**
 * Formats of the export, in the order of `export.formats` in copy/pl.json.
 *
 * @feature US-OBS-03, F-36
 */
export const EXPORT_FORMATS = Object.keys(copy.export.formats) as ExportFormat[]

/**
 * Periods of the export in days, as `export.periods` in copy/pl.json offers them; the first is
 * the default (the API's own default is 7).
 *
 * @feature US-OBS-03, F-36
 */
export const EXPORT_PERIODS = Object.keys(copy.export.periods).map(Number)
