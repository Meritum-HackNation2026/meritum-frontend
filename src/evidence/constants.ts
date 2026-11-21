import type { Verdict } from '@/contracts/meritum'

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
 * Locale of dates and numbers on the "Jak działa Meritum" page.
 *
 * @feature US-ZRD-12, F-29
 */
export const LOCALE = 'pl-PL'

/**
 * Time zone of the evaluation run date: the team and the app are in Poland.
 *
 * @feature US-ZRD-12, F-29
 */
export const TIME_ZONE = 'Europe/Warsaw'

/**
 * Most decimal places a metric value shows.
 *
 * @feature US-ZRD-12, F-29
 */
export const METRIC_FRACTION_DIGITS = 2
