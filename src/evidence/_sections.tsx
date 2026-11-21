import { CitationItem, StrengthMeter, t, VerdictBadge } from '@/components/meritum'
import type {
  Citation,
  ClaimResult,
  Explanation,
  Technique,
  Unresolved,
  Verdict,
} from '@/contracts/meritum'
import { DECISIVE_VERDICTS } from './constants'

/**
 * The verdict as a word on a badge in its colour (red only for „Fałszywe”) and its hint.
 *
 * @param props.verdict - The claim's verdict.
 * @returns The verdict section.
 * @feature US-SPR-04, F-17
 */
export function VerdictSection({ verdict }: { verdict: Verdict }) {
  return (
    <div className="mt-1.5">
      <VerdictBadge verdict={verdict} />
      <p className="mt-1 text-small text-muted-foreground">{t.verdict_hint[verdict]}</p>
    </div>
  )
}

/**
 * The AI-written explanation in its own block, apart from the quotes, with the AI note.
 *
 * @param props.explanation - The claim's explanation.
 * @returns The explanation section.
 * @feature US-SPR-05, US-ZRD-06, F-17
 */
export function ExplanationSection({ explanation }: { explanation: Explanation }) {
  return (
    <section aria-label={t.result.explanation} className="mt-2.5">
      <p className="text-body text-pretty">{explanation}</p>
      <p className="mt-1 text-meta text-muted-foreground">{t.result.explanation_hint}</p>
    </section>
  )
}

/**
 * Verbatim quotes, each with title, publisher, date and link taken from `Citation.source`.
 *
 * @param props.citations - The claim's citations; nothing renders when there are none.
 * @returns The citations section, or null.
 * @feature US-ZRD-01, US-ZRD-02, F-17
 */
export function CitationsSection({ citations }: { citations: readonly Citation[] }) {
  if (citations.length === 0) {
    return null
  }
  return (
    <div className="mt-3">
      <h4 className="font-semibold text-meta text-muted-foreground">{t.result.sources_title}</h4>
      <ul className="divide-y divide-border/70">
        {citations.map((citation) => (
          <CitationItem key={citation.source.id + citation.fragment} citation={citation} />
        ))}
      </ul>
    </div>
  )
}

/**
 * Strength of the evidence in ink with three level bars and its premises, for settling
 * verdicts only.
 *
 * @param props.claim - The claim result; its verdict, strength and claim date are read.
 * @returns The strength section, or null.
 * @feature US-ZRD-03, F-17
 */
export function StrengthSection({ claim }: { claim: ClaimResult }) {
  const isDecisive = DECISIVE_VERDICTS.has(claim.verdict)
  if (!(isDecisive && claim.strength)) {
    return null
  }
  return (
    <StrengthMeter
      className="mt-2"
      strength={claim.strength}
      claimDate={claim.claim_date}
      claimDateSource={claim.claim_date_source}
    />
  )
}

/**
 * What could not be established for the claim.
 *
 * @param props.unresolved - The open question, or null.
 * @returns The unresolved section, or null.
 * @feature US-SPR-05, F-17
 */
export function UnresolvedSection({ unresolved }: { unresolved?: Unresolved | undefined }) {
  if (!unresolved) {
    return null
  }
  return (
    <div className="mt-2.5">
      <h4 className="font-semibold text-meta text-muted-foreground">{t.result.unresolved}</h4>
      <p className="text-small text-pretty">{unresolved}</p>
    </div>
  )
}

/**
 * The manipulation technique's name and one „how to spot it” sentence from copy/pl.json.
 *
 * @param props.technique - The technique code, if any.
 * @returns The technique section, or null.
 * @feature US-SPR-04, F-17
 */
export function TechniqueSection({ technique }: { technique?: Technique | undefined }) {
  if (!technique) {
    return null
  }
  const { name, how_to_spot: howToSpot } = t.techniques[technique]
  return (
    <div className="mt-2.5 border-t border-border/70 pt-2 text-small text-pretty">
      <p className="font-semibold">{name}</p>
      <p>{howToSpot}</p>
    </div>
  )
}
