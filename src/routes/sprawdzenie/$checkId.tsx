import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useContext } from 'react'
import {
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
 * Result address of one check at /sprawdzenie/{id}: the same conversation as the home page,
 * with this check as the current turn; the message field goes here once the API accepts a
 * check, and the address can be opened again while the record is kept. „Usuń moje
 * sprawdzenia” empties the thread here too and also empties the bell.
 *
 * @feature US-SPR-01, US-SPR-04, US-SPR-09, US-BEZ-05, F-01, F-17, F-20
 */
export const Route = createFileRoute('/sprawdzenie/$checkId')({ component: Result })

function Result() {
  const { checkId } = Route.useParams()
  const navigate = useNavigate()
  const inbox = useContext(InboxContext)
  const clearInbox = useCallback(() => inbox?.clear(), [inbox])
  const open = useCallback(
    (id: string) => navigate({ to: '/sprawdzenie/$checkId', params: { checkId: id } }),
    [navigate],
  )
  return (
    <CheckPage
      key={checkId}
      sender={apiCheckSender}
      uploader={apiAudioUploader}
      eraser={apiSessionEraser}
      reader={apiResultReader}
      progress={apiProgressSource}
      handoff={apiHandoff}
      activeCheckId={checkId}
      onAccepted={open}
      onErased={clearInbox}
      notice={<AiNotice />}
    />
  )
}
