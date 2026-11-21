import { useCallback, useState } from 'react'
import { CheckForm, t } from '@/components/meritum'
import type { CheckRequest } from '@/contracts/meritum'
import { AudioCheck } from './_audio-check'
import { DeleteChecksDialog } from './_delete-checks'
import { forgetChecks, savedChecks } from './_history'
import { type ErrorKey, validateCheck } from './_request'
import { SessionHistory } from './_session-history'
import { RETENTION_DAYS } from './constants'
import type { AudioUploader, CheckSender, SendOutcome, SessionEraser } from './ports'

/** This tab's history and „Usuń moje sprawdzenia”: the confirmation, the deletion, its outcome. */
function useSessionHistory(eraser: SessionEraser, onErased: () => Promise<void> | void) {
  const [confirming, setConfirming] = useState(false)
  const [erased, setErased] = useState<boolean | null>(null)
  const [items, setItems] = useState(savedChecks)
  const erase = useCallback(async () => {
    setErased(null)
    const ok = await eraser.erase()
    // the local copies go only once the server deleted its records, so a failure can be retried
    if (ok) {
      forgetChecks()
      setItems([])
      await onErased()
    }
    setErased(ok)
  }, [eraser, onErased])
  const ask = useCallback(() => setConfirming(true), [])
  return { confirming, setConfirming, ask, erased, items, erase }
}

/**
 * The web check form (ADR-08): the design-system `CheckForm`, without sign-in. The request is
 * checked with zod (`validateCheck`) before it is sent. API errors,
 * rate limit included, show under the field as a message, never as a verdict; an accepted
 * check is handed on by its id, to open its result page. Below the form, this tab's checks
 * (sessionStorage) open their results; „Usuń moje sprawdzenia” next to the 30-day retention
 * line asks first, then deletes the session's records on the server, the tab's history and,
 * through `onErased`, its notifications. Under the form, „Albo nagranie” takes a recording
 * instead (`AudioCheck`).
 *
 * @param props.sender - Sends the request to the API (the `src/api` adapter in the app).
 * @param props.uploader - Uploads a recording to the API (the `src/api` adapter in the app).
 * @param props.eraser - Deletes the session's records (the `src/api` adapter in the app).
 * @param props.onAccepted - Called with the id of an accepted check or one picked in the list.
 * @param props.onErased - Called after the server deleted the records; empties the inbox.
 * @returns The check page.
 * @feature US-SPR-01, US-SPR-09, US-SPR-11, US-BEZ-05, US-BEZ-07, US-DST-01, F-01, F-08, F-20, F-21
 */
export function CheckPage({
  sender,
  uploader,
  eraser,
  onAccepted,
  onErased = () => undefined,
}: {
  sender: CheckSender
  uploader: AudioUploader
  eraser: SessionEraser
  onAccepted: (checkId: string) => void
  onErased?: () => Promise<void> | void
}) {
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState<SendOutcome | ErrorKey | null>(null)
  const { confirming, setConfirming, ask, erased, items, erase } = useSessionHistory(
    eraser,
    onErased,
  )

  const submit = useCallback(
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
    <div className="grid min-w-0 gap-8">
      <div className="grid gap-2">
        <CheckForm
          onSubmit={submit}
          pending={sending}
          serverError={isRefused ? outcome : null}
          retentionDays={RETENTION_DAYS}
          onDeleteChecks={ask}
        />
        <p role="status" className="text-small text-pretty empty:hidden">
          {erased !== null &&
            (erased ? t.channel_privacy.deleted : t.extension.popup_delete_failed)}
        </p>
      </div>
      <AudioCheck uploader={uploader} sender={sender} onAccepted={onAccepted} />
      <SessionHistory items={items} onOpen={onAccepted} />
      <DeleteChecksDialog open={confirming} onOpenChange={setConfirming} onConfirm={erase} />
    </div>
  )
}
