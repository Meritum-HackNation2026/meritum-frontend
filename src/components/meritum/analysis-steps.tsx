import { ChevronDownIcon } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"
import type { AnalysisStep, Draft } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { analysisProgress } from "./_analysis-progress"
import { fill, t } from "./copy"

/**
 * Progress of a running check on the web page (DESIGN_SYSTEM.md 6.3): a bar, "Krok n z m", the names
 * of the steps in progress (several while the searches run in parallel) and the full step list under
 * "Pokaż kroki". It lies on the page with no frame and no card background. `draft` is the streamed
 * answer whose citations are not verified yet; it stands below in a quiet field and shows no verdict.
 * The extension keeps its own step list (`extension/reference/card.js`).
 *
 * @param props.steps - `AnalysisStatus.steps`, in workflow order.
 * @param props.draft - `AnalysisStatus.draft`; nothing is shown while it is null or empty.
 * @param props.className - Extra classes for the outer block.
 * @returns The progress block.
 * @feature US-SPR-02, F-09
 */
export function AnalysisSteps({ steps, draft = null, className }: { steps: AnalysisStep[]; draft?: Draft; className?: string }) {
  const progress = analysisProgress(steps)
  return (
    <section aria-label={t.analysis.title} className={cn("animate-rise grid min-w-0 gap-5 font-sans", className)}>
      <div aria-live="polite" className="grid gap-2">
        <p className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-small font-semibold">{t.analysis.title}</span>
          <span className="text-small text-muted-foreground tabular-nums">
            {fill(t.analysis.step_of, { n: progress.step, of: progress.of })}
          </span>
        </p>
        <Progress value={progress.percent} aria-label={t.analysis.title} className="h-1.5" />
        {progress.active.length > 0 && (
          <ul className="grid gap-1 text-body text-pretty">
            {progress.active.map((s) => (
              <li key={s.code}>{t.analysis.steps[s.code]}</li>
            ))}
          </ul>
        )}
      </div>
      <Collapsible>
        <CollapsibleTrigger className="group flex w-fit cursor-pointer items-center gap-1.5 rounded-md text-small font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          {t.analysis.show_steps}
          <ChevronDownIcon
            aria-hidden="true"
            className="size-4 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <StepList steps={steps} />
        </CollapsibleContent>
      </Collapsible>
      {draft && (
        <div className="grid gap-1 rounded-lg bg-muted p-4">
          <p className="text-small text-muted-foreground">{t.analysis.draft}</p>
          <p className="text-body text-pretty">{draft}</p>
        </div>
      )}
    </section>
  )
}

function StepList({ steps }: { steps: AnalysisStep[] }) {
  return (
    <ol className="grid gap-2.5">
      {steps.map((s) => {
        const stateIsVisible = s.status === "skipped" || s.status === "failed"
        return (
          <li
            key={s.code}
            className={cn(
              "flex items-center gap-3 text-small",
              s.status === "pending" || s.status === "skipped" ? "text-muted-foreground" : "text-foreground",
            )}
          >
            <StepMark status={s.status} />
            <span className="min-w-0 flex-1">{t.analysis.steps[s.code]}</span>
            <span className={cn("shrink-0 text-small text-muted-foreground", !stateIsVisible && "sr-only")}>
              <span className="sr-only">, </span>
              {t.analysis.step_status[s.status]}
            </span>
          </li>
        )
      })}
    </ol>
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
