import { Info } from 'lucide-react'
import { MeritumLabel, t } from '@/components/meritum'
import type { CheckResult } from '@/contracts/meritum'

/** A result status that is not a verdict. */
type NonVerdictStatus = Exclude<CheckResult['status'], 'done'>

/**
 * The line under the state title: the text of the v4 failure code when the API sent one,
 * otherwise the status hint. Never the API `message` (meritum-worker#68).
 */
function stateLine(status: NonVerdictStatus, failureCode: CheckResult['failure_code']): string {
  if (status === 'technical_failure' && failureCode) {
    return t.failure_code[failureCode]
  }
  return t.status_hint[status]
}

/**
 * Card of a result that is not a verdict (DESIGN_SYSTEM.md 3 and 6.4): needs clarification,
 * out of scope or technical failure. A neutral icon, the state title and one plain line from
 * `copy/pl.json`; no verdict badge, claims or sources, so a failure never reads as a rating.
 *
 * @param props.status - The non-verdict status of the result.
 * @param props.failureCode - The v4 failure code of a technical failure, if any.
 * @returns The state card.
 * @feature US-SPR-06, F-18
 */
export function ResultState({
  status,
  failureCode,
}: {
  status: NonVerdictStatus
  failureCode?: CheckResult['failure_code']
}) {
  return (
    <section
      aria-label={t.result.label}
      className="min-w-0 rounded-lg border border-border bg-card text-card-foreground motion-safe:animate-rise"
    >
      <header className="flex items-center px-3.5 pt-3">
        <MeritumLabel />
      </header>
      <div className="flex items-start gap-2.5 px-3.5 pt-2.5 pb-3.5">
        <Info aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <h2 className="text-body font-bold">{t.status[status]}</h2>
          <p className="text-body text-pretty">{stateLine(status, failureCode)}</p>
        </div>
      </div>
    </section>
  )
}
