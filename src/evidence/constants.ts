import type { Verdict } from '@/contracts/meritum'
import copy from '@/copy/pl.json'
import type { MetricKey } from './types'

/**
 * Verdicts that settle a claim; only these show evidence strength (ADR-05).
 *
 * @feature US-ZRD-03, F-17
 */
export const DECISIVE_VERDICTS: ReadonlySet<Verdict> = new Set<Verdict>([
  'confirmed',
  'false',
  'misleading',
])

/**
 * Locale of numbers on the "Jak działa Meritum" page.
 *
 * @feature US-ZRD-12, F-29
 */
export const LOCALE = 'pl-PL'

/**
 * Most decimal places a metric value shows.
 *
 * @feature US-ZRD-12, F-29
 */
export const METRIC_FRACTION_DIGITS = 2

/**
 * Metrics the page can name, in the order of `method.metrics.names` in copy/pl.json; any
 * other metric from the API is dropped.
 *
 * @feature US-ZRD-12, F-29
 */
export const METRIC_KEYS = Object.keys(copy.method.metrics.names) as MetricKey[]
