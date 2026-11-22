import type { Verdict } from '@/contracts/meritum'
import type copy from '@/copy/pl.json'

/**
 * A metric of an evaluation run: a key of `method.metrics.names` in copy/pl.json.
 *
 * @feature US-OBS-06, F-28
 */
type EvalMetricKey = keyof typeof copy.method.metrics.names

/**
 * Measured values of a run; a metric the run did not measure is absent, never zero.
 *
 * @feature US-OBS-06, F-28
 */
export type EvalMetrics = Partial<Record<EvalMetricKey, number>>

/**
 * Where a run stands in the worker (`evaluation.status` in copy/pl.json).
 *
 * @feature US-OBS-06, F-28
 */
export type EvalRunStatus = keyof typeof copy.evaluation.status

/**
 * One evaluation run, as the list of runs shows it.
 *
 * shortcut: hand-written until meritum-core#36 adds EvalRun to the contracts and
 * meritum-backend#35 serves it; replace with the contract type on sync.
 *
 * @feature US-OBS-06, US-OBS-05, F-28
 */
export interface EvalRun {
  id: string
  status: EvalRunStatus
  /** `golden` for the golden set, otherwise the name of an uploaded case file. */
  dataset: string
  /** ISO 8601. */
  started_at: string
  /** ISO 8601; null while the run has not finished. */
  finished_at: string | null
  metrics: EvalMetrics
}

/**
 * One case of a run: its id in the case file and the verdict the run gave, null when the
 * check ended without one.
 *
 * @feature US-OBS-06, F-28
 */
export interface EvalCase {
  case_id: string
  verdict: Verdict | null
}

/**
 * Two runs side by side: each metric in both runs and the cases whose verdict changed.
 *
 * @feature US-OBS-06, F-28
 */
export interface EvalComparison {
  metrics: Partial<Record<EvalMetricKey, { a: number; b: number }>>
  changed_cases: { case_id: string; a: Verdict | null; b: Verdict | null }[]
}

/**
 * What a call that changes runs gave: done, or why not (`expired` session, `failed` API).
 *
 * @feature US-OBS-06, US-OBS-05, F-28
 */
export type EvalOutcome = 'done' | 'expired' | 'failed'

/**
 * The evaluation API of meritum-backend (backend#35). Adapters never throw.
 *
 * @feature US-OBS-06, US-OBS-05, F-28
 */
export interface EvalApi {
  /**
   * Reads the runs, newest first.
   *
   * @returns The runs; `expired` when the session ended, `no_access` without the role, null
   *   when the API cannot be read.
   */
  runs(): Promise<EvalRun[] | 'expired' | 'no_access' | null>
  /**
   * Reads the case results of one run.
   *
   * @param runId - The run.
   * @returns The cases, null when the API cannot be read.
   */
  cases(runId: string): Promise<EvalCase[] | null>
  /**
   * Starts a run in the worker.
   *
   * @param dataset - `golden`, or the id of an uploaded case file.
   * @returns Whether the run was queued.
   */
  start(dataset: string): Promise<EvalOutcome>
  /**
   * Uploads a case file (JSON or CSV) and starts a run on it.
   *
   * @param file - The file the analyst picked.
   * @returns Whether the file was saved and its run queued.
   */
  upload(file: File): Promise<EvalOutcome>
  /**
   * Compares two runs.
   *
   * @param a - The earlier run.
   * @param b - The later run.
   * @returns The comparison, null when the API cannot give it.
   */
  compare(a: string, b: string): Promise<EvalComparison | null>
}
