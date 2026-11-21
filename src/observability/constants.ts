import copy from '@/copy/pl.json'
import type { EvalRunStatus } from './ports'

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
