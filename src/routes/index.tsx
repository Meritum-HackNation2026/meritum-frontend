import { createFileRoute } from '@tanstack/react-router'
import { apiCheckSender, apiProgressSource } from '@/api'
import { CheckPage } from '@/checks'
import { AiNotice } from '@/components/ai-notice'

/**
 * Home page: the AI notice (AI Act art. 50) above the check form of the web channel
 * (ADR-08), which sends through the API client and streams the progress. No sign-in is needed.
 *
 * @feature US-SPR-01, US-SPR-02, US-BEZ-07, US-DST-01, F-01, F-09, F-21
 */
export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="grid min-w-0 gap-4">
      <AiNotice />
      <CheckPage sender={apiCheckSender} progress={apiProgressSource} />
    </div>
  )
}
