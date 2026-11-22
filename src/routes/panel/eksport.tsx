import { createFileRoute, redirect } from '@tanstack/react-router'
import { apiExport, apiStaff } from '@/api'
import { inRail } from '@/components/app-shell'
import { Panel } from '@/moderation'
import { ExportPage, loadExport } from '@/observability'

/**
 * The export page at /panel/eksport inside the panel: the session is read before the page
 * shows. Only analysts and administrators export; any other role goes back to /panel, a person
 * signed out sees the sign-in page.
 *
 * @feature US-OBS-03, F-36
 */
export const Route = createFileRoute('/panel/eksport')({
  loader: async () => {
    const data = await loadExport(apiStaff)
    if (data.session.kind === 'member' && !data.allowed) {
      throw redirect({ to: '/panel' })
    }
    return data
  },
  component: ExportRoute,
})

function ExportRoute() {
  const { session } = Route.useLoaderData()
  return (
    <Panel data={{ session }} api={apiStaff} rail={inRail}>
      <ExportPage api={apiExport} />
    </Panel>
  )
}
