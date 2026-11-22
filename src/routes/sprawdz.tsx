import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { apiAccount, apiAudioUploader, apiCheckSender, apiImageUploader } from '@/api'
import { NewCheckPage, SessionHistory } from '@/checks'
import { AiNotice } from '@/components/ai-notice'
import { Rail } from '@/components/app-shell'

/**
 * The page of a new check at /sprawdz: the field, the example claims and the AI notice (AI Act
 * art. 50), with this tab's checks in the side rail. An accepted check opens its address. No
 * sign-in is needed.
 *
 * @feature US-SPR-01, US-SPR-09, US-BEZ-07, F-01, F-21
 */
export const Route = createFileRoute('/sprawdz')({ component: NewCheck })

function NewCheck() {
  const navigate = useNavigate()
  const open = useCallback(
    (checkId: string) => navigate({ to: '/sprawdzenie/$checkId', params: { checkId } }),
    [navigate],
  )
  return (
    <>
      <NewCheckPage
        sender={apiCheckSender}
        uploader={apiAudioUploader}
        imageUploader={apiImageUploader}
        onAccepted={open}
        notice={<AiNotice />}
      />
      <Rail>
        <SessionHistory account={apiAccount} onOpen={open} />
      </Rail>
    </>
  )
}
