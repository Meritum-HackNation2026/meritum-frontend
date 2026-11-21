import { useEffect, useState } from 'react'
import { AnalysisSteps, ResultCard, t } from '@/components/meritum'
import type { AnalysisStatus, AnalysisStep } from '@/contracts/meritum'
import { isDraft, shownResult } from './_progress'
import type { ProgressSource } from './ports'

const received: AnalysisStep[] = [{ code: 'receive', status: 'done' }]

/**
 * Progress of one accepted check (DESIGN_SYSTEM.md 6.3): the `AnalysisSteps` strip fed by the
 * streamed `AnalysisStatus`, several research steps active at once. Verdicts wait for verified
 * citations; the result goes into a polite live region; a stream that ends without a result
 * shows a message, never a verdict. Unmounting closes the stream.
 *
 * @param props.checkId - The id from the accepted check.
 * @param props.source - Streams the progress (the `src/api` SSE adapter in the app).
 * @returns The strip, the result region and the connection message.
 * @feature US-SPR-02, F-09
 */
export function CheckProgress({ checkId, source }: { checkId: string; source: ProgressSource }) {
  const [status, setStatus] = useState<AnalysisStatus | null>(null)
  const [lost, setLost] = useState(false)

  useEffect(() => {
    let latest: AnalysisStatus | null = null
    return source.watch(
      checkId,
      (next) => {
        latest = next
        setStatus(next)
      },
      () => setLost(latest === null || shownResult(latest) === null),
    )
  }, [checkId, source])

  const result = status && shownResult(status)
  return (
    <>
      <AnalysisSteps steps={status?.steps ?? received} draft={status !== null && isDraft(status)} />
      {lost && (
        <p role="alert" className="text-small text-muted-foreground">
          {t.status_hint.technical_failure}
        </p>
      )}
      <div aria-live="polite" className="min-w-0">
        {result && <ResultCard result={result} />}
      </div>
    </>
  )
}
