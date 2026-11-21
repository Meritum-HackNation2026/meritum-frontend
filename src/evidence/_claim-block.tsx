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
import { DECISIVE_VERDICTS } from './constants'

/**
 * One claim of the card: verdict, AI explanation, the evidence timeline with „co zmieniłoby
 * werdykt” under it, strength, the warning about old evidence, what stays unresolved (folded into the
 * conflict note when sources disagree) and the manipulation technique, each its own section,
 * then the claim's actions.
 *
 * @param props.claim - One claim result from the API.
 * @param props.children - The claim's actions („Zgłoś błąd”).
 * @returns The claim block.
 * @feature US-SPR-04, US-SPR-05, US-ZRD-01, US-ZRD-02, US-ZRD-03, US-ZRD-04, US-ZRD-05, US-ZRD-06, US-ZRD-10, US-ZRD-11, US-MOD-06, F-17, F-24
 */
export function ClaimBlock({ claim, children }: { claim: ClaimResult; children: ReactNode }) {
  const conflict = isConflict(claim)
  const isDecisive = DECISIVE_VERDICTS.has(claim.verdict)
  // the conflict note already says what differs
  const isUnresolvedInNote = conflict && Boolean(claim.unresolved)
  return (
    <article className="border-b border-border/70 px-3.5 py-3 last-of-type:border-b-0">
      <VerdictSection claim={claim.claim} verdict={claim.verdict} />
      <ExplanationSection explanation={claim.explanation} />
      <EvidenceTimeline claim={claim} isConflict={conflict} isDecisive={isDecisive} />
      <WouldChangeSection codes={claim.would_change_verdict} />
      <StrengthSection claim={claim} />
      <ArchivalNote claim={claim} />
      {!isUnresolvedInNote && <UnresolvedSection unresolved={claim.unresolved} />}
      <TechniqueSection technique={claim.technique} />
      {/* fact-checker, incident and source-warning context (meritum-frontend#35) */}
      {children}
    </article>
  )
}
