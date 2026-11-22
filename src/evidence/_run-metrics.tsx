import { formatDate } from '@/components/meritum/copy'
import pl from '@/copy/pl.json'
import { LOCALE, METRIC_FRACTION_DIGITS, METRIC_KEYS } from './constants'
import type { EvalRunSummary } from './types'

const { metrics: text } = pl.method
const { names } = text
const number = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: METRIC_FRACTION_DIGITS })
const [beforeDate, afterDate] = text.run_date.split('{date}')

/**
 * Metrics of the last finished evaluation run as large numbers with their names, only the
 * values the API measured, then the run's date and the link to the reproduction bundle; without
 * a finished run, a message and no numbers.
 *
 * @param props.run - Summary of the last finished run, or null when there is none yet.
 * @returns The metrics, or the message.
 * @feature US-ZRD-12, F-29
 */
export function RunMetrics({ run }: { run: EvalRunSummary | null }) {
  if (!run) {
    return <p>{text.no_run}</p>
  }
  const measured = METRIC_KEYS.flatMap((key) => {
    const value = run.metrics[key]
    return value === undefined ? [] : [[key, value] as const]
  })
  return (
    <>
      {measured.length > 0 && (
        <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-3">
          {measured.map(([key, value]) => (
            // dt stays first for screen readers; the number shows above its name
            <div key={key} className="flex flex-col-reverse justify-end gap-1">
              <dt className="text-muted-foreground text-small text-pretty">{names[key]}</dt>
              <dd className="font-mono font-semibold text-headline tracking-tight tabular-nums">
                {number.format(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-muted-foreground text-small">
        {beforeDate}
        <time dateTime={run.finished_at} className="font-mono">
          {formatDate(run.finished_at)}
        </time>
        {afterDate}
      </p>
      <p>
        <a
          href={run.bundle_url}
          className="underline underline-offset-3 hover:text-muted-foreground"
        >
          {text.reproduce}
        </a>
      </p>
    </>
  )
}
