import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useContext } from 'react'
import {
  apiAccount,
  apiArchives,
  apiAudioUploader,
  apiCheckSender,
  apiHandoff,
  apiImageUploader,
  apiProgressSource,
  apiResultReader,
  apiSessionEraser,
} from '@/api'
import { CheckPage } from '@/checks'
import { AiNotice } from '@/components/ai-notice'
import { inRail } from '@/components/app-shell'
import { InboxContext } from '@/notifications'

/**
 * The page of one check at /sprawdzenie/{id}: its question as the heading, the progress, then
 * the result and the field for the next check, which opens the next check's own page; the
 * earlier checks stand in the side rail. The address can be opened again while the record is
 * kept. „Usuń moje sprawdzenia” empties the rail here and also empties the bell.
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
  const startNew = useCallback(() => navigate({ to: '/sprawdz' }), [navigate])
  return (
    <CheckPage
      key={checkId}
      sender={apiCheckSender}
      uploader={apiAudioUploader}
      imageUploader={apiImageUploader}
      eraser={apiSessionEraser}
      reader={apiResultReader}
      progress={apiProgressSource}
      handoff={apiHandoff}
      archives={apiArchives}
      account={apiAccount}
      checkId={checkId}
      onAccepted={open}
      onOpen={open}
      onNew={startNew}
      rail={inRail}
      onErased={clearInbox}
      notice={<AiNotice />}
    />
  )
}
