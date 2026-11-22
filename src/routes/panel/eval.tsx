import { createFileRoute, redirect } from '@tanstack/react-router'
import { apiEval, apiStaff } from '@/api'
import { inRail } from '@/components/app-shell'
import { Panel } from '@/moderation'
import { EvalPage, loadEval } from '@/observability'

/**
 * The evaluation page at /panel/eval inside the panel: the session and runs are read before
 * the page shows. Only analysts and administrators get runs; any other role goes back to
 * /panel, a person signed out sees the sign-in page.
 *
 * @feature US-OBS-06, US-OBS-05, F-28
 */
export const Route = createFileRoute('/panel/eval')({
  loader: async () => {
    const data = await loadEval(apiStaff, apiEval)
    if (data.session.kind === 'member' && !data.allowed) {
      throw redirect({ to: '/panel' })
    }
    return data
  },
  component: EvalRoute,
})

function EvalRoute() {
  const { session, runs } = Route.useLoaderData()
  const readOnly = session.kind === 'member' && session.readOnly
  return (
    <Panel data={{ session }} api={apiStaff} rail={inRail}>
      <EvalPage runs={runs} api={apiEval} readOnly={readOnly} />
    </Panel>
  )
}
