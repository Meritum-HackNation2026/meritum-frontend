import type { ReactNode } from "react"

import type { CheckResult, ClaimResult } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { CitationItem } from "./citation-item"
import { fill, formatDate, t } from "./copy"
import { InfoButton } from "./hint"
import { MeritumLabel } from "./meritum-mark"
import { StrengthMeter } from "./strength-meter"
import { VerdictBadge } from "./verdict-badge"

/**
 * Result card (DESIGN_SYSTEM.md 6.4): one card per check, one block per claim.
 * Same component on the web form and under a post in the extension; the frame takes the host skin via `data-host`.
 * A non-verdict status (clarify, out of scope, technical failure) gets an icon and a line of text, never a badge.
 * `message` is never shown: the status line and the limitations come from contract codes through copy/pl.json
 * (the API's limitation texts only when it sent no codes).
 */
export function ResultCard({ result, className }: { result: CheckResult; className?: string }) {
  const limitations = limitationTexts(result)
  return (
    <section
      aria-label="Meritum: wynik sprawdzenia"
      className={cn(
        "animate-rise min-w-0 border border-border bg-[var(--host-card,var(--card))] font-[family-name:var(--host-font,var(--font-sans))] text-card-foreground",
        "rounded-[var(--host-radius,var(--radius))]",
        className,
      )}
    >
      <header className="flex items-center px-3.5 pt-3 in-data-reply:hidden">
        <MeritumLabel />
      </header>

      {result.status === "done" ? (
        <>
          {result.source_warning && (
            <Note className="mx-3.5">
              {fill(t.source_warning.eu_sanctioned_entity, { entity: result.source_warning.entity })}{" "}
              <a href={result.source_warning.basis_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-3">
                podstawa
              </a>
            </Note>
          )}
          <h2 className="sr-only">{t.result.claims_title}</h2>
          {(result.claims ?? []).map((c) => (
            <ClaimBlock key={c.claim} claim={c} />
          ))}
        </>
      ) : (
        <div className="flex items-start gap-2.5 px-3.5 pt-2.5">
          <StatusIcon />
          <div>
            <h2 className="font-sans text-body font-bold">{t.status[result.status]}</h2>
            <p className="text-body text-pretty">{statusText(result)}</p>
          </div>
        </div>
      )}

      <footer className="mt-3 grid gap-1.5 border-t border-border px-3.5 pt-2.5 pb-3.5 text-meta text-muted-foreground">
        {result.escalation && (
          <p className="text-small text-foreground">
            {result.escalation.state === "recommended"
              ? t.escalation.recommended
              : fill(t.escalation[result.escalation.state], { case: result.escalation.case_id ?? "" })}
          </p>
        )}
        {limitations.length > 0 && (
          <div>
            <p className="font-semibold">{t.result.limitations}</p>
            <ul className="list-disc pl-4">
              {limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        )}
        <p>{t.result.ai_disclosure}</p>
      </footer>
    </section>
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

function ClaimBlock({ claim: c }: { claim: ClaimResult }) {
  const citations = c.citations ?? []
  const conflict = c.verdict === "insufficient_evidence" && citations.length > 0
  return (
    <article className="border-b border-border/70 px-3.5 py-3 last-of-type:border-b-0">
      <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
        <h3 className="min-w-[60%] flex-1 font-sans text-body font-bold text-pretty">
          <span className="sr-only">{t.result.claim}: </span>
          {c.claim}
        </h3>
        <VerdictBadge verdict={c.verdict} />
      </div>
      <p className="mt-0.5 text-small text-muted-foreground">{t.verdict_hint[c.verdict]}</p>

      <div className="mt-2.5">
        <h4 className="sr-only">{t.result.explanation}</h4>
        <p className="text-body text-pretty">{c.explanation}</p>
        <p className="mt-1 text-meta text-muted-foreground">{t.result.explanation_hint}</p>
      </div>

      {conflict ? (
        <div className="mt-3">
          <p className="text-small text-pretty">{fill(t.result.conflict, { difference: c.unresolved ?? "" })}</p>
          <div className="mt-1 grid gap-x-4 sm:grid-cols-2">
            {(["supports", "refutes"] as const).map((side) => (
              <div key={side}>
                <h4 className="mt-2 text-meta font-semibold text-muted-foreground">{side === "supports" ? "Źródła potwierdzające" : "Źródła przeczące"}</h4>
                <ul className="divide-y divide-border/70">
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
      ) : (
        citations.length > 0 && (
          <div className="mt-3">
            <h4 className="text-meta font-semibold text-muted-foreground">{t.result.sources_title}</h4>
            <ul className="divide-y divide-border/70">
              {citations.map((x) => (
                <CitationItem key={x.source.id + x.fragment} citation={x} />
              ))}
            </ul>
          </div>
        )
      )}

      {c.strength && <StrengthMeter className="mt-2" strength={c.strength} claimDate={c.claim_date} claimDateSource={c.claim_date_source} />}

      {c.unresolved && !conflict && (
        <div className="mt-2.5">
          <h4 className="text-meta font-semibold text-muted-foreground">{t.result.unresolved}</h4>
          <p className="text-small text-pretty">{c.unresolved}</p>
        </div>
      )}

      {c.archival && <Note>{t.result.archival}</Note>}
      {c.incident && (
        <Note>
          {fill(c.incident.matched_on === "domain" ? t.result.incident_domain : t.result.incident, {
            title: c.incident.title,
            date: formatDate(c.incident.date),
          })}{" "}
          <a href={c.incident.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-3">
            opis przypadku
          </a>
        </Note>
      )}
      {c.technique && (
        <Note>
          Technika: {t.techniques[c.technique].name}
          <InfoButton text={t.techniques[c.technique].how_to_spot} label={`Jak rozpoznać: ${t.techniques[c.technique].name}`} />
        </Note>
      )}
    </article>
  )
}

/** Warnings and context lines: neutral, one per row, never red and never a verdict. */
function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-2.5 flex flex-wrap items-center gap-x-1.5 border-t border-border/70 pt-2 text-small text-pretty", className)}>{children}</p>
}

function StatusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true">
      <circle cx="8" cy="8" r="6.8" fill="none" stroke="currentColor" strokeWidth={1.3} />
      <path d="M8 4.6v4.3M8 11.2v.1" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  )
}
