import type { ReactNode } from 'react'
import { AccordionContent, AccordionItem } from '@/components/ui/accordion'
import type { ClaimResult } from '@/contracts/meritum'
import { isConflict } from './_chain'
import { ArchivalNote, WouldChangeSection } from './_chain-sections'
import { ClaimReviewPremises, ContextSection } from './_context'
import {
  ExplanationSection,
  StrengthSection,
  TechniqueSection,
  UnresolvedSection,
  VerdictSection,
} from './_sections'
import { EvidenceTimeline } from './_timeline'

/**
 * One claim of the result list, open from the start: the row with its verdict and the claim
 * (`VerdictSection`), then the AI explanation, the evidence timeline with „co zmieniłoby
 * werdykt” under it, strength, the warning about old evidence, what stays unresolved (folded into the
 * conflict note when sources disagree) and the manipulation technique, each its own section,
 * then the claim's actions. Fact-checkers' ratings that back the verdict stand under the timeline.
 *
 * @param props.claim - One claim result from the API.
 * @param props.children - The claim's actions („Zgłoś błąd”).
 * Must render inside the card's `Accordion`.
 *
 * @returns The claim block.
 * @feature US-SPR-04, US-SPR-05, US-ZRD-01, US-ZRD-02, US-ZRD-03, US-ZRD-04, US-ZRD-05, US-ZRD-06, US-ZRD-10, US-ZRD-11, US-MOD-06, US-ZRD-07, US-ZRD-08, F-11, F-14, F-17, F-24
 */
export function ClaimBlock({ claim, children }: { claim: ClaimResult; children: ReactNode }) {
  const conflict = isConflict(claim)
  // the conflict note already says what differs
  const isUnresolvedInNote = conflict && Boolean(claim.unresolved)
  return (
    <AccordionItem value={claim.claim} className="border-none" asChild>
      <article>
        <VerdictSection claim={claim.claim} verdict={claim.verdict} />
        <AccordionContent className="grid gap-4 px-4 pt-2 pb-6 text-body @xl:pl-64 [&_p:not(:last-child)]:mb-0">
          <ExplanationSection explanation={claim.explanation} />
          <EvidenceTimeline claim={claim} isConflict={conflict} />
          <ClaimReviewPremises premises={claim.claim_review_premises} />
          <WouldChangeSection codes={claim.would_change_verdict} />
          <StrengthSection claim={claim} />
          <ArchivalNote claim={claim} />
          {!isUnresolvedInNote && <UnresolvedSection unresolved={claim.unresolved} />}
          <TechniqueSection technique={claim.technique} />
          <ContextSection claim={claim} />
          {children}
        </AccordionContent>
      </article>
    </AccordionItem>
  )
}
