import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useContext } from 'react'
import {
  apiAccount,
  apiAudioUploader,
  apiCheckSender,
  apiHandoff,
  apiProgressSource,
  apiResultReader,
  apiSessionEraser,
} from '@/api'
import { CheckPage } from '@/checks'
import { AiNotice } from '@/components/ai-notice'
import { InboxContext } from '@/notifications'

/**
 * Home page: the conversation of the web channel (ADR-08) with this tab's checks as earlier
 * turns, or a welcome with example claims on an empty tab, the AI notice (AI Act art. 50) above
 * the docked message field, which sends through the API client and opens the result address of
 * an accepted check. „Usuń moje sprawdzenia” also empties the bell. No sign-in is needed.
 *
 * @feature US-SPR-01, US-SPR-09, US-BEZ-05, US-BEZ-07, US-DST-01, F-01, F-20, F-21
 */
export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const navigate = useNavigate()
  const inbox = useContext(InboxContext)
  const clearInbox = useCallback(() => inbox?.clear(), [inbox])
  const open = useCallback(
    (checkId: string) => navigate({ to: '/sprawdzenie/$checkId', params: { checkId } }),
    [navigate],
  )
  return (
    <CheckPage
      sender={apiCheckSender}
      uploader={apiAudioUploader}
      eraser={apiSessionEraser}
      reader={apiResultReader}
      progress={apiProgressSource}
      handoff={apiHandoff}
      account={apiAccount}
      onAccepted={open}
      onErased={clearInbox}
      notice={<AiNotice />}
    />
  )
}
