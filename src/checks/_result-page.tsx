import { useEffect, useState } from 'react'
import { AnalysisSteps, ResultCard, t } from '@/components/meritum'
import type { AnalysisStatus, CheckResult } from '@/contracts/meritum'
import { CheckResultCard } from '@/evidence'
import { isDraft, shownResult } from './_progress'
import { MAX_FAILED_READS, MAX_READS, POLL_INTERVAL_MS, RECEIVED_STEPS } from './constants'
import type { ProgressSource, ReadOutcome, ResultReader } from './ports'

type Next = 'again' | 'stop' | 'give_up'

/**
 * What follows a read: stop at a result, an unknown id or too many failures in a row; give up
 * after the last allowed read; otherwise ask again.
 */
function nextAfter(outcome: ReadOutcome, failures: number, readsLeft: number): Next {
  const hasResult = typeof outcome === 'object' && Boolean(outcome.status.result)
  if (hasResult || outcome === 'not_found' || failures >= MAX_FAILED_READS) {
    return 'stop'
  }
  return readsLeft > 0 ? 'again' : 'give_up'
}

/** How the page reads the API: the pause between reads and how many reads it may make. */
type Polling = { pollMs: number; maxReads: number }

/**
 * Reads the check until it has a result. Once the stream ended without one, a single last read
 * decides: a result, or the technical failure line (as in meritum-frontend#17).
 */
function useCheckStatus(
  checkId: string,
  reader: ResultReader,
  { pollMs, maxReads }: Polling,
  streamEnded: boolean,
) {
  const [outcome, setOutcome] = useState<ReadOutcome | null>(null)
  const [status, setStatus] = useState<AnalysisStatus | null>(null)
  const [gaveUp, setGaveUp] = useState(false)
  const [ended, setEnded] = useState(false)
  useEffect(() => {
    const limit = streamEnded ? 1 : maxReads
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let failures = 0
    let reads = 0
    const poll = async () => {
      reads += 1
      const next = await reader.read(checkId)
      if (!active) {
        return
      }
      setOutcome(next)
      // the last steps stay on screen while a read fails
      if (typeof next === 'object') {
        setStatus(next.status)
      }
      failures = typeof next === 'string' ? failures + 1 : 0
      const then = nextAfter(next, failures, limit - reads)
      if (then === 'again') {
        timer = setTimeout(poll, pollMs)
      }
      setGaveUp(then === 'give_up')
      setEnded(then !== 'again')
    }
    poll()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [checkId, reader, pollMs, maxReads, streamEnded])
  return { outcome, status, gaveUp, ended }
}

/** The latest status streamed over SSE and whether the stream has ended. */
function useStreamedStatus(checkId: string, progress: ProgressSource) {
  const [streamed, setStreamed] = useState<AnalysisStatus | null>(null)
  const [closed, setClosed] = useState(false)
  useEffect(() => progress.watch(checkId, setStreamed, () => setClosed(true)), [checkId, progress])
  return { streamed, closed }
}

function errorText(outcome: ReadOutcome | null, gaveUp: boolean): string | null {
  if (outcome === 'not_found' || gaveUp) {
    return t.status_hint.technical_failure
  }
  return typeof outcome === 'string' ? t.errors[outcome] : null
}

function Card({ result }: { result: CheckResult }) {
  // shortcut: the design-system ResultCard for non-verdict states until CheckResultCard shows
  // them; drop this branch once meritum-frontend#25 lands
  return result.status === 'done' ? (
    <CheckResultCard result={result} />
  ) : (
    <ResultCard result={result} />
  )
}

/**
 * The result page of one check: live steps streamed over SSE while it runs (the API read
 * fills in when the stream is silent), then the result card in a polite `aria-live` region,
 * so a screen reader announces the result. Verdicts wait for verified citations. A failed
 * read shows a message, never a verdict, and the page keeps asking up to `MAX_FAILED_READS`
 * times in a row; an unknown id stops it. A stream that ends without a result, or `MAX_READS`
 * reads without one, end with the technical failure line after one last read.
 *
 * @param props.checkId - The id the API gave the accepted check.
 * @param props.reader - Reads GET /api/v1/checks/{id} (the `src/api` adapter in the app).
 * @param props.progress - Streams the steps (the `src/api` SSE adapter in the app).
 * @param props.pollMs - Pause between reads; tests pass a short one.
 * @param props.maxReads - Reads before giving up; tests pass a small one.
 * @returns The result page.
 * @feature US-SPR-01, US-SPR-02, US-SPR-04, US-BEZ-07, F-01, F-09, F-17, F-21
 */
export function ResultPage({
  checkId,
  reader,
  progress,
  pollMs = POLL_INTERVAL_MS,
  maxReads = MAX_READS,
}: {
  checkId: string
  reader: ResultReader
  progress: ProgressSource
  pollMs?: number
  maxReads?: number
}) {
  const { streamed, closed } = useStreamedStatus(checkId, progress)
  const streamedResult = streamed && shownResult(streamed)
  const polling = { pollMs, maxReads }
  const read = useCheckStatus(checkId, reader, polling, closed && !streamedResult)
  const { outcome, status, gaveUp, ended } = read
  const live = streamed ?? status
  // GET already holds back early verdicts (backend `without_early_verdict`); the stream does not
  const result = streamedResult ?? status?.result ?? null
  const error = errorText(outcome, gaveUp)
  const isRunning = !(result || ended)
  return (
    <div className="grid min-w-0 gap-4">
      {isRunning && (
        <AnalysisSteps
          steps={live?.steps ?? [...RECEIVED_STEPS]}
          draft={live !== null && isDraft(live)}
        />
      )}
      {error && !result && (
        <p role="alert" className="text-small text-pretty">
          {error}
        </p>
      )}
      <div aria-live="polite" className="min-w-0">
        {result && <Card result={result} />}
      </div>
    </div>
  )
}
