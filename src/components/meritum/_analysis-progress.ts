import type { AnalysisStep } from "@/contracts/meritum"

/**
 * Where a check stands, for the bar and the "Krok n z m" counter of `AnalysisSteps`.
 *
 * @feature US-SPR-02, F-09
 */
export interface AnalysisProgress {
  /** The step the citizen is on: one past the finished steps; parallel steps share it. */
  step: number
  /** Steps the check runs: every step except the skipped ones. */
  of: number
  /** Share of `of` that is finished (done or failed), 0 to 100. */
  percent: number
  /** Steps in progress, in workflow order; several while the searches run in parallel. */
  active: AnalysisStep[]
}

/**
 * Counts progress from the workflow steps. A skipped step is not work the check does, so it leaves
 * both the count and the total; a failed step is passed, so it counts as finished. Three done steps
 * and three parallel searches out of nine give step 4 of 9 and a third of the bar.
 *
 * @param steps - `AnalysisStatus.steps`, in workflow order.
 * @returns The counter, the bar value and the steps in progress.
 * @feature US-SPR-02, F-09
 */
export function analysisProgress(steps: readonly AnalysisStep[]): AnalysisProgress {
  const counted = steps.filter((s) => s.status !== "skipped")
  const finished = counted.filter((s) => s.status === "done" || s.status === "failed").length
  const of = counted.length
  return {
    step: Math.min(finished + 1, of),
    of,
    percent: of === 0 ? 0 : (finished / of) * 100,
    active: steps.filter((s) => s.status === "active"),
  }
}
