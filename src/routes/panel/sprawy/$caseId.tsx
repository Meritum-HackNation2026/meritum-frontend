import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { apiAnswers, apiStaff } from '@/api'
import { caseIdOf, caseParam, loadPanel, Panel } from '@/moderation'

/**
 * One case's address in the panel, /panel/sprawy/{case} (`S-4` for `#S-4`): the panel with the
 * queue and this case open below it, so a link or a reload opens the same case. Another row
 * changes the address.
 *
 * @feature US-MOD-01, US-MOD-05, US-MOD-07, F-25, F-39
 */
export const Route = createFileRoute('/panel/sprawy/$caseId')({
  loader: () => loadPanel(apiStaff),
  component: CasePage,
})

function CasePage() {
  const { caseId } = Route.useParams()
  const navigate = useNavigate()
  const openCase = useCallback(
    (id: string) => navigate({ to: '/panel/sprawy/$caseId', params: { caseId: caseParam(id) } }),
    [navigate],
  )
  return (
    <Panel
      data={Route.useLoaderData()}
      api={apiStaff}
      answers={apiAnswers}
      openCaseId={caseIdOf(caseId)}
      onOpenCase={openCase}
    />
  )
}
