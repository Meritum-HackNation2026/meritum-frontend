import type { ClaimResult } from '@/contracts/meritum'
import {
  CitationsSection,
  ExplanationSection,
  StrengthSection,
  TechniqueSection,
  UnresolvedSection,
  VerdictSection,
} from './_sections'

/**
 * One claim of the card: verdict, AI explanation, citations, strength, what stays
 * unresolved and the manipulation technique, each its own section.
 *
 * @param props.claim - One claim result from the API.
 * @returns The claim block.
 * @feature US-SPR-04, US-SPR-05, US-ZRD-01, US-ZRD-02, US-ZRD-03, US-ZRD-06, F-17
 */
export function ClaimBlock({ claim }: { claim: ClaimResult }) {
  return (
    <article className="border-b border-border/70 px-3.5 py-3 last-of-type:border-b-0">
      <VerdictSection claim={claim.claim} verdict={claim.verdict} />
      <ExplanationSection explanation={claim.explanation} />
      <CitationsSection verdict={claim.verdict} citations={claim.citations ?? []} />
      <StrengthSection claim={claim} />
      {/* evidence timeline, archival evidence and source conflict (meritum-frontend#26) */}
      <UnresolvedSection unresolved={claim.unresolved} />
      <TechniqueSection technique={claim.technique} />
      {/* fact-checker, incident and source-warning context (meritum-frontend#35) */}
    </article>
  )
}
