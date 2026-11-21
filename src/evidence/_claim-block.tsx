import type { ReactNode } from 'react'
import type { ClaimResult } from '@/contracts/meritum'
import { isConflict } from './_chain'
import { ArchivalNote, WouldChangeSection } from './_chain-sections'
import {
  ExplanationSection,
  StrengthSection,
  TechniqueSection,
  UnresolvedSection,
  VerdictSection,
} from './_sections'
import { EvidenceTimeline } from './_timeline'

/**
 * One claim of the card: verdict, AI explanation, the evidence timeline, strength, the
 * warning about old evidence, „co zmieniłoby werdykt”, what stays unresolved (folded into the
 * conflict note when sources disagree) and the manipulation technique, each its own section,
 * then the claim's actions.
 *
 * @param props.claim - One claim result from the API.
 * @param props.children - The claim's actions („Zgłoś błąd”).
 * @returns The claim block.
 * @feature US-SPR-04, US-SPR-05, US-ZRD-01, US-ZRD-02, US-ZRD-03, US-ZRD-04, US-ZRD-05, US-ZRD-06, US-ZRD-10, US-ZRD-11, US-MOD-06, F-17, F-24
 */
export function ClaimBlock({ claim, children }: { claim: ClaimResult; children: ReactNode }) {
  return (
    <article className="border-b border-border/70 px-3.5 py-3 last-of-type:border-b-0">
      <VerdictSection claim={claim.claim} verdict={claim.verdict} />
      <ExplanationSection explanation={claim.explanation} />
      <EvidenceTimeline claim={claim} />
      <StrengthSection claim={claim} />
      <ArchivalNote claim={claim} />
      <WouldChangeSection codes={claim.would_change_verdict} />
      {!isConflict(claim) && <UnresolvedSection unresolved={claim.unresolved} />}
      <TechniqueSection technique={claim.technique} />
      {/* fact-checker, incident and source-warning context (meritum-frontend#35) */}
      {children}
    </article>
  )
}
