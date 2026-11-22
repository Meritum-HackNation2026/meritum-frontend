import { VerdictBadge } from '@/components/meritum'
import type { Verdict } from '@/contracts/meritum'
import pl from '@/copy/pl.json'

const steps = Object.values(pl.analysis.steps)
// The cast only undoes Object.keys widening to string[]; verdict_hint is keyed by Verdict.
const verdicts = Object.keys(pl.verdict_hint) as Verdict[]

/**
 * The path of a question: the steps of the analysis bar in their order, numbered 01 to 12 in
 * mono, in two columns from the small breakpoint up.
 *
 * @returns The numbered list of steps.
 * @feature US-ZRD-12, F-29
 */
export function QuestionPath() {
  return (
    <ol className="gap-x-10 sm:columns-2">
      {steps.map((step, i) => (
        <li key={step} className="mb-3 flex break-inside-avoid items-baseline gap-3">
          <span className="w-6 shrink-0 font-mono text-muted-foreground text-small tabular-nums">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="text-pretty">{step}</span>
        </li>
      ))}
    </ol>
  )
}

/**
 * The five possible answers: each verdict word in its badge with its hint from copy/pl.json.
 *
 * @returns The list of verdicts.
 * @feature US-ZRD-12, US-SPR-04, F-29
 */
export function VerdictLegend() {
  return (
    <ul className="grid gap-3">
      {verdicts.map((verdict) => (
        <li key={verdict} className="grid gap-1 sm:flex sm:items-baseline sm:gap-4">
          <span className="flex sm:w-64 sm:shrink-0">
            <VerdictBadge verdict={verdict} size="sm" />
          </span>
          <span className="text-pretty">{pl.verdict_hint[verdict]}</span>
        </li>
      ))}
    </ul>
  )
}
