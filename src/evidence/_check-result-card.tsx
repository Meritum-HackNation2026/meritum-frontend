import { useState } from 'react'
import { MeritumLabel, t } from '@/components/meritum'
import type { CheckResult } from '@/contracts/meritum'
import { EscalationLine, type Handoff, ReportError } from '@/moderation'
import { ClaimBlock } from './_claim-block'
import { SourceWarningNote } from './_context'
import { limitationTexts } from './_wording'

/**
 * Result card of one check with verdicts (DESIGN_SYSTEM.md 6.4): one block per claim, then
 * the neutral sanctions note above the claims and, after them, the limits of the check and the AI line. Each part is its own component, so later sections
 * add one component and one line here. Each claim has „Zgłoś błąd” and the footer the hand-off
 * line (`src/moderation`). Results that are not verdicts have their own
 * card in `src/checks` (`ResultState`). `message` is never shown: the limitations come from
 * `limitation_codes` through copy (the API's limitation texts only when it sent no codes).
 *
 * @param props.result - The check result from the API.
 * @param props.handoff - Hands claims to the moderators (the `src/api` adapter in the app).
 * @returns The result card.
 * @feature US-SPR-04, US-SPR-05, US-ZRD-01, US-ZRD-02, US-ZRD-03, US-ZRD-06, US-MOD-03, US-MOD-06, US-KOR-01, F-17, F-24, F-34
 */
export function CheckResultCard({ result, handoff }: { result: CheckResult; handoff: Handoff }) {
  // a case saved by „Zgłoś błąd” also ends the footer's recommendation
  const [savedCase, setSavedCase] = useState<string | null>(null)
  return (
    <section
      aria-label={t.result.label}
      className="min-w-0 rounded-lg border border-border bg-card text-card-foreground motion-safe:animate-rise"
    >
      <header className="flex items-center px-3.5 pt-3 in-data-reply:hidden">
        <MeritumLabel />
      </header>
      <SourceWarningNote warning={result.source_warning} />
      <h2 className="sr-only">{t.result.claims_title}</h2>
      {result.claims?.map((claim, index) => (
        <ClaimBlock key={claim.claim} claim={claim}>
          <ReportError
            checkId={result.check_id}
            claimIndex={index}
            handoff={handoff}
            onSaved={setSavedCase}
          />
        </ClaimBlock>
      ))}
      <footer className="mt-3 grid gap-1.5 border-t border-border px-3.5 pt-2.5 pb-3.5 text-meta text-muted-foreground">
        <EscalationLine result={result} handoff={handoff} savedCase={savedCase} />
        <Limitations items={limitationTexts(result)} />
        <p>{t.result.ai_disclosure}</p>
      </footer>
    </section>
  )
}

function Limitations({ items }: { items: readonly string[] }) {
  if (items.length === 0) {
    return null
  }
  return (
    <div>
      <p className="font-semibold">{t.result.limitations}</p>
      <ul className="list-disc pl-4">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
