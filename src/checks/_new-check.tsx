import { type MouseEvent, type ReactNode, useCallback, useMemo, useState } from 'react'
import { CheckHistory, Composer, type HistoryItem, t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import { useAccount } from './_account'
import { useAttachments } from './_attachments'
import { rememberQuestion, savedChecks } from './_history'
import { useSend } from './_send'
import { conversationTurns, withAccountTurns } from './_thread'
import type {
  AccountCheck,
  AudioUploader,
  CheckSender,
  CitizenAccount,
  ImageUploader,
} from './ports'

type NewCheckProps = {
  sender: CheckSender
  uploader: AudioUploader
  imageUploader: ImageUploader
  onAccepted: (checkId: string) => void
  notice?: ReactNode
}

/**
 * The page of a new check (/sprawdz): the title and the lead, the field in the flow of the page
 * (not docked to the bottom), the example claims as buttons and `notice` (the AI notice). A typed
 * text or link goes through zod and the API (`useSend`), a clicked example the same way, a
 * recording or an image through the field's attachment buttons. An accepted check keeps its
 * question for the tab's history and is handed on by its id, to open its address.
 *
 * @param props.sender - Sends the request to the API (the `src/api` adapter in the app).
 * @param props.uploader - Uploads a recording to the API (the `src/api` adapter in the app).
 * @param props.imageUploader - Uploads a screenshot or photo to the API (the `src/api` adapter in the app).
 * @param props.onAccepted - Called with the id of an accepted check.
 * @param props.notice - The AI notice, under the examples.
 * @returns The new check page.
 * @feature US-SPR-01, US-SPR-08, US-SPR-11, US-BEZ-07, F-01, F-08, F-21, F-33
 */
export function NewCheckPage({
  sender,
  uploader,
  imageUploader,
  onAccepted,
  notice,
}: NewCheckProps) {
  const [value, setValue] = useState('')
  const accept = useCallback(
    (checkId: string, question: string) => {
      rememberQuestion(checkId, question)
      onAccepted(checkId)
    },
    [onAccepted],
  )
  const { sending, refusal, send } = useSend(sender, accept)
  const attachments = useAttachments({ audio: uploader, image: imageUploader }, sender, accept)
  // the button's value is its claim, so one handler serves every example
  const pick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) =>
      send({ channel: 'web', text: event.currentTarget.value }),
    [send],
  )
  const busy = sending || attachments.busy
  return (
    <div className="grid min-w-0 content-start gap-8">
      <div className="grid gap-3">
        <h1 className="text-headline font-bold tracking-tight text-balance">{t.form.title}</h1>
        <p className="max-w-prose text-body text-muted-foreground text-pretty">{t.form.lead}</p>
      </div>
      <div className="grid min-w-0">
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
          placeholder={t.form.input_placeholder}
          // shortcut: at 150% on 320 px the synced Composer sized to its placeholder and its send
          // row ran out; this reaches into it until the design system lets it shrink
          className="*:min-w-0 [&_textarea]:min-w-0 [&_div:has(>button[type=submit])]:flex-wrap"
        />
      </div>
      <div className="grid gap-3">
        <p className="text-small text-muted-foreground">{t.conversation.examples_lead}</p>
        <ul className="flex flex-wrap gap-2">
          {t.conversation.examples.map((claim) => (
            <li key={claim}>
              <Button
                variant="outline"
                disabled={busy}
                value={claim}
                onClick={pick}
                className="h-auto min-h-11 rounded-pill px-4 py-2 text-left text-small font-normal whitespace-normal"
              >
                „{claim}”
              </Button>
            </li>
          ))}
        </ul>
      </div>
      <div className="max-w-prose text-pretty">{notice}</div>
    </div>
  )
}

/** This tab's checks (and a signed-in account's), newest first, as the rail lists them. */
function historyItems(remote: AccountCheck[]): HistoryItem[] {
  const results = new Map(savedChecks().map(({ result }) => [result.check_id, result]))
  return withAccountTurns(conversationTurns(), remote)
    .map(({ checkId, at, question, answeredAt }) => {
      const main = results.get(checkId)?.claims?.[0]
      const item: HistoryItem = {
        checkId,
        label: question ?? main?.claim ?? '',
        at: answeredAt ?? at,
      }
      return main ? { ...item, verdict: main.verdict } : item
    })
    .reverse()
}

/**
 * „Twoje sprawdzenia” for the side rail: this tab's checks from sessionStorage and, for a
 * signed-in citizen, the account's checks from the server, newest first; a click opens the
 * check's address.
 *
 * @param props.account - The optional citizen account; without it only this tab's checks show.
 * @param props.onOpen - Called with the id of the clicked check.
 * @returns The history section.
 * @feature US-SPR-09, US-SPR-10, US-BEZ-05, F-01, F-20, F-31
 */
export function SessionHistory({
  account,
  onOpen,
}: {
  account?: CitizenAccount
  onOpen: (checkId: string) => void
}) {
  const { remote } = useAccount(account)
  const items = useMemo(() => historyItems(remote), [remote])
  return <CheckHistory items={items} onOpen={onOpen} />
}
