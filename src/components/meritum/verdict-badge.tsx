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

export function VerdictBadge({ verdict, size = "md", className }: { verdict: Verdict; size?: "sm" | "md"; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-pill py-0.5 font-sans font-semibold whitespace-nowrap", size === "sm" ? "px-2 text-meta" : "px-2.5 text-small", TONE[verdict], className)}>
      {t.verdict[verdict]}
    </span>
  )
}
