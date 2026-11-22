import type { Verdict } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { t } from "./copy"

/** Red only for "false"; the two non-settling verdicts stay neutral (DESIGN_SYSTEM.md section 3). */
const TONE: Record<Verdict, string> = {
  confirmed: "bg-verified-surface text-verified-foreground",
  misleading: "bg-contested-surface text-contested-foreground",
  false: "bg-scam-surface text-scam-foreground",
  insufficient_evidence: "bg-secondary text-muted-foreground",
  not_verifiable: "bg-secondary text-muted-foreground",
}

/** The verdict as the headline of a claim (6.4): the word set large in its ink, no pill, so it leads the card. */
const INK: Record<Verdict, string> = {
  confirmed: "text-verified-foreground",
  misleading: "text-contested-foreground",
  false: "text-scam-foreground",
  insufficient_evidence: "text-foreground",
  not_verifiable: "text-foreground",
}

export function VerdictBadge({ verdict, size = "md", className }: { verdict: Verdict; size?: "sm" | "md" | "lg"; className?: string }) {
  if (size === "lg") {
    // the size sits on the outer span: cn (tailwind-merge) would drop text-verdict next to a text colour
    return (
      <span className={cn("block font-sans text-verdict font-bold tracking-tight text-balance font-stretch-semi-expanded", className)}>
        <span className={INK[verdict]}>{t.verdict[verdict]}</span>
      </span>
    )
  }
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-pill py-0.5 font-sans font-semibold whitespace-nowrap", size === "sm" ? "px-2 text-meta" : "px-2.5 text-small", TONE[verdict], className)}>
      {t.verdict[verdict]}
    </span>
  )
}
