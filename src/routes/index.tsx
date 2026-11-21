import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useContext } from 'react'
import { apiAudioUploader, apiCheckSender, apiSessionEraser } from '@/api'
import { CheckPage } from '@/checks'
import { AiNotice } from '@/components/ai-notice'
import { InboxContext } from '@/notifications'

/**
 * Home page: the AI notice (AI Act art. 50) above the check form of the web channel
 * (ADR-08), which sends through the API client and opens the result page of an accepted
 * check. Below it, this tab's checks and „Usuń moje sprawdzenia”, which also empties the bell.
 * No sign-in is needed.
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
    <div className="grid min-w-0 gap-4">
      <AiNotice />
      <CheckPage
        sender={apiCheckSender}
        uploader={apiAudioUploader}
        eraser={apiSessionEraser}
        onAccepted={open}
        onErased={clearInbox}
      />
    </div>
  )
}
