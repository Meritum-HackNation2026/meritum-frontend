import { useCallback, useState } from 'react'
import { CheckForm } from '@/components/meritum'
import type { CheckRequest } from '@/contracts/meritum'
import { CheckProgress } from './_check-progress'
import { RETENTION_DAYS } from './constants'
import type { CheckSender, ProgressSource, SendOutcome } from './ports'

/**
 * The web check form (ADR-08): the design-system `CheckForm`, without sign-in. API errors,
 * rate limit included, show under the field as a message, never as a verdict; an accepted
 * check shows its live progress.
 *
 * @param props.sender - Sends the request to the API (the `src/api` adapter in the app).
 * @param props.progress - Streams the progress of an accepted check (the `src/api` SSE adapter).
 * @returns The check page.
 * @feature US-SPR-01, US-SPR-02, US-BEZ-07, US-DST-01, F-01, F-09, F-21
 */
export function CheckPage({ sender, progress }: { sender: CheckSender; progress: ProgressSource }) {
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState<SendOutcome | null>(null)

  const submit = useCallback(
    async (request: CheckRequest) => {
      setSending(true)
      setOutcome(null)
      try {
        setOutcome(await sender.send(request))
      } finally {
        setSending(false)
      }
    },
    [sender],
  )

  const isRefused = typeof outcome === 'string'
  return (
    <div className="grid min-w-0 gap-4">
      <CheckForm
        onSubmit={submit}
        pending={sending}
        serverError={isRefused ? outcome : null}
        retentionDays={RETENTION_DAYS}
      />
      {outcome !== null && !isRefused && (
        <CheckProgress key={outcome.checkId} checkId={outcome.checkId} source={progress} />
      )}
    </div>
  )
}
