import { fill, t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import type { CheckResult } from '@/contracts/meritum'
import { focusOnMount, useHandoff } from './_handoff-state'
import type { Handoff } from './ports'

// shortcut: the recommendation is per check, the endpoint per claim; the first claim without
// enough evidence is the one a recommendation comes from, else the first claim. Upgrade when the
// contract says which claim an Escalation belongs to.
function recommendedClaim(result: CheckResult): number {
  const index = result.claims?.findIndex((claim) => claim.verdict === 'insufficient_evidence')
  return index === undefined || index < 0 ? 0 : index
}

// created and updated read the same, so the message never tells whether someone else asked
function passedText(caseId: string): string {
  return fill(t.escalation.created, { case: caseId })
}

/**
 * The hand-off line of the result card, computed by the server on every request
 * (`CheckResult.escalation`): a saved case (created or joined) shows its number; a
 * recommendation shows that the case suits a moderator, that it was not passed on yet, and
 * „Przekaż moderatorom”. A case number appears only after the API saved the case; a failed save
 * shows the error and keeps the recommendation. No escalation, no line.
 *
 * @param props.result - The check result from the API.
 * @param props.handoff - Sends the hand-off (the `src/api` adapter in the app).
 * @returns The hand-off line, or null.
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
 */
export function EscalationLine({ result, handoff }: { result: CheckResult; handoff: Handoff }) {
  const { caseId, error, pending, send } = useHandoff(() =>
    handoff.escalate(result.check_id, recommendedClaim(result)),
  )
  const escalation = result.escalation
  if (!escalation) {
    return null
  }
  if (caseId) {
    return (
      <p ref={focusOnMount} tabIndex={-1} className="text-small text-foreground">
        {passedText(caseId)}
      </p>
    )
  }
  if (escalation.state !== 'recommended') {
    // a saved case without its number shows nothing rather than a number or a promise
    return escalation.case_id ? (
      <p className="text-small text-foreground">{passedText(escalation.case_id)}</p>
    ) : null
  }
  return (
    <div className="grid justify-items-start gap-2">
      <p className="text-small text-foreground text-pretty">{t.escalation.recommended}</p>
      <Button type="button" variant="outline" aria-disabled={pending} onClick={send}>
        {t.result.escalate}
      </Button>
      {error && (
        <p role="alert" className="text-small text-foreground text-pretty">
          {error}
        </p>
      )}
    </div>
  )
}
