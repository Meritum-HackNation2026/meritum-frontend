import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { apiAnswers, apiStaff } from '@/api'
import { inRail } from '@/components/app-shell'
import { caseParam, loadPanel, Panel } from '@/moderation'

/**
 * The moderator panel at /panel: the staff session and cases are read before the page shows,
 * so a person without a role only ever sees the sign-in page. Opening a case goes to its own
 * address, /panel/sprawy/{case}. The panel navigation and session stand in the rail.
 *
 * @feature US-MOD-05, US-MOD-02, US-POW-05, US-MOD-01, F-25
 */
export const Route = createFileRoute('/panel/')({
  loader: () => loadPanel(apiStaff),
  component: PanelPage,
})

function PanelPage() {
  const navigate = useNavigate()
  const openCase = useCallback(
    (caseId: string) =>
      navigate({ to: '/panel/sprawy/$caseId', params: { caseId: caseParam(caseId) } }),
    [navigate],
  )
  return (
    <Panel
      data={Route.useLoaderData()}
      api={apiStaff}
      answers={apiAnswers}
      onOpenCase={openCase}
      rail={inRail}
    />
  )
}
