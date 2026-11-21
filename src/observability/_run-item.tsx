import { ChevronRight, LoaderCircle } from 'lucide-react'
import { type ChangeEvent, useCallback, useId, useState } from 'react'
import { formatDate, t, VerdictBadge } from '@/components/meritum'
import { METRIC_KEYS } from '@/evidence'
import { EVAL_FRACTION_DIGITS, EVAL_LOCALE, GOLDEN_SET } from './constants'
import type { EvalApi, EvalCase, EvalMetrics, EvalRun } from './ports'

const number = new Intl.NumberFormat(EVAL_LOCALE, { maximumFractionDigits: EVAL_FRACTION_DIGITS })

/**
 * A metric value as the page shows it: Polish decimals, at most two places.
 *
 * @param value - The measured value.
 * @returns The formatted number.
 * @feature US-OBS-06, F-28
 */
export function formatMetric(value: number): string {
  return number.format(value)
}

function Metrics({ metrics }: { metrics: EvalMetrics }) {
  const measured = METRIC_KEYS.flatMap((key) => {
    const value = metrics[key]
    return value === undefined ? [] : [[key, value] as const]
  })
  if (measured.length === 0) {
    return null
  }
  return (
    <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
      {measured.map(([key, value]) => (
        <div key={key} className="flex justify-between gap-4 border-b py-1.5 text-small">
          <dt>{t.method.metrics.names[key]}</dt>
          <dd className="font-mono tabular-nums">{formatMetric(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * The verdict a case got, or the neutral „Problem techniczny” when its check gave none.
 *
 * @param props.verdict - The verdict, null without one.
 * @returns The badge or the neutral word.
 * @feature US-OBS-06, F-28
 */
export function CaseVerdict({ verdict }: { verdict: EvalCase['verdict'] }) {
  return verdict ? (
    <VerdictBadge verdict={verdict} size="sm" />
  ) : (
    <span className="text-meta text-muted-foreground">{t.status.technical_failure}</span>
  )
}

function Cases({ cases }: { cases: EvalCase[] | null | undefined }) {
  if (cases === undefined) {
    return null
  }
  if (cases === null) {
    return <p className="text-small">{t.errors.offline}</p>
  }
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
      {cases.map((item) => (
        <li key={item.case_id} className="flex items-center justify-between gap-3 py-1">
          <span className="font-mono text-small">{item.case_id}</span>
          <CaseVerdict verdict={item.verdict} />
        </li>
      ))}
    </ul>
  )
}

const isActive = (run: EvalRun) => run.status === 'queued' || run.status === 'running'

/**
 * One run in the list: a box to pick it for the comparison (finished runs only) and its date,
 * dataset and status; opening it shows its metrics and reads its case results.
 *
 * @param props.run - The run.
 * @param props.api - The evaluation API (case results).
 * @param props.selected - Whether the run is picked for the comparison.
 * @param props.onSelect - Picks or unpicks the run.
 * @returns The list item.
 * @feature US-OBS-06, F-28
 */
export function RunItem({
  run,
  api,
  selected,
  onSelect,
}: {
  run: EvalRun
  api: EvalApi
  selected: boolean
  onSelect: (id: string, selected: boolean) => void
}) {
  const labelId = useId()
  const casesId = useId()
  const [isOpen, setOpen] = useState(false)
  const [cases, setCases] = useState<EvalCase[] | null>()
  const toggle = useCallback(async () => {
    setOpen(!isOpen)
    if (!isOpen && cases === undefined) {
      setCases(await api.cases(run.id))
    }
  }, [api, cases, isOpen, run.id])
  const pick = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onSelect(run.id, event.currentTarget.checked),
    [onSelect, run.id],
  )
  const dataset = run.dataset === GOLDEN_SET ? t.evaluation.golden_set : run.dataset
  return (
    <li className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <input
        type="checkbox"
        aria-labelledby={labelId}
        checked={selected}
        disabled={run.status !== 'done'}
        onChange={pick}
        className="mt-1.5 size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
      />
      <div className="grid min-w-0 flex-1 gap-3">
        <button
          type="button"
          id={labelId}
          aria-expanded={isOpen}
          aria-controls={casesId}
          onClick={toggle}
          className="group flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1 rounded-md text-left focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0 transition-transform duration-200 ease-out-meritum group-aria-expanded:rotate-90 motion-reduce:transition-none"
          />
          <time dateTime={run.started_at} className="font-mono text-small">
            {formatDate(run.started_at)}
          </time>
          <span className="text-body font-semibold">{dataset}</span>
          <span className="inline-flex items-center gap-1 text-small text-muted-foreground">
            {isActive(run) && (
              <LoaderCircle aria-hidden className="size-3.5 motion-safe:animate-spin" />
            )}
            {t.evaluation.status[run.status]}
          </span>
        </button>
        <Metrics metrics={run.metrics} />
        <div id={casesId} hidden={!isOpen}>
          <Cases cases={cases} />
        </div>
      </div>
    </li>
  )
}
