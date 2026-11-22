import { useEffect, useRef, useState } from 'react'
import { AnalysisSteps, t } from '@/components/meritum'
import type { AnalysisStatus, CheckResult } from '@/contracts/meritum'
import { CheckResultCard } from '@/evidence'
import type { Handoff } from '@/moderation'
import { findSavedCheck, saveCheck } from './_history'
import { ReadFromFile } from './_image-text'
import { isDraft, shownResult } from './_progress'
import { ResultState } from './_result-state'
import { MAX_FAILED_READS, MAX_READS, POLL_INTERVAL_MS, RECEIVED_STEPS } from './constants'
import type { ProgressSource, ReadOutcome, ResultReader } from './ports'

type Next = 'again' | 'stop' | 'give_up'

/**
 * Whether the API reports a run that failed: a step `failed` and none waiting or running. A
 * check still in the queue reports only `receive` as done, so it does not count as failed.
 */
function hasFailed(status: AnalysisStatus): boolean {
  const isRunning = status.steps.some((s) => s.status === 'pending' || s.status === 'active')
  return !isRunning && status.steps.some((s) => s.status === 'failed')
}

/**
 * What follows a read: stop at a result, an unknown id or too many failed reads in a row; ask
 * again after a failed read; give up when the stream ended and the steps show a failed run
 * without a result, or after the last allowed read; otherwise ask again.
 */
function nextAfter(
  outcome: ReadOutcome,
  failures: number,
  readsLeft: number,
  streamEnded: boolean,
): Next {
  const hasResult = typeof outcome === 'object' && Boolean(outcome.status.result)
  if (hasResult || outcome === 'not_found' || failures >= MAX_FAILED_READS) {
    return 'stop'
  }
  if (typeof outcome === 'string') {
    return 'again'
  }
  const isFailed = streamEnded && hasFailed(outcome.status)
  return isFailed || readsLeft <= 0 ? 'give_up' : 'again'
}

/** How the page reads the API: the pause between reads and how many reads it may make. */
type Polling = { pollMs: number; maxReads: number }

/**
 * Reads the check until it has a result. Once the stream ended without one, a read showing a
 * failed run ends with the technical failure line (as in meritum-frontend#17).
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
  // read by the running poll without restarting it
  const streamEndedRef = useRef(streamEnded)
  useEffect(() => {
    streamEndedRef.current = streamEnded
  }, [streamEnded])
  // reads at once instead of waiting for the timer; a no-op once reading has stopped
  const readNowRef = useRef<() => void>(() => undefined)
  useEffect(() => {
    let active = true
    let waiting = false
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
      const then = nextAfter(next, failures, maxReads - reads, streamEndedRef.current)
      waiting = then === 'again'
      if (waiting) {
        timer = setTimeout(poll, pollMs)
      }
      setGaveUp(then === 'give_up')
      setEnded(then !== 'again')
    }
    readNowRef.current = () => {
      if (waiting) {
        waiting = false
        clearTimeout(timer)
        poll()
      }
    }
    poll()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [checkId, reader, pollMs, maxReads])
  useEffect(() => {
    if (streamEnded) {
      readNowRef.current()
    }
  }, [streamEnded])
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

function Card({ result, handoff }: { result: CheckResult; handoff: Handoff }) {
  return result.status === 'done' ? (
    <CheckResultCard result={result} handoff={handoff} />
  ) : (
    <ResultState
      status={result.status}
      failureCode={result.failure_code}
      outOfScopeCode={result.out_of_scope_code}
    />
  )
}

type ResultPageProps = {
  checkId: string
  reader: ResultReader
  progress: ProgressSource
  handoff: Handoff
  pollMs?: number
  maxReads?: number
  focusOnAnswer?: boolean
}

function LiveResult({
  checkId,
  reader,
  progress,
  handoff,
  pollMs = POLL_INTERVAL_MS,
  maxReads = MAX_READS,
  focusOnAnswer = false,
}: ResultPageProps) {
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
  useEffect(() => {
    if (result) {
      saveCheck(result)
    }
  }, [result])
  const answerRef = useRef<HTMLDivElement>(null)
  const hasResult = result !== null
  useEffect(() => {
    // a new answer is read next, unless the user is already in a field or on a button
    const isFocusFree = document.activeElement === null || document.activeElement === document.body
    if (focusOnAnswer && hasResult && isFocusFree) {
      answerRef.current?.focus()
    }
  }, [focusOnAnswer, hasResult])
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
      {result && <ReadFromFile result={result} />}
      <div
        ref={answerRef}
        tabIndex={-1}
        aria-live="polite"
        className="min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        {result && <Card result={result} handoff={handoff} />}
      </div>
    </div>
  )
}

/**
 * The result page of one check: live steps streamed over SSE while it runs (the API read
 * fills in when the stream is silent), then the result card in a polite `aria-live` region,
 * so a screen reader announces the result; with `focusOnAnswer`, the answer takes the focus
 * when nothing else has it. A checked recording or image shows what was read from it
 * above it (`ReadFromFile`), outside that region, so a long transcript does not hold back the verdicts.
 * Verdicts wait for verified citations. A failed
 * read shows a message, never a verdict, and the page keeps asking up to `MAX_FAILED_READS`
 * times in a row; an unknown id stops it. After the stream ended without a result, a read
 * showing a failed step with nothing left running ends with the technical failure line; a run
 * that crashed with a step still `active`, or a check still queued, keeps the page reading
 * until the result or `MAX_READS` reads, which also end with that line. A shown result is kept
 * in this tab's history; a check already in it opens from there, with no call to the API.
 *
 * @param props.checkId - The id the API gave the accepted check.
 * @param props.reader - Reads GET /api/v1/checks/{id} (the `src/api` adapter in the app).
 * @param props.progress - Streams the steps (the `src/api` SSE adapter in the app).
 * @param props.handoff - Hands claims of the result to the moderators (the `src/api` adapter).
 * @param props.pollMs - Pause between reads; tests pass a short one.
 * @param props.maxReads - Reads before giving up; tests pass a small one.
 * @param props.focusOnAnswer - Moves the focus to a result that arrives while nothing has it.
 * @returns The result page.
 * @feature US-SPR-01, US-SPR-02, US-SPR-04, US-SPR-09, US-SPR-11, US-BEZ-07, F-01, F-08, F-09, F-17, F-21
 */
export function ResultPage(props: ResultPageProps) {
  // read once: the page of a check this tab already has opens without the API
  const [saved] = useState(() => findSavedCheck(props.checkId))
  if (!saved) {
    return <LiveResult {...props} />
  }
  return (
    <div className="grid min-w-0 gap-4">
      <ReadFromFile result={saved} />
      <Card result={saved} handoff={props.handoff} />
    </div>
  )
}
