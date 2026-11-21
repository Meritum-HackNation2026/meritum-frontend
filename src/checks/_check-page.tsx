import { useCallback, useState } from 'react'
import { CheckForm } from '@/components/meritum'
import type { CheckRequest } from '@/contracts/meritum'
import { RETENTION_DAYS } from './constants'
import type { CheckSender, SendOutcome } from './ports'

/**
 * The web check form (ADR-08): the design-system `CheckForm`, without sign-in. API errors,
 * rate limit included, show under the field as a message, never as a verdict; an accepted
 * check is handed on by its id, to open its result page.
 *
 * @param props.sender - Sends the request to the API (the `src/api` adapter in the app).
 * @param props.onAccepted - Called with the id of an accepted check.
 * @returns The check page.
 * @feature US-SPR-01, US-BEZ-07, US-DST-01, F-01, F-21
 */
export function CheckPage({
  sender,
  onAccepted,
}: {
  sender: CheckSender
  onAccepted: (checkId: string) => void
}) {
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState<SendOutcome | null>(null)

  const submit = useCallback(
    async (request: CheckRequest) => {
      setSending(true)
      setOutcome(null)
      try {
        const next = await sender.send(request)
        setOutcome(next)
        if (typeof next === 'object') {
          onAccepted(next.checkId)
        }
      } finally {
        setSending(false)
      }
    },
    [sender, onAccepted],
  )

  const isRefused = typeof outcome === 'string'
  return (
    <CheckForm
      onSubmit={submit}
      pending={sending}
      serverError={isRefused ? outcome : null}
      retentionDays={RETENTION_DAYS}
    />
  )
}
