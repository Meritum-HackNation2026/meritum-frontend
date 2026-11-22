import type { Stance, Validity, Verdict } from '@/contracts/meritum'
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
 * other metric from the API is dropped. The cast only undoes Object.keys widening to string[].
 *
 * @feature US-ZRD-12, F-29
 */
export const METRIC_KEYS = Object.keys(copy.method.metrics.names) as MetricKey[]

/**
 * Order of the citation groups on the evidence timeline: what supports the claim, what refutes
 * it, then context (DESIGN_SYSTEM.md 6.4).
 *
 * @feature US-ZRD-11, US-ZRD-04, F-17
 */
export const STANCE_ORDER: readonly Stance[] = ['supports', 'refutes', 'context']

/**
 * Validity of evidence whose age never makes it stale: a law in force, a page updated in place
 * and an event that happened once (ADR-25). Only such evidence never gets the old-source warning.
 *
 * @feature US-ZRD-05, US-ZRD-10, F-17
 */
export const AGE_EXEMPT_VALIDITY: ReadonlySet<Validity> = new Set<Validity>([
  'in_force',
  'updated_in_place',
  'past_event',
])

/**
 * Anchor of the source catalogue on „Jak działa Meritum”; the footer links to it.
 *
 * @feature US-ZRD-12, F-29
 */
export const CATALOG_SECTION_ID = 'katalog'

/**
 * Sections of „Jak działa Meritum” in page order, with their anchors and headings; the table of
 * contents in the rail lists them.
 *
 * @feature US-ZRD-12, F-29
 */
export const METHOD_SECTIONS = [
  { id: 'droga', title: copy.method.path.title },
  { id: 'odpowiedzi', title: copy.method.verdicts.title },
  { id: CATALOG_SECTION_ID, title: copy.method.catalog.title },
  { id: 'mierniki', title: copy.method.metrics.title },
  { id: 'zasady', title: copy.method.details.title },
] as const
