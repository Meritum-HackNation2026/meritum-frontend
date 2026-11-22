import type { AnalysisStatus, CheckResult } from '@/contracts/meritum'
import { MAX_FAILED_READS, VERIFY_STEP } from './constants'
import type { ReadOutcome } from './ports'

function verifyStatus(status: AnalysisStatus) {
  return status.steps.find((step) => step.code === VERIFY_STEP)?.status
}

/**
 * The result the page may show: one with verdicts only after citations are verified (done or
 * skipped), one without verdicts (out of scope, clarify) at once; the same rule as the backend.
 *
 * @param status - The latest streamed status.
 * @returns The result to show, or null.
 * @feature US-SPR-02, F-09
 */
export function shownResult(status: AnalysisStatus): CheckResult | null {
  const { result } = status
  if (!result) {
    return null
  }
  const hasVerdicts = (result.claims?.length ?? 0) > 0
  const verify = verifyStatus(status)
  const isVerified = verify === 'done' || verify === 'skipped'
  return hasVerdicts && !isVerified ? null : result
}

type Next = 'again' | 'stop' | 'give_up'

/**
 * Whether the API reports a run that failed: a step `failed` and none waiting or running. A
 * check still in the queue reports only `receive` as done, so it does not count as failed.
 */
function hasFailed(status: AnalysisStatus): boolean {
  const isRunning = status.steps.some((s) => s.status === 'pending' || s.status === 'active')
  return !isRunning && status.steps.some((s) => s.status === 'failed')
}

/**
 * What follows a read: stop at a result, an unknown id or too many failed reads in a row; ask
 * again after a failed read; give up when the stream ended and the steps show a failed run
 * without a result, or after the last allowed read; otherwise ask again.
 *
 * @param outcome - The read's outcome.
 * @param failures - Failed reads in a row so far.
 * @param readsLeft - Reads still allowed.
 * @param streamEnded - Whether the progress stream has ended.
 * @returns What the page does next.
 * @feature US-SPR-02, F-09
 */
export function nextAfter(
  outcome: ReadOutcome,
  failures: number,
  readsLeft: number,
  streamEnded: boolean,
): Next {
  const hasResult = typeof outcome === 'object' && Boolean(outcome.status.result)
  if (hasResult || outcome === 'not_found' || failures >= MAX_FAILED_READS) {
    return 'stop'
  }
  if (typeof outcome === 'string') {
    return 'again'
  }
  const isFailed = streamEnded && hasFailed(outcome.status)
  return isFailed || readsLeft <= 0 ? 'give_up' : 'again'
}
