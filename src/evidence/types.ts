import type { CatalogEntry } from '@/contracts/meritum'
import type copy from '@/copy/pl.json'

/**
 * The fields of one source-catalogue entry that the "Jak działa Meritum" page shows.
 *
 * @feature US-ZRD-12, US-KOR-01, F-29
 */
export type CatalogRow = Pick<
  CatalogEntry,
  | 'domain'
  | 'publisher'
  | 'kind'
  | 'tier'
  | 'license'
  | 'qualified_because'
  | 'excluded'
  | 'exclusion_reason'
>

/**
 * A metric the page can name: a key of `method.metrics.names` in copy/pl.json.
 *
 * @feature US-ZRD-12, F-29
 */
export type MetricKey = keyof typeof copy.method.metrics.names

/**
 * Public summary of the last finished evaluation run on the golden set: its date, the
 * measured metrics only and the link to the bundle that reproduces it.
 *
 * shortcut: hand-written until meritum-core#36 adds EvalRun to the contracts and
 * meritum-backend#35 serves the public summary; replace with the contract type on sync.
 *
 * @feature US-ZRD-12, F-29
 */
export interface EvalRunSummary {
  /** When the run finished (ISO 8601). */
  finished_at: string
  /** Where the case files, addresses, fragments and corpus snapshot manifest are published. */
  bundle_url: string
  /** Measured values; a metric the run did not measure is absent, never zero. */
  metrics: Partial<Record<MetricKey, number>>
}
