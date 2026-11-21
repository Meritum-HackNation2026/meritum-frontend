import type { ClaimDate, ClaimDateSource, EvidenceStrength } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { fill, formatDate, t } from "./copy"

const BARS = { strong: 3, moderate: 2, weak: 1 } as const

/**
 * "Siła podstawy": a word and three level bars in ink, never in a verdict colour, with the premises it follows from.
 * Render only for settling verdicts; the contract leaves `strength` null otherwise.
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
  return (
    <div className={cn("grid gap-1", className)}>
      <p className="flex items-center gap-2 text-small font-semibold">
        {t.result.strength_title}: {t.strength[level]}
        <span aria-hidden="true" className="flex items-end gap-0.5">
          {[1, 2, 3].map((n) => (
            <span key={n} className={cn("w-1 rounded-[1px]", n <= BARS[level] ? "bg-foreground" : "bg-border")} style={{ height: 4 + n * 3 }} />
          ))}
        </span>
      </p>
      <p className="text-small text-muted-foreground text-pretty">
        {fill(t.result.premises, {
          independent: p.independent_sources,
          primary: p.primary_sources,
          agreement: t.result.agreement[p.agreement],
        })}
        {p.newest_source_published_at && claimDate && claimDateSource && (
          <>
            {" "}
            {fill(t.result.newest, {
              source_date: formatDate(p.newest_source_published_at),
              claim_date: formatDate(claimDate),
              claim_date_source: t.result.claim_date_source[claimDateSource],
            })}
          </>
        )}
      </p>
    </div>
  )
}
