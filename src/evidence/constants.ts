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
