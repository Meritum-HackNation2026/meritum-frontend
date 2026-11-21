import { formatDate } from '@/components/meritum/copy'
import pl from '@/copy/pl.json'
import { LOCALE, METRIC_FRACTION_DIGITS, METRIC_KEYS } from './constants'
import type { EvalRunSummary } from './types'

const { metrics: text } = pl.method
const { names } = text
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
  const measured = METRIC_KEYS.flatMap((key) => {
    const value = run.metrics[key]
    return value === undefined ? [] : [[key, value] as const]
  })
  return (
    <>
      <p>
        {beforeDate}
        <time dateTime={run.finished_at} className="font-mono">
          {formatDate(run.finished_at)}
        </time>
        {afterDate}
      </p>
      <dl className="divide-y rounded-lg border">
        {measured.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-4 px-3 py-2">
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
