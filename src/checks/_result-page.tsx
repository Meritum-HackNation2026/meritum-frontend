import { useEffect, useState } from 'react'
import { AnalysisSteps, ResultCard, t } from '@/components/meritum'
import type { AnalysisStatus, CheckResult } from '@/contracts/meritum'
import { CheckResultCard } from '@/evidence'
import { isDraft, shownResult } from './_progress'
import { MAX_FAILED_READS, POLL_INTERVAL_MS, RECEIVED_STEPS } from './constants'
import type { ProgressSource, ReadOutcome, ResultReader } from './ports'

/** Keeps asking while the check runs or a read failed; stops at a result or an unknown id. */
function isFinal(outcome: ReadOutcome): boolean {
  return outcome === 'not_found' || (typeof outcome === 'object' && Boolean(outcome.status.result))
}

function useCheckStatus(checkId: string, reader: ResultReader, pollMs: number) {
  const [outcome, setOutcome] = useState<ReadOutcome | null>(null)
  const [status, setStatus] = useState<AnalysisStatus | null>(null)
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let failures = 0
    const poll = async () => {
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
      if (!isFinal(next) && failures < MAX_FAILED_READS) {
        timer = setTimeout(poll, pollMs)
      }
    }
    poll()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [checkId, reader, pollMs])
  return { outcome, status }
}

/** The latest status streamed over SSE; the API read stays the fallback when the stream ends. */
function useStreamedStatus(checkId: string, progress: ProgressSource) {
  const [streamed, setStreamed] = useState<AnalysisStatus | null>(null)
  useEffect(() => progress.watch(checkId, setStreamed, () => undefined), [checkId, progress])
  return streamed
}

function errorText(outcome: ReadOutcome | null): string | null {
  if (outcome === 'not_found') {
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
 * times in a row; an unknown id stops it.
 *
 * @param props.checkId - The id the API gave the accepted check.
 * @param props.reader - Reads GET /api/v1/checks/{id} (the `src/api` adapter in the app).
 * @param props.progress - Streams the steps (the `src/api` SSE adapter in the app).
 * @param props.pollMs - Pause between reads; tests pass a short one.
 * @returns The result page.
 * @feature US-SPR-01, US-SPR-02, US-SPR-04, US-BEZ-07, F-01, F-09, F-17, F-21
 */
export function ResultPage({
  checkId,
  reader,
  progress,
  pollMs = POLL_INTERVAL_MS,
}: {
  checkId: string
  reader: ResultReader
  progress: ProgressSource
  pollMs?: number
}) {
  const { outcome, status } = useCheckStatus(checkId, reader, pollMs)
  const streamed = useStreamedStatus(checkId, progress)
  const live = streamed ?? status
  // GET already holds back early verdicts (backend `without_early_verdict`); the stream does not
  const result = (streamed && shownResult(streamed)) ?? status?.result ?? null
  const error = errorText(outcome)
  const isRunning = !result && outcome !== 'not_found'
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
