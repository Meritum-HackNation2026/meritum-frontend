import pl from '@/copy/pl.json'
import { LOCALE, METRIC_FRACTION_DIGITS, TIME_ZONE } from './constants'
import type { EvalRunSummary, MetricKey } from './types'

const { metrics: text } = pl.method
const { names } = text
const metricKeys = Object.keys(names) as MetricKey[]
const date = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'long', timeZone: TIME_ZONE })
const number = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: METRIC_FRACTION_DIGITS })
const [beforeDate, afterDate] = text.run_date.split('{date}')

/**
 * Metrics of the last finished evaluation run: its date, the measured values only and
 * the link to the reproduction bundle; without a finished run, a message and no numbers.
 *
 * @param props.run - Summary of the last finished run, or null when there is none yet.
 * @returns The metrics, or the message.
 * @feature US-ZRD-12, F-29
 */
export function RunMetrics({ run }: { run: EvalRunSummary | null }) {
  if (!run) {
    return <p>{text.no_run}</p>
  }
  const measured = metricKeys.flatMap((key) => {
    const value = run.metrics[key]
    return value === undefined ? [] : [[key, value] as const]
  })
  return (
    <>
      <p>
        {beforeDate}
        <time dateTime={run.finished_at} className="font-mono">
          {date.format(new Date(run.finished_at))}
        </time>
        {afterDate}
      </p>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[1fr_auto]">
        {measured.map(([key, value]) => (
          <div key={key} className="contents">
            <dt>{names[key]}</dt>
            <dd className="font-mono">{number.format(value)}</dd>
          </div>
        ))}
      </dl>
      <p>
        <a href={run.bundle_url} className="underline underline-offset-3">
          {text.reproduce}
        </a>
      </p>
    </>
  )
}
