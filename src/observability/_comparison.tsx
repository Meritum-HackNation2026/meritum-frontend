import { ArrowRight } from 'lucide-react'
import { t } from '@/components/meritum'
import { METRIC_KEYS } from '@/evidence'
import { CaseVerdict, formatMetric } from './_run-item'
import type { EvalComparison } from './ports'

function signed(delta: number): string {
  const text = formatMetric(Math.abs(delta))
  if (text === formatMetric(0)) {
    return text
  }
  return delta > 0 ? `+${text}` : `−${text}`
}

/**
 * Two runs side by side: each metric measured in both, earlier → later with the difference,
 * and the cases whose verdict changed between them.
 *
 * @param props.comparison - The comparison from the API.
 * @returns The comparison section.
 * @feature US-OBS-06, F-28
 */
export function Comparison({ comparison }: { comparison: EvalComparison }) {
  const metrics = METRIC_KEYS.flatMap((key) => {
    const pair = comparison.metrics[key]
    return pair ? [[key, pair] as const] : []
  })
  return (
    <section aria-labelledby="eval-comparison" className="grid gap-4">
      <h3 id="eval-comparison" className="text-body font-bold">
        {t.evaluation.compare}
      </h3>
      <dl className="grid grid-cols-1">
        {metrics.map(([key, { a, b }]) => (
          <div
            key={key}
            className="flex flex-wrap items-baseline justify-between gap-x-4 py-1.5 text-small"
          >
            <dt>{t.method.metrics.names[key]}</dt>
            <dd className="inline-flex items-center gap-1.5 tabular-nums">
              {formatMetric(a)}
              <ArrowRight aria-hidden className="size-3.5" />
              {formatMetric(b)}
              <span className="text-muted-foreground">({signed(b - a)})</span>
            </dd>
          </div>
        ))}
      </dl>
      {comparison.changed_cases.length > 0 && (
        <div className="grid gap-2">
          <h4 className="text-small font-semibold">{t.evaluation.changed_cases}</h4>
          <ul className="grid gap-1">
            {comparison.changed_cases.map((item) => (
              <li key={item.case_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1">
                <span className="basis-full font-mono text-small sm:mr-auto sm:basis-auto">
                  {item.case_id}
                </span>
                <CaseVerdict verdict={item.a} />
                <ArrowRight aria-hidden className="size-3.5" />
                <CaseVerdict verdict={item.b} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
