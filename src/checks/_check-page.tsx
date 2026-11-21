import { useCallback, useState } from 'react'
import { AnalysisSteps, CheckForm } from '@/components/meritum'
import type { AnalysisStep, CheckRequest } from '@/contracts/meritum'
import { RETENTION_DAYS } from './constants'
import type { CheckSender, SendOutcome } from './ports'

const received: AnalysisStep[] = [{ code: 'receive', status: 'done' }]

/**
 * The web check form (ADR-08): the design-system `CheckForm`, without sign-in. API errors,
 * rate limit included, show under the field as a message, never as a verdict; an accepted
 * check shows its progress.
 *
 * @param props.sender - Sends the request to the API (the `src/api` adapter in the app).
 * @returns The check page.
 * @feature US-SPR-01, US-BEZ-07, US-DST-01, F-01, F-21
 */
export function CheckPage({ sender }: { sender: CheckSender }) {
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

  const isAccepted = outcome === 'accepted'
  return (
    <div className="grid min-w-0 gap-4">
      <CheckForm
        onSubmit={submit}
        pending={sending}
        serverError={isAccepted ? null : outcome}
        retentionDays={RETENTION_DAYS}
      />
      {isAccepted && <AnalysisSteps steps={received} />}
    </div>
  )
}
