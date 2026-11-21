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
