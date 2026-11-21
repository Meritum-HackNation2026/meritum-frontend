import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'
import { apiStaff } from '@/api'
import { loadPanel, Panel } from '@/moderation'

/**
 * The moderator panel at /panel: the staff session and cases are read before the page shows,
 * so a person without a role only ever sees the sign-in page.
 *
 * @feature US-MOD-05, US-MOD-02, US-POW-05, F-25
 */
export const Route = createFileRoute('/panel/')({
  loader: () => loadPanel(apiStaff),
  component: PanelPage,
})

function PanelPage() {
  const router = useRouter()
  const reload = useCallback(() => router.invalidate(), [router])
  return <Panel data={Route.useLoaderData()} api={apiStaff} onSignedOut={reload} />
}
