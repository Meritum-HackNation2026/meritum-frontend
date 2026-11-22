import type { ClaimDate, ClaimDateSource, EvidenceStrength } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { fill, formatDate, t } from "./copy"
import { Explain } from "./explain"

const BARS = { strong: 3, moderate: 2, weak: 1 } as const

/**
 * "Siła podstawy" (6.4): three level bars and the word, in ink, never in a verdict colour. The pair is a label that
 * explains itself (6.10): its note gives `strength_hint` and the premises the level follows from (independent and
 * primary publishers, the newest source and the claim's date, agreement). Render only for settling verdicts; the
 * contract leaves `strength` null otherwise.
 *
 * @param props.strength - Level and premises from the API.
 * @param props.claimDate - The date the claim is about, if known.
 * @param props.claimDateSource - Where that date comes from.
 * @param props.className - Extra classes.
 * @returns The strength line.
 * @feature US-ZRD-03, US-ZRD-04, F-15, F-17
 */
export function StrengthMeter({
  strength,
  claimDate,
  claimDateSource,
  className,
}: {
  strength: EvidenceStrength
  claimDate?: ClaimDate | undefined
  claimDateSource?: ClaimDateSource | undefined
  className?: string
}) {
  const { level, premises: p } = strength
  const newest = p.newest_source_published_at
  const withClaimDate = newest && claimDate && claimDateSource
  const note = (
    <>
      <p>{t.strength_hint[level]}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 tabular-nums">
        <dt>{t.result.strength_facts.independent}</dt>
        <dd className="font-semibold">{p.independent_sources}</dd>
        <dt>{t.result.strength_facts.primary}</dt>
        <dd className="font-semibold">{p.primary_sources}</dd>
        {newest && !withClaimDate && (
          <>
            <dt>{t.result.strength_facts.newest}</dt>
            <dd className="font-semibold">{formatDate(newest)}</dd>
          </>
        )}
      </dl>
      {withClaimDate && (
        <p>
          {fill(t.result.newest, {
            source_date: formatDate(newest),
            claim_date: formatDate(claimDate),
            claim_date_source: t.result.claim_date_source[claimDateSource],
          })}
        </p>
      )}
      <p>{t.result.agreement[p.agreement]}</p>
    </>
  )
  return (
    <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted-foreground", className)}>
      {t.result.strength_title}
      <Explain text={note}>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="flex items-end gap-0.5">
            {[1, 2, 3].map((n) => (
              <span key={n} className={cn("w-1.5 rounded-sm", n <= BARS[level] ? "bg-foreground" : "bg-border")} style={{ height: 4 + n * 4 }} />
            ))}
          </span>
          <span className="font-semibold text-foreground">{t.strength[level]}</span>
        </span>
      </Explain>
    </p>
  )
}
