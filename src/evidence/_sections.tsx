import { StrengthMeter, t, VerdictBadge } from '@/components/meritum'
import type {
  Claim,
  ClaimResult,
  Explanation,
  Technique,
  Unresolved,
  Verdict,
} from '@/contracts/meritum'
import { DECISIVE_VERDICTS } from './constants'

/**
 * The head of a claim (DESIGN_SYSTEM.md 6.4): the verdict word set large in its colour (red only
 * for „Fałszywe”), the first thing the card says, then the claim in quotes and the verdict's hint.
 *
 * @param props.claim - The claim text.
 * @param props.verdict - The claim's verdict.
 * @returns The verdict section.
 * @feature US-SPR-04, F-17
 */
export function VerdictSection({ claim, verdict }: { claim: Claim; verdict: Verdict }) {
  return (
    <>
      <h3 className="grid gap-1">
        <VerdictBadge verdict={verdict} size="lg" />
        <span className="font-semibold text-body text-pretty">
          <span className="sr-only">{t.result.claim}: </span>„<span>{claim}</span>”
        </span>
      </h3>
      <p className="mt-1 text-small text-muted-foreground">{t.verdict_hint[verdict]}</p>
    </>
  )
}

/**
 * The explanation in its own block, apart from the quotes. The AI line stands once, in the card's
 * footer or above the composer, never per claim (design-system#108).
 *
 * @param props.explanation - The claim's explanation.
 * @returns The explanation section.
 * @feature US-SPR-05, US-ZRD-06, F-17
 */
export function ExplanationSection({ explanation }: { explanation: Explanation }) {
  return (
    <div className="mt-3">
      <h4 className="sr-only">{t.result.explanation}</h4>
      <p className="text-body text-pretty">{explanation}</p>
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
      <h4 className="font-semibold text-small text-muted-foreground">{t.result.unresolved}</h4>
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
    <div className="mt-3 text-small text-pretty">
      <p className="font-semibold">{name}</p>
      <p>{howToSpot}</p>
    </div>
  )
}
