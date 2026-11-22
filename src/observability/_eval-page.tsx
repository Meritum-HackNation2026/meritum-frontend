import { type ChangeEvent, useCallback, useEffect, useState } from 'react'
import { t } from '@/components/meritum'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Comparison } from './_comparison'
import { isActive, RunItem } from './_run-item'
import { CASE_FILE_TYPES, COMPARED_RUNS, EVAL_POLL_MS, GOLDEN_SET } from './constants'
import type { EvalApi, EvalComparison, EvalOutcome, EvalRun } from './ports'

// shortcut: a refused upload or start shows errors.offline; its own text joins copy/pl.json in
// meritum-design-system#87, then replace it here.
const notices: Record<Exclude<EvalOutcome, 'done'>, string> = {
  expired: t.staff.sign_in.session_expired,
  failed: t.errors.offline,
}

const byStart = (a: EvalRun, b: EvalRun) => Date.parse(a.started_at) - Date.parse(b.started_at)

function RunActions({ onOutcome, api }: { onOutcome: (o: EvalOutcome) => void; api: EvalApi }) {
  const [pending, setPending] = useState(false)
  const act = useCallback(
    async (call: () => Promise<EvalOutcome>) => {
      setPending(true)
      onOutcome(await call())
      setPending(false)
    },
    [onOutcome],
  )
  const startGolden = useCallback(() => act(() => api.start(GOLDEN_SET)), [act, api])
  const upload = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0]
      event.currentTarget.value = ''
      if (file) {
        act(() => api.upload(file))
      }
    },
    [act, api],
  )
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        className="h-auto min-h-10 max-w-full rounded-pill px-5 whitespace-normal"
        disabled={pending}
        onClick={startGolden}
      >
        {t.evaluation.new_run}
      </Button>
      <label
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'h-auto min-h-10 max-w-full cursor-pointer rounded-pill px-5 whitespace-normal focus-within:outline-2 focus-within:outline-ring',
          pending && 'pointer-events-none opacity-50',
        )}
      >
        {t.evaluation.upload}
        <input
          type="file"
          accept={CASE_FILE_TYPES}
          className="sr-only"
          disabled={pending}
          onChange={upload}
        />
      </label>
    </div>
  )
}

/**
 * The evaluation page (US-OBS-06): the runs newest first with their status and metrics, the
 * case results of an opened run, a new run on the golden set or on an uploaded JSON or CSV
 * file (US-OBS-05) and the comparison of two finished runs. A read-only jury session sees runs
 * and comparisons without the run and upload buttons. While a run is queued or running the
 * list is read again; its end also comes as an `eval_run_done` notification from the bell.
 *
 * @param props.runs - The runs from `loadEval`, null when the API did not give them.
 * @param props.api - The evaluation API.
 * @param props.readOnly - A jury session: nothing that starts a run.
 * @returns The evaluation section.
 * @feature US-OBS-06, US-OBS-05, US-POW-05, F-28
 */
export function EvalPage(props: { runs: EvalRun[] | null; api: EvalApi; readOnly: boolean }) {
  const { api } = props
  const [runs, setRuns] = useState(props.runs)
  const [notice, setNotice] = useState<string>()
  const [picked, setPicked] = useState<string[]>([])
  const [comparison, setComparison] = useState<EvalComparison | null>()
  const reload = useCallback(async () => {
    const next = await api.runs()
    if (Array.isArray(next)) {
      setRuns(next)
    }
  }, [api])
  const hasActive = runs?.some(isActive) ?? false
  useEffect(() => {
    if (!hasActive) {
      return
    }
    const timer = setInterval(reload, EVAL_POLL_MS)
    return () => clearInterval(timer)
  }, [hasActive, reload])
  const onOutcome = useCallback(
    async (outcome: EvalOutcome) => {
      setNotice(outcome === 'done' ? undefined : notices[outcome])
      if (outcome === 'done') {
        await reload()
      }
    },
    [reload],
  )
  // a third pick replaces the oldest one, so at most two runs are ever picked
  const select = useCallback((id: string, isPicked: boolean) => {
    setComparison(undefined)
    setPicked((ids) =>
      isPicked ? [...ids, id].slice(-COMPARED_RUNS) : ids.filter((other) => other !== id),
    )
  }, [])
  const compare = useCallback(async () => {
    const [a, b] = (runs ?? []).filter((run) => picked.includes(run.id)).toSorted(byStart)
    if (a && b) {
      setComparison(await api.compare(a.id, b.id))
    }
  }, [api, picked, runs])
  return (
    <section aria-labelledby="eval-title" className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="eval-title" className="text-title font-bold">
          {t.evaluation.title}
        </h2>
        {!props.readOnly && <RunActions api={api} onOutcome={onOutcome} />}
      </div>
      <p role="status" className="text-small empty:sr-only">
        {notice}
      </p>
      <section aria-labelledby="eval-runs" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="eval-runs" className="text-body font-bold">
            {t.evaluation.runs}
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="h-auto min-h-8 max-w-full rounded-pill whitespace-normal"
            disabled={picked.length !== COMPARED_RUNS}
            onClick={compare}
          >
            {t.evaluation.compare}
          </Button>
        </div>
        {runs === null && <p className="text-small">{t.errors.offline}</p>}
        {runs?.length === 0 && <p className="text-small">{t.method.metrics.no_run}</p>}
        <ul className="grid gap-6 empty:hidden">
          {runs?.map((run) => (
            <RunItem
              key={run.id}
              run={run}
              api={api}
              selected={picked.includes(run.id)}
              onSelect={select}
            />
          ))}
        </ul>
      </section>
      <div aria-live="polite" className="empty:sr-only">
        {comparison === null && <p className="text-small">{t.errors.offline}</p>}
        {comparison && <Comparison comparison={comparison} />}
      </div>
    </section>
  )
}
