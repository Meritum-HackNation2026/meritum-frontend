import type { ReactNode } from "react"

import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { Citation, ClaimResult, Verdict } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { CitationItem } from "./citation-item"
import { fill, formatDate, t } from "./copy"
import { InfoButton } from "./hint"
import { StrengthMeter } from "./strength-meter"
import { VerdictBadge } from "./verdict-badge"

/** Verdicts that settle a claim; only these get a strength of evidence (ADR-05). */
const SETTLING: ReadonlySet<Verdict> = new Set(["confirmed", "false", "misleading"])

/**
 * One claim of the result list (DESIGN_SYSTEM.md 6.4): a row with the verdict label in a fixed column, the claim in
 * quotes as the trigger and its chevron; the label sits beside the trigger, not in it, so it can explain itself
 * (6.10). The row highlights under the pointer, with no rule lines. From 576 px of list width the open content lines
 * up with the claim text; narrower it stands under the label. Must render inside `Accordion` (the card's list).
 *
 * @param props.claim - The claim result from the API; its text is the accordion item's value.
 * @returns One accordion item.
 * @feature US-SPR-04, US-SPR-05, US-ZRD-01, US-ZRD-02, US-ZRD-03, F-17
 */
export function ClaimRow({ claim: c }: { claim: ClaimResult }) {
  const citations = c.citations ?? []
  const settles = SETTLING.has(c.verdict)
  const insufficient = c.verdict === "insufficient_evidence"
  const conflict = insufficient && citations.length > 0
  return (
    <AccordionItem value={c.claim} className="border-none">
      <div className="grid gap-x-4 gap-y-1.5 rounded-lg px-4 py-3 transition-colors duration-150 hover:bg-muted @xl:grid-cols-[14rem_1fr] @xl:items-center">
        <span className="flex">
          <VerdictBadge verdict={c.verdict} size="sm" explain />
        </span>
        <AccordionTrigger className="cursor-pointer items-center gap-4 py-0 font-sans text-body font-semibold text-pretty hover:no-underline">
          <span>
            <span className="sr-only">{t.result.claim}: </span>„{c.claim}”
          </span>
        </AccordionTrigger>
      </div>
      <AccordionContent className="grid gap-5 px-4 pt-2 pb-6 text-body @xl:pl-64 [&_p:not(:last-child)]:mb-0">
        <div>
          <h4 className="sr-only">{t.result.explanation}</h4>
          <p className="text-body text-pretty">{c.explanation}</p>
        </div>

        {conflict ? <Conflict claim={c} citations={citations} /> : citations.length > 0 && <Sources citations={citations} />}

        {settles && c.strength && <StrengthMeter strength={c.strength} claimDate={c.claim_date} claimDateSource={c.claim_date_source} />}

        {insufficient && !conflict && (
          <div>
            <h4 className="text-small font-semibold">{t.result.unresolved}</h4>
            {c.unresolved && <p className="text-small text-pretty">{c.unresolved}</p>}
          </div>
        )}

        {c.archival && <Note>{t.result.archival}</Note>}
        {c.incident && (
          <Note>
            {fill(c.incident.matched_on === "domain" ? t.result.incident_domain : t.result.incident, {
              title: c.incident.title,
              date: formatDate(c.incident.date),
            })}{" "}
            <a href={c.incident.url} target="_blank" rel="noopener noreferrer" className="text-[var(--host-link,var(--link))] underline underline-offset-3">
              {t.result.incident_link}
            </a>
          </Note>
        )}
        {c.technique && (
          <Note>
            Technika: {t.techniques[c.technique].name}
            <InfoButton text={t.techniques[c.technique].how_to_spot} label={`Jak rozpoznać: ${t.techniques[c.technique].name}`} />
          </Note>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}

function Sources({ citations }: { citations: Citation[] }) {
  return (
    <div>
      <h4 className="text-small font-semibold text-muted-foreground">{t.result.sources_title}</h4>
      <ul className="grid gap-1">
        {citations.map((x) => (
          <CitationItem key={x.source.id + x.fragment} citation={x} />
        ))}
      </ul>
    </div>
  )
}

/** Conflicting sources: no strength, one sentence on what differs, then both sides next to each other. */
function Conflict({ claim: c, citations }: { claim: ClaimResult; citations: Citation[] }) {
  return (
    <div>
      <p className="text-small text-pretty">{fill(t.result.conflict, { difference: c.unresolved ?? "" })}</p>
      <div className="mt-1 grid gap-x-4 sm:grid-cols-2">
        {(["supports", "refutes"] as const).map((side) => (
          <div key={side}>
            <h4 className="mt-2 text-meta font-semibold text-muted-foreground">{t.result.stance[side]}</h4>
            <ul className="grid gap-1">
              {citations
                .filter((x) => x.stance === side)
                .map((x) => (
                  <CitationItem key={x.source.id + x.fragment} citation={x} />
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Warnings and context lines: neutral, one per row, never red and never a verdict. */
function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("flex flex-wrap items-center gap-x-1.5 text-small text-pretty", className)}>{children}</p>
}
