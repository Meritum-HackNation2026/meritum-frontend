import type { EvalRunSummary } from './types'

/**
 * Reads the public summary of the last finished evaluation run on the golden set.
 *
 * @feature US-ZRD-12, F-29
 */
export interface LatestRunSource {
  /**
   * Returns the last finished run; never throws, a failure counts as no run.
   *
   * @returns The summary, or null when there is no finished run or it cannot be read.
   */
  latestRun(): Promise<EvalRunSummary | null>
}
