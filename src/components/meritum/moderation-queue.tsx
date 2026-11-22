import type { ModeratorCase } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { plural, t } from "./copy"
import { InfoButton } from "./hint"

const DAY = new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })

const STATE_TONE: Record<ModeratorCase["state"], string> = {
  open: "bg-contested-surface text-contested-foreground",
  answered: "bg-verified-surface text-verified-foreground",
  closed: "bg-secondary text-muted-foreground",
}

/**
 * Moderator queue (DESIGN_SYSTEM.md 6.5). One row per case; similar claims are grouped into one case,
 * so the question count is the sum of checks over its claims. Never shows Discord ids or phone numbers:
 * the contract does not carry them.
 */
export function ModerationQueue({ cases, selectedId, onOpen, className }: { cases: ModeratorCase[]; selectedId?: string; onOpen: (id: string) => void; className?: string }) {
  const open = cases.filter((c) => c.state === "open").length
  return (
    <section aria-labelledby="meritum-queue" className={cn("font-sans", className)}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 id="meritum-queue" className="text-title font-bold">
          {t.moderation.queue_title}
        </h1>
        <p className="text-small text-muted-foreground">
          otwarte: <span className="tabular-nums text-foreground">{open}</span> z <span className="tabular-nums">{cases.length}</span>
        </p>
      </div>

      {cases.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-border px-3 py-2.5 text-small text-muted-foreground">Brak spraw. Nowe pojawią się tu same.</p>
      ) : (
        <div className="mt-3 sm:overflow-x-auto">
          <table className="w-full border-collapse text-small sm:min-w-[640px]">
            <thead className="max-sm:sr-only">
              <tr className="text-left text-meta text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-normal">
                  Sprawa
                </th>
                <th scope="col" className="py-2 pr-4 font-normal">
                  Powody
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-normal">
                  Pytania
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-normal">
                  Ostatnie / pierwsze
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  Stan
                </th>
              </tr>
            </thead>
            <tbody className="max-sm:block">
              {cases.map((c) => {
                const asked = c.claims.reduce((n, cl) => n + cl.check_ids.length, 0)
                return (
                  <tr key={c.id} className={cn("border-t border-border/70 align-top hover:bg-secondary/50 max-sm:relative max-sm:flex max-sm:flex-wrap max-sm:items-baseline max-sm:gap-x-4 max-sm:py-1", c.id === selectedId && "bg-secondary")}>
                    <td className="relative w-1/2 py-2.5 pr-4 max-sm:static max-sm:w-full max-sm:basis-full max-sm:pr-0 max-sm:pb-1">
                      <button type="button" onClick={() => onOpen(c.id)} aria-current={c.id === selectedId || undefined} className="text-left after:absolute after:inset-0">
                        <span className="font-mono">{c.id}</span> <span className="font-semibold">{c.summary}</span>
                      </button>
                      <span className="mt-0.5 block text-meta text-muted-foreground">
                        {claimsLabel(c.claims.length)}: {c.claims[0].claim}
                      </span>
                    </td>
                    <td className="min-w-44 py-2.5 pr-4 max-sm:basis-full max-sm:py-1">
                      {c.reasons.map((r) => (
                        <span key={r} className="block">
                          {capitalize(t.moderation.reason[r])}
                        </span>
                      ))}
                      {c.high_risk_topic && (
                        <span className="relative z-10 mt-0.5 flex items-center gap-1 text-meta text-muted-foreground">
                          {c.high_risk_topic}
                          {c.high_risk_classified_by && <InfoButton text={capitalize(t.moderation.high_risk_by[c.high_risk_classified_by])} label="Jak rozpoznano temat" />}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right whitespace-nowrap tabular-nums max-sm:py-1 max-sm:pr-0 max-sm:text-left">
                      <span className="sm:hidden">Pytania: </span>
                      {asked}
                      {asked > 1 && <span className="block text-meta text-muted-foreground">{plural(t.moderation.similar, asked)}</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-meta tabular-nums whitespace-nowrap max-sm:py-1 max-sm:pr-0 max-sm:text-left">
                      <time dateTime={c.last_seen} className="block">
                        {DAY.format(new Date(c.last_seen))}
                      </time>
                      {c.first_seen !== c.last_seen && (
                        <time dateTime={c.first_seen} className="block text-muted-foreground">
                          {DAY.format(new Date(c.first_seen))}
                        </time>
                      )}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap max-sm:ml-auto max-sm:py-1">
                      <span className={cn("inline-flex rounded-pill px-2 py-0.5 text-meta font-semibold", STATE_TONE[c.state])}>{t.moderation.state[c.state]}</span>
                      {c.assignee_role && <span className="mt-0.5 block text-meta text-muted-foreground">{t.moderation.role[c.assignee_role]}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function claimsLabel(n: number): string {
  if (n === 1) return "1 twierdzenie"
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
  return `${n} ${few ? "twierdzenia" : "twierdzeń"}`
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
