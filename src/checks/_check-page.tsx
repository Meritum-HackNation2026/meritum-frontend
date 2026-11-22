import { type ReactNode, useCallback, useState } from 'react'
import { CheckHistory, Composer, fill, QuotedClaim, t } from '@/components/meritum'
import type { Handoff } from '@/moderation'
import { AccountSection, useAccount } from './_account'
import { useAttachments } from './_attachments'
import { DeleteChecksDialog, useErase } from './_delete-checks'
import { FileDrop } from './_file-drop'
import { rememberQuestion } from './_history'
import { historyItems } from './_new-check'
import { PageArchive } from './_page-archive'
import { ResultPage } from './_result-page'
import { useSend } from './_send'
import { conversationTurns, withAccountTurns } from './_turns'
import { LINK_QUESTION } from './archive/constants'
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

const fileQuestions = [
  ['audio', t.conversation.audio_question],
  ['image', t.conversation.image_question],
] as const

/** The claim heading: a sent recording or image by its file name, a text in quotes, else the page title. */
function Heading({ question }: { question: string | undefined }) {
  if (!question) {
    return <h1 className="text-title font-bold tracking-tight">{t.result.page_title}</h1>
  }
  for (const [kind, template] of fileQuestions) {
    const prefix = fill(template, { name: '' })
    if (question.startsWith(prefix)) {
      return <QuotedClaim file={{ kind, name: question.slice(prefix.length) }} />
    }
  }
  return <QuotedClaim>{question}</QuotedClaim>
}

type CheckPageProps = {
  checkId: string
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
  onOpen: (checkId: string) => void
  onNew: () => void
  rail: (content: ReactNode) => ReactNode
  onErased?: () => Promise<void> | void
  notice?: ReactNode
}

/**
 * One check on its own page (DESIGN_SYSTEM.md 6.8): the question as the
 * h1 quote (`QuotedClaim`), the archive of a checked link, then the progress bar while the check
 * runs and the result as a list of claims once it is there (`ResultPage`). Only after the run
 * ended comes the field „Sprawdź kolejną informację”: an accepted check opens its own page. Under
 * it, quietly, the AI notice, the privacy line with „Usuń moje sprawdzenia” and the account; both
 * deletions ask first. The rail holds „Nowe sprawdzenie” and this tab's (or the account's) checks.
 *
 * @param props.checkId - The check of the address.
 * @param props.sender - Sends the request to the API (the `src/api` adapter in the app).
 * @param props.uploader - Uploads a recording to the API (the `src/api` adapter in the app).
 * @param props.imageUploader - Uploads a screenshot or photo to the API (the `src/api` adapter in the app).
 * @param props.eraser - Deletes the session's records (the `src/api` adapter in the app).
 * @param props.reader - Reads a check from the API (the `src/api` adapter in the app).
 * @param props.progress - Streams a check's steps (the `src/api` SSE adapter in the app).
 * @param props.handoff - Hands claims to the moderators (the `src/api` adapter in the app).
 * @param props.archives - Archives a checked link („Zarchiwizuj stronę”); no action without it.
 * @param props.account - The optional citizen account: signed in, the history comes from the
 * server and the page offers sign-out and deleting the history or the account.
 * @param props.onAccepted - Called with the id of an accepted next check.
 * @param props.onOpen - Called with the id of a check clicked in the rail.
 * @param props.onNew - Called by „Nowe sprawdzenie” in the rail.
 * @param props.rail - Puts its content into the layout's side rail.
 * @param props.onErased - Called after the server deleted the records; empties the inbox.
 * @param props.notice - The AI notice.
 * @returns The check page.
 * @feature US-SPR-01, US-SPR-02, US-SPR-04, US-SPR-08, US-SPR-09, US-SPR-10, US-SPR-11, US-BEZ-05, US-BEZ-07, US-KOR-07, F-01, F-08, F-09, F-17, F-20, F-21, F-31, F-33, F-38
 */
export function CheckPage({
  checkId,
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
  onOpen,
  onNew,
  rail,
  onErased = () => undefined,
  notice,
}: CheckPageProps) {
  const [value, setValue] = useState('')
  const [ended, setEnded] = useState(false)
  // bumped when the rail must read the tab's history again (a deletion, a result that arrived)
  const [, setVersion] = useState(0)
  const reread = useCallback(() => setVersion((n) => n + 1), [])
  const markEnded = useCallback(() => {
    setEnded(true)
    reread()
  }, [reread])
  const { user, remote, signedOut, signOut, forgetRemote, leave } = useAccount(account)
  const emptyAll = useCallback(() => {
    forgetRemote()
    reread()
  }, [forgetRemote, reread])
  const dropAccount = useCallback(() => {
    leave()
    reread()
  }, [leave, reread])
  const sessionErase = useErase(
    user && account ? account.historyEraser : eraser,
    onErased,
    emptyAll,
  )
  const accountErase = useErase(account?.accountEraser ?? eraser, onErased, dropAccount)
  const { confirming, setConfirming, ask, erased, erase } = sessionErase
  const question = withAccountTurns(conversationTurns(checkId), remote).find(
    (turn) => turn.checkId === checkId,
  )?.question
  const accept = useCallback(
    (id: string, asked: string) => {
      rememberQuestion(id, asked)
      onAccepted(id)
    },
    [onAccepted],
  )
  const { sending, refusal, send } = useSend(sender, accept)
  const attachments = useAttachments({ audio: uploader, image: imageUploader }, sender, accept)
  const busy = sending || attachments.busy
  const link = question?.trim()

  return (
    <div className="grid min-w-0 content-start gap-10">
      <Heading question={question} />
      {archives && link && LINK_QUESTION.test(link) && (
        <PageArchive url={link} archives={archives} />
      )}
      <ResultPage
        checkId={checkId}
        reader={reader}
        progress={progress}
        handoff={handoff}
        focusOnAnswer
        onEnded={markEnded}
      />
      {ended && (
        <section aria-labelledby="sprawdz-kolejna" className="grid min-w-0 gap-3 pt-4">
          <h2 id="sprawdz-kolejna" className="text-body font-semibold">
            {t.check_page.next}
          </h2>
          <div aria-live="polite" className="min-w-0 empty:hidden *:mb-3">
            {attachments.messages}
          </div>
          <FileDrop {...attachments.drop} disabled={busy}>
            <Composer
              value={value}
              onValueChange={setValue}
              onSubmit={send}
              pending={busy}
              serverError={refusal}
              tools={attachments.tools}
              attachment={attachments.attachment}
              onSendAttachment={attachments.onSend}
              placeholder={t.conversation.next_placeholder}
              // shortcut: at 150% on 320 px the synced Composer sized to its placeholder and its send
              // row ran out; this reaches into it until the design system lets it shrink
              className="*:min-w-0 [&_textarea]:min-w-0 [&_div:has(>button[type=submit])]:flex-wrap"
            />
          </FileDrop>
        </section>
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
                className="cursor-pointer py-3 text-foreground underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {t.form.delete_session}
              </button>
            </>
          )}
        </p>
        {user && <p className="text-meta">{t.history.account_note}</p>}
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
      {rail(
        <CheckHistory
          items={historyItems(remote)}
          onOpen={onOpen}
          onNew={onNew}
          // shortcut: CheckHistory says „only in this browser” unless it gets its own account
          // buttons, which AccountSection already has; hide its note while signed in until the
          // design system takes the signed-in state on its own
          className={user ? '[&>p:last-child]:hidden' : ''}
        />,
      )}
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
