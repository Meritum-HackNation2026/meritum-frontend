import { CircleAlert } from 'lucide-react'
import { MeritumLabel, t } from '@/components/meritum'
import type { CheckResult } from '@/contracts/meritum'

/** A result status that is not a verdict. */
type NonVerdictStatus = Exclude<CheckResult['status'], 'done'>

/** The text of the reason code the API sent with this status, if the synced copy knows it. */
function codeText(status: NonVerdictStatus, codes: ReasonCodes): string | undefined {
  if (status === 'technical_failure' && codes.failureCode) return t.failure_code[codes.failureCode]
  if (status === 'out_of_scope' && codes.outOfScopeCode)
    return t.out_of_scope_code[codes.outOfScopeCode]
  return undefined
}

/** Reason codes of a non-verdict result: v4 failure code, v8 out-of-scope code. */
type ReasonCodes = {
  failureCode?: CheckResult['failure_code']
  outOfScopeCode?: CheckResult['out_of_scope_code']
}

/**
 * The line under the state title: the text of the reason code when the API sent one the copy
 * knows, otherwise the status hint. Never the API `message` (meritum-worker#68).
 */
function stateLine(status: NonVerdictStatus, codes: ReasonCodes): string {
  // a code newer than the synced copy has no text; the hint still says it is not a rating
  return codeText(status, codes) ?? t.status_hint[status]
}

/**
 * Card of a result that is not a verdict (DESIGN_SYSTEM.md 3 and 6.4): needs clarification,
 * out of scope or technical failure. A neutral icon, the state title and one plain line from
 * `copy/pl.json`; no verdict badge, claims or sources, so a failure never reads as a rating.
 *
 * @param props.status - The non-verdict status of the result.
 * @param props.failureCode - The v4 failure code of a technical failure, if any.
 * @param props.outOfScopeCode - The v8 code of what an out-of-scope result does not handle.
 * @param props.hint - A line that replaces the status hint, e.g. what recordings can be sent.
 * @returns The state card.
 * @feature US-SPR-06, F-18
 */
export function ResultState({
  status,
  hint,
  ...codes
}: ReasonCodes & {
  status: NonVerdictStatus
  hint?: string
}) {
  return (
    <section
      aria-label={t.result.label}
      className="min-w-0 rounded-lg border border-border bg-card text-card-foreground motion-safe:animate-rise"
    >
      <header className="flex items-center px-3.5 pt-3 in-data-reply:hidden">
        <MeritumLabel />
      </header>
      <div className="flex items-start gap-2.5 px-3.5 pt-2.5 pb-3.5">
        <CircleAlert
          aria-hidden="true"
          strokeWidth={1.5}
          className="mt-1 size-4 shrink-0 text-muted-foreground"
        />
        <div className="min-w-0">
          <h2 className="text-body font-bold">{t.status[status]}</h2>
          <p className="text-body text-pretty">{hint ?? stateLine(status, codes)}</p>
        </div>
      </div>
    </section>
  )
}
