import { useEffect, useState } from 'react'
import { AnalysisSteps, t } from '@/components/meritum'
import type { AnalysisStatus, AnalysisStep } from '@/contracts/meritum'
import { CheckResultCard } from '@/evidence'
import { POLL_INTERVAL_MS } from './constants'
import type { ReadOutcome, ResultReader } from './ports'

const received: AnalysisStep[] = [{ code: 'receive', status: 'done' }]

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
    const poll = async () => {
      const next = await reader.read(checkId)
      if (!active) {
        return
      }
      setOutcome(next)
      if (typeof next === 'object') {
        setStatus(next.status)
      }
      if (!isFinal(next)) {
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

function errorText(outcome: ReadOutcome | null): string | null {
  if (outcome === 'not_found') {
    return t.status_hint.technical_failure
  }
  return typeof outcome === 'string' ? t.errors[outcome] : null
}

/**
 * The result page of one check: its steps while it runs, then the result card in a polite
 * `aria-live` region, so a screen reader announces the result. A failed read shows a message,
 * never a verdict, and the page keeps asking; an unknown id stops it.
 *
 * @param props.checkId - The id the API gave the accepted check.
 * @param props.reader - Reads GET /api/v1/checks/{id} (the `src/api` adapter in the app).
 * @param props.pollMs - Pause between reads; tests pass a short one.
 * @returns The result page.
 * @feature US-SPR-01, US-SPR-04, US-BEZ-07, F-01, F-17, F-21
 */
export function ResultPage({
  checkId,
  reader,
  pollMs = POLL_INTERVAL_MS,
}: {
  checkId: string
  reader: ResultReader
  pollMs?: number
}) {
  const { outcome, status } = useCheckStatus(checkId, reader, pollMs)
  const result = status?.result
  const error = errorText(outcome)
  const isRunning = !result && outcome !== 'not_found'
  return (
    <div className="grid min-w-0 gap-4">
      {/* live steps over SSE (meritum-frontend#17) replace this strip once merged */}
      {isRunning && <AnalysisSteps steps={status?.steps ?? received} />}
      {error && (
        <p role="alert" className="text-small text-pretty">
          {error}
        </p>
      )}
      <div aria-live="polite">{result && <CheckResultCard result={result} />}</div>
    </div>
  )
}
