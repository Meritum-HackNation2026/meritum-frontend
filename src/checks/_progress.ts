import type { AnalysisStatus, CheckResult } from '@/contracts/meritum'
import { VERIFY_STEP } from './constants'

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

/**
 * Whether the strip says the answer is a draft: citations are being verified right now.
 *
 * @param status - The latest streamed status.
 * @returns True while `verify_citations` is active.
 * @feature US-SPR-02, F-09
 */
export function isDraft(status: AnalysisStatus): boolean {
  return verifyStatus(status) === 'active'
}
