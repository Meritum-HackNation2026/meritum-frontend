import { StrengthMeter, t, VerdictBadge } from '@/components/meritum'
import { AccordionTrigger } from '@/components/ui/accordion'
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
 * The row of a claim in the result list (DESIGN_SYSTEM.md 6.4): the verdict label in a fixed
 * column, explaining itself on hover, focus and tap (red only for „Fałszywe”), beside the claim
 * in quotes as the accordion trigger; the label stays outside the trigger, so it can be a button
 * of its own. The row highlights under the pointer, with no rule lines.
 *
 * @param props.claim - The claim text.
 * @param props.verdict - The claim's verdict.
 * @returns The claim's row.
 * @feature US-SPR-04, F-17
 */
export function VerdictSection({ claim, verdict }: { claim: Claim; verdict: Verdict }) {
  return (
    <div className="grid gap-x-4 gap-y-1.5 rounded-lg px-4 py-3 transition-colors duration-150 hover:bg-muted motion-reduce:transition-none @xl:flex @xl:items-center @xl:*:last:flex-1">
      <span className="flex @xl:w-60 @xl:shrink-0">
        <VerdictBadge
          verdict={verdict}
          size="sm"
          explain
          className="max-w-full whitespace-normal"
        />
      </span>
      <AccordionTrigger className="cursor-pointer items-center gap-4 py-0 text-body font-semibold text-pretty hover:no-underline">
        <span>
          <span className="sr-only">{t.result.claim}: </span>„<span>{claim}</span>”
        </span>
      </AccordionTrigger>
    </div>
  )
}

/**
 * The explanation in its own block, apart from the quotes. The AI line stands once, in the card's
 * footer or above the composer, never per claim (design-system, issue 108).
 *
 * @param props.explanation - The claim's explanation.
 * @returns The explanation section.
 * @feature US-SPR-05, US-ZRD-06, F-17
 */
export function ExplanationSection({ explanation }: { explanation: Explanation }) {
  return (
    <div>
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
    <div>
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
    <div className="text-small text-pretty">
      <p className="font-semibold">{name}</p>
      <p>{howToSpot}</p>
    </div>
  )
}
