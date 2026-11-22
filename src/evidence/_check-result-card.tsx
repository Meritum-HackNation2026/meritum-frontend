import { ChevronDown, ListChecks } from 'lucide-react'
import { useState } from 'react'
import { plural, t, VerdictBadge } from '@/components/meritum'
import { Accordion } from '@/components/ui/accordion'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { CheckResult, ClaimResult, Verdict } from '@/contracts/meritum'
import { EscalationLine, type Handoff, ReportError } from '@/moderation'
import { ClaimBlock } from './_claim-block'
import { SourceWarningNote } from './_context'
import { limitationTexts } from './_wording'

/**
 * Result of one check with verdicts (DESIGN_SYSTEM.md 6.4), on the page with no frame: the
 * neutral sanctions note, a summary of the claims with the count per verdict, the claims as an
 * expanded list (shadcn `Accordion`, every row open), then the hand-off line and one toggle for
 * the limits of the check and the AI line. Each part is its own component, so later sections
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
  const claims = result.claims ?? []
  return (
    <section
      aria-label={t.result.label}
      className="grid min-w-0 gap-6 text-foreground motion-safe:animate-rise"
    >
      <SourceWarningNote warning={result.source_warning} />
      <Summary claims={claims} />
      <Accordion
        type="multiple"
        defaultValue={claims.map(({ claim }) => claim)}
        className="@container -mx-4 grid gap-1"
      >
        {claims.map((claim, index) => (
          <ClaimBlock key={claim.claim} claim={claim}>
            <ReportError
              checkId={result.check_id}
              claimIndex={index}
              handoff={handoff}
              onSaved={setSavedCase}
            />
          </ClaimBlock>
        ))}
      </Accordion>
      <footer className="grid gap-4 text-small text-muted-foreground">
        <EscalationLine result={result} handoff={handoff} savedCase={savedCase} />
        <Limitations items={limitationTexts(result)} />
      </footer>
    </section>
  )
}

/** „Co sprawdziliśmy: n twierdzeń”, then each verdict once with how many claims got it. */
function Summary({ claims }: { claims: readonly ClaimResult[] }) {
  const counts = new Map<Verdict, number>()
  for (const { verdict } of claims) {
    counts.set(verdict, (counts.get(verdict) ?? 0) + 1)
  }
  return (
    <div className="grid gap-2">
      <h2 className="flex items-center gap-2 text-small font-semibold">
        <ListChecks aria-hidden="true" className="size-4 shrink-0" />
        {t.result.claims_title}: {plural(t.result.claims_count, claims.length)}
      </h2>
      <ul className="flex flex-wrap gap-x-3 gap-y-2">
        {[...counts].map(([verdict, count]) => (
          <li
            key={verdict}
            className="flex items-center gap-1.5 text-small text-muted-foreground tabular-nums"
          >
            {count} ×
            <VerdictBadge verdict={verdict} size="sm" explain />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The limits of the check and the AI line under one toggle, closed at first. */
function Limitations({ items }: { items: readonly string[] }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex cursor-pointer items-center gap-1.5 rounded-md font-semibold transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none">
        {t.result.limitations}
        {items.length > 0 && ` (${items.length})`}
        <ChevronDown
          aria-hidden="true"
          className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-2 pt-2 text-pretty">
        {items.length > 0 && (
          <ul className="list-disc pl-4">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        <p>{t.result.ai_disclosure}</p>
      </CollapsibleContent>
    </Collapsible>
  )
}
