import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { apiCheckSender } from '@/api'
import { CheckPage } from '@/checks'
import { AiNotice } from '@/components/ai-notice'

/**
 * Home page: the AI notice (AI Act art. 50) above the check form of the web channel
 * (ADR-08), which sends through the API client and opens the result page of an accepted
 * check. No sign-in is needed.
 *
 * @feature US-SPR-01, US-BEZ-07, US-DST-01, F-01, F-21
 */
export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const navigate = useNavigate()
  const open = useCallback(
    (checkId: string) => navigate({ to: '/sprawdzenie/$checkId', params: { checkId } }),
    [navigate],
  )
  return (
    <div className="grid min-w-0 gap-4">
      <AiNotice />
      <CheckPage sender={apiCheckSender} onAccepted={open} />
    </div>
  )
}
