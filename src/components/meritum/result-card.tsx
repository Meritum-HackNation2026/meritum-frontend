import { BookOpenIcon, ChevronDownIcon, FlagIcon, ListChecksIcon } from "lucide-react"

import { Accordion } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { CheckResult, ClaimResult, Verdict } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { ClaimRow } from "./claim-row"
import { fill, plural, t } from "./copy"
import { MeritumLabel } from "./meritum-mark"
import { VerdictBadge } from "./verdict-badge"

/**
 * Result card (DESIGN_SYSTEM.md 6.4): a summary of the claims and their verdicts, then a list of claims on shadcn
 * `Accordion` with every row open, then one toggle for the limitations and the AI note, the escalation state and
 * the actions. On the web page the result has no frame; under a platform skin (`data-host`) it gets the card
 * background, a 1 px border and the host radius. A non-verdict status (clarify, out of scope, technical failure)
 * gets an icon and a line of text, never a badge. `message` is never shown: the status line and the limitations
 * come from contract codes through copy/pl.json (the API's limitation texts only when it sent no codes).
 *
 * @param props.result - The check result from the API.
 * @param props.onReportError - Opens the error report; without it the „Zgłoś błąd” button is left out.
 * @param props.howItWorksHref - Link of the „Jak działa Meritum” page; without it the button is left out.
 * @param props.className - Extra classes for the card.
 * @returns The result section.
 * @feature US-SPR-04, US-SPR-05, US-ZRD-01, US-ZRD-02, US-ZRD-03, F-17
 */
export function ResultCard({
  result,
  onReportError,
  howItWorksHref,
  className,
}: {
  result: CheckResult
  onReportError?: () => void
  howItWorksHref?: string
  className?: string
}) {
  const claims = result.claims ?? []
  return (
    <section
      aria-label="Meritum: wynik sprawdzenia"
      className={cn(
        "animate-rise grid min-w-0 gap-4 border border-transparent in-data-host:border-border in-data-reply:border-transparent bg-[var(--host-card,var(--card))] font-[family-name:var(--host-font,var(--font-sans))] text-card-foreground",
        "rounded-[var(--host-radius,var(--radius))]",
        className,
      )}
    >
      <header className="flex items-center px-4 pt-3 in-data-reply:hidden">
        <MeritumLabel />
      </header>

      {result.status === "done" ? (
        <>
          {result.source_warning && (
            <p className="flex flex-wrap items-center gap-x-1.5 px-4 text-small text-pretty">
              {fill(t.source_warning.eu_sanctioned_entity, { entity: result.source_warning.entity })}{" "}
              <a href={result.source_warning.basis_url} target="_blank" rel="noopener noreferrer" className="text-[var(--host-link,var(--link))] underline underline-offset-3">
                {t.source_warning.basis_link}
              </a>
            </p>
          )}
          <Summary claims={claims} />
          <Accordion type="multiple" defaultValue={claims.map((c) => c.claim)} className="@container grid gap-1">
            {claims.map((c) => (
              <ClaimRow key={c.claim} claim={c} />
            ))}
          </Accordion>
        </>
      ) : (
        <div className="flex items-start gap-2.5 px-4">
          <StatusIcon />
          <div>
            <h2 className="font-sans text-body font-bold">{t.status[result.status]}</h2>
            <p className="text-body text-pretty">{statusText(result)}</p>
          </div>
        </div>
      )}

      <footer className="grid gap-4 px-4 pb-4 text-small text-muted-foreground">
        {result.escalation && (
          <p className="text-foreground">
            {result.escalation.state === "recommended"
              ? t.escalation.recommended
              : fill(t.escalation[result.escalation.state], { case: result.escalation.case_id ?? "" })}
          </p>
        )}
        <Limits limitations={limitationTexts(result)} />
        <Actions onReportError={onReportError} howItWorksHref={howItWorksHref} />
      </footer>
    </section>
  )
}

/** "Co sprawdziliśmy": the number of claims, then each verdict once with how many claims got it. */
function Summary({ claims }: { claims: ClaimResult[] }) {
  const counts = new Map<Verdict, number>()
  for (const c of claims) counts.set(c.verdict, (counts.get(c.verdict) ?? 0) + 1)
  return (
    <div className="grid gap-2 px-4">
      <h2 className="flex items-center gap-2 text-small font-semibold">
        <ListChecksIcon aria-hidden="true" className="size-4 shrink-0" />
        {t.result.claims_title}: {plural(t.result.claims_count, claims.length)}
      </h2>
      <ul className="flex flex-wrap gap-x-3 gap-y-2">
        {[...counts].map(([verdict, count]) => (
          <li key={verdict} className="flex items-center gap-1.5 text-small tabular-nums text-muted-foreground">
            {count} ×
            <VerdictBadge verdict={verdict} size="sm" explain />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Limitations and the AI note under one toggle; in a reply with no limitations the thread carries the AI note. */
function Limits({ limitations }: { limitations: string[] }) {
  const count = limitations.length > 0 ? ` (${limitations.length})` : ""
  return (
    <Collapsible className={cn(limitations.length === 0 && "in-data-reply:hidden")}>
      <CollapsibleTrigger className="group flex cursor-pointer items-center gap-1.5 rounded-md font-semibold transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        {t.result.limitations}
        {count}
        <ChevronDownIcon aria-hidden="true" className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-2 pt-2 text-pretty">
        {limitations.length > 0 && (
          <ul className="list-disc pl-4">
            {limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
        <p className="in-data-reply:hidden">{t.result.ai_disclosure}</p>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** „Zgłoś błąd” and „Jak działa Meritum” as buttons with Lucide icons; each only when the app wires it. */
function Actions({ onReportError, howItWorksHref }: { onReportError?: (() => void) | undefined; howItWorksHref?: string | undefined }) {
  if (!onReportError && !howItWorksHref) return null
  return (
    <div className="flex flex-wrap gap-2">
      {onReportError && (
        <Button type="button" variant="outline" className="h-9 gap-2 rounded-pill px-4 text-small" onClick={onReportError}>
          <FlagIcon aria-hidden="true" />
          {t.result.report_error}
        </Button>
      )}
      {howItWorksHref && (
        <Button asChild variant="ghost" className="h-9 gap-2 rounded-pill px-4 text-small">
          <a href={howItWorksHref}>
            <BookOpenIcon aria-hidden="true" />
            {t.result.how_it_works}
          </a>
        </Button>
      )}
    </div>
  )
}

/** Failure or out-of-scope code text when the result has one, otherwise the status hint. */
function statusText(result: CheckResult): string {
  if (result.status === "done") return "" // narrows the type: status_hint has no "done"
  if (result.status === "technical_failure" && result.failure_code) return t.failure_code[result.failure_code]
  if (result.status === "out_of_scope" && result.out_of_scope_code) return t.out_of_scope_code[result.out_of_scope_code]
  return t.status_hint[result.status]
}

/** Limitation codes worded from copy; the API's limitation texts only when it sent no codes. */
function limitationTexts(result: CheckResult): string[] {
  const codes = result.limitation_codes ?? []
  return codes.length > 0 ? codes.map((code) => t.limitation_code[code]) : (result.limitations ?? [])
}

function StatusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true">
      <circle cx="8" cy="8" r="6.8" fill="none" stroke="currentColor" strokeWidth={1.3} />
      <path d="M8 4.6v4.3M8 11.2v.1" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  )
}
