import { type ReactNode, useCallback, useState } from 'react'
import { Composer, fill, t, Welcome } from '@/components/meritum'
import type { Handoff } from '@/moderation'
import { AccountSection, useAccount } from './_account'
import { useAttachments } from './_attachments'
import { DeleteChecksDialog } from './_delete-checks'
import { forgetChecks, rememberQuestion } from './_history'
import { useSend } from './_send'
import { conversationTurns, Thread, withAccountTurns } from './_thread'
import type { PageArchives } from './archive/ports'
import { RETENTION_DAYS } from './constants'
import type {
  AudioUploader,
  CheckSender,
  CitizenAccount,
  ImageUploader,
  ProgressSource,
  ResultReader,
  SessionEraser,
} from './ports'

/** „Usuń moje sprawdzenia”: the confirmation, the deletion and its outcome; `onEmptied` clears the thread. */
function useErase(
  eraser: SessionEraser,
  onErased: () => Promise<void> | void,
  onEmptied: () => void,
) {
  const [confirming, setConfirming] = useState(false)
  const [erased, setErased] = useState<boolean | null>(null)
  const erase = useCallback(async () => {
    setErased(null)
    const ok = await eraser.erase()
    // the local copies go only once the server deleted its records, so a failure can be retried
    if (ok) {
      forgetChecks()
      onEmptied()
      await onErased()
    }
    setErased(ok)
  }, [eraser, onErased, onEmptied])
  const ask = useCallback(() => setConfirming(true), [])
  return { confirming, setConfirming, ask, erased, erase }
}

type CheckPageProps = {
  sender: CheckSender
  uploader: AudioUploader
  imageUploader: ImageUploader
  eraser: SessionEraser
  reader: ResultReader
  progress: ProgressSource
  handoff: Handoff
  archives?: PageArchives
  account?: CitizenAccount
  onAccepted: (checkId: string) => void
  onErased?: () => Promise<void> | void
  activeCheckId?: string
  notice?: ReactNode
}

/**
 * The web channel as one conversation (ADR-08, DESIGN_SYSTEM.md 6.8), without sign-in: this
 * tab's checks as question–answer turns (`Thread`), or on an empty tab a welcome with example
 * claims; under them `notice` (the AI notice), the privacy line with „Usuń moje sprawdzenia”
 * (asks first, then deletes the session's records on the server, the tab's history and, through
 * `onErased`, its notifications); at the bottom the docked message field. A typed text or link
 * is checked with zod (`validateCheck`) before it is sent; a clicked example is sent the same
 * way. API errors, rate limit included, show under the field, never as a verdict. A recording
 * attaches through the microphone button, a screenshot or photo through the image button. An accepted check keeps its question for the thread
 * and is handed on by its id, to open its result address.
 *
 * @param props.sender - Sends the request to the API (the `src/api` adapter in the app).
 * @param props.uploader - Uploads a recording to the API (the `src/api` adapter in the app).
 * @param props.imageUploader - Uploads a screenshot or photo to the API (the `src/api` adapter in the app).
 * @param props.eraser - Deletes the session's records (the `src/api` adapter in the app).
 * @param props.reader - Reads a check from the API (the `src/api` adapter in the app).
 * @param props.progress - Streams a check's steps (the `src/api` SSE adapter in the app).
 * @param props.handoff - Hands claims to the moderators (the `src/api` adapter in the app).
 * @param props.archives - Archives a checked link („Zarchiwizuj stronę”); no action without it.
 * @param props.account - The optional citizen account (Google or Microsoft sign-in): signed in, the
 * history comes from the server and the page offers sign-out and deleting the history or the
 * account; without it, or signed out, the history stays in sessionStorage.
 * @param props.onAccepted - Called with the id of an accepted check.
 * @param props.onErased - Called after the server deleted the records; empties the inbox.
 * @param props.activeCheckId - The check of the result address, shown as the current turn.
 * @param props.notice - The AI notice, once on the screen, above the field.
 * @returns The conversation page.
 * @feature US-SPR-01, US-SPR-08, US-SPR-09, US-SPR-11, US-BEZ-05, US-BEZ-07, US-DST-01, US-SPR-10, US-KOR-07, F-01, F-08, F-20, F-21, F-31, F-33, F-38
 */
export function CheckPage({
  sender,
  uploader,
  imageUploader,
  eraser,
  reader,
  progress,
  handoff,
  archives,
  account,
  onAccepted,
  onErased = () => undefined,
  activeCheckId,
  notice,
}: CheckPageProps) {
  const [turns, setTurns] = useState(() => conversationTurns(activeCheckId))
  const [value, setValue] = useState('')
  const clearTurns = useCallback(() => setTurns([]), [])
  const { user, remote, signedOut, signOut, forgetRemote, leave } = useAccount(account)
  const emptyAll = useCallback(() => {
    clearTurns()
    forgetRemote()
  }, [clearTurns, forgetRemote])
  const dropAccount = useCallback(() => {
    clearTurns()
    leave()
  }, [clearTurns, leave])
  const sessionErase = useErase(
    user && account ? account.historyEraser : eraser,
    onErased,
    emptyAll,
  )
  const accountErase = useErase(account?.accountEraser ?? eraser, onErased, dropAccount)
  const { confirming, setConfirming, ask, erased, erase } = sessionErase
  const shownTurns = withAccountTurns(turns, remote)
  const accept = useCallback(
    (checkId: string, question: string) => {
      rememberQuestion(checkId, question)
      onAccepted(checkId)
    },
    [onAccepted],
  )
  const { sending, refusal, send } = useSend(sender, accept)
  const attachments = useAttachments({ audio: uploader, image: imageUploader }, sender, accept)
  const pick = useCallback((claim: string) => send({ channel: 'web', text: claim }), [send])
  const busy = sending || attachments.busy

  return (
    // the empty page widens to two columns from 1024 px (data-wide, read by the layout)
    <div className="grid min-w-0 gap-10" data-wide={shownTurns.length === 0 ? '' : undefined}>
      <h1 className="sr-only">{activeCheckId ? t.result.page_title : t.form.title}</h1>
      {shownTurns.length === 0 ? (
        <Welcome onPick={pick} disabled={busy} />
      ) : (
        <Thread
          turns={shownTurns}
          activeCheckId={activeCheckId}
          reader={reader}
          progress={progress}
          handoff={handoff}
          archives={archives}
        />
      )}
      <div className="grid gap-1.5 text-small text-muted-foreground text-pretty">
        {notice}
        <p>
          {fill(t.form.privacy, { days: RETENTION_DAYS })}
          {!user && (
            <>
              {' '}
              <button
                type="button"
                onClick={ask}
                className="py-3 text-foreground underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {t.form.delete_session}
              </button>
            </>
          )}
        </p>
        <p className="text-meta">{user ? t.history.account_note : t.history.session_note}</p>
        {account && (
          <AccountSection
            account={account}
            user={user}
            signedOut={signedOut}
            onSignOut={signOut}
            onDeleteHistory={ask}
            onDeleteAccount={accountErase.ask}
          />
        )}
        <p role="status" className="text-foreground empty:hidden">
          {erased !== null &&
            (erased ? t.channel_privacy.deleted : t.extension.popup_delete_failed)}
        </p>
      </div>
      <div className="sticky bottom-0 z-10 -mx-4 grid bg-background px-4 pt-2 pb-3 sm:pb-4">
        <div aria-live="polite" className="min-w-0 *:mb-3">
          {attachments.messages}
        </div>
        <Composer
          value={value}
          onValueChange={setValue}
          onSubmit={send}
          pending={busy}
          serverError={refusal}
          tools={attachments.tools}
          attachment={attachments.attachment}
          onSendAttachment={attachments.onSend}
          placeholder={
            shownTurns.length > 0 ? t.conversation.next_placeholder : t.form.input_placeholder
          }
          // shortcut: at 150% on 320 px the synced Composer sizes to its placeholder and its send row
          // runs out; reaches into it from here until the design system lets the field shrink
          className="*:min-w-0 [&_textarea]:min-w-0 [&_div:has(>button[type=submit])]:flex-wrap"
        />
      </div>
      <DeleteChecksDialog open={confirming} onOpenChange={setConfirming} onConfirm={erase} />
      <DeleteChecksDialog
        account
        open={accountErase.confirming}
        onOpenChange={accountErase.setConfirming}
        onConfirm={accountErase.erase}
      />
    </div>
  )
}
