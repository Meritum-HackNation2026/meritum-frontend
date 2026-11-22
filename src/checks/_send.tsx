import { useCallback, useState } from 'react'
import type { CheckRequest } from '@/contracts/meritum'
import { type ErrorKey, validateCheck } from './_request'
import type { CheckSender, SendOutcome } from './ports'

/**
 * Sends a typed or picked request: zod first (`validateCheck`), then the API; an accepted check
 * is handed on with its question line. A refusal (zod or API, rate limit included) is kept for
 * the field to show, never as a verdict.
 *
 * @param sender - Sends the request to the API (the `src/api` adapter in the app).
 * @param onAccepted - Called with the id of an accepted check and its question.
 * @returns Whether a request is on its way, the refusal to show and `send`.
 * @feature US-SPR-01, F-01
 */
export function useSend(
  sender: CheckSender,
  onAccepted: (checkId: string, question: string) => void,
) {
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState<SendOutcome | ErrorKey | null>(null)
  const send = useCallback(
    async (form: CheckRequest) => {
      const request = validateCheck(form)
      if (typeof request === 'string') {
        setOutcome(request)
        return
      }
      setSending(true)
      setOutcome(null)
      try {
        const next = await sender.send(request)
        setOutcome(next)
        if (typeof next === 'object') {
          onAccepted(next.checkId, request.text ?? request.url ?? '')
        }
      } finally {
        setSending(false)
      }
    },
    [sender, onAccepted],
  )
  return { sending, refusal: typeof outcome === 'string' ? outcome : null, send }
}
