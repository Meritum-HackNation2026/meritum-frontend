import type { AnalysisStep } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { t } from "./copy"
import { MeritumMark } from "./meritum-mark"

/**
 * Processing strip between "Sprawdź" and the result (DESIGN_SYSTEM.md 6.3). Drive it from `AnalysisStatus.steps`;
 * research steps run in parallel, so several circles may spin at once. `draft` marks a streamed answer
 * whose citations are not verified yet: it shows no verdict.
 */
export function AnalysisSteps({ steps, draft = false, className }: { steps: AnalysisStep[]; draft?: boolean; className?: string }) {
  return (
    <output className={cn("animate-rise block min-w-0 rounded-[var(--host-radius,var(--radius))] border border-border bg-[var(--host-card,var(--card))] px-3.5 py-3 font-sans", className)}>
      <p className="flex items-center gap-1.5 text-meta font-semibold text-muted-foreground">
        <MeritumMark className="size-3.5" />
        {t.analysis.title}
      </p>
      <ol className="mt-2 grid gap-1.5">
        {steps.map((s) => (
          <li
            key={s.code}
            className={cn(
              "flex items-center gap-2.5 text-small transition-colors",
              s.status === "pending" || s.status === "skipped" ? "text-muted-foreground" : "text-foreground",
              s.status === "skipped" && "line-through decoration-muted-foreground/60",
            )}
          >
            <StepMark status={s.status} />
            {t.analysis.steps[s.code]}
            <span className="sr-only">, {t.analysis.step_status[s.status]}</span>
          </li>
        ))}
      </ol>
      {draft && <p className="mt-2.5 border-t border-border/70 pt-2 text-small text-muted-foreground">{t.analysis.draft}</p>}
    </output>
  )
}

function StepMark({ status }: { status: AnalysisStep["status"] }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-full border-[1.5px]",
        (status === "pending" || status === "skipped") && "border-border",
        status === "active" && "animate-spin border-verified border-t-transparent motion-reduce:animate-none",
        status === "done" && "border-verified bg-verified text-card",
        status === "failed" && "border-muted-foreground text-muted-foreground",
      )}
    >
      {status === "done" && (
        <svg viewBox="0 0 16 16" className="size-3" aria-hidden="true">
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {status === "failed" && (
        <svg viewBox="0 0 16 16" className="size-2.5" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
      )}
    </span>
  )
}
