import { t } from '@/components/meritum'
import { AccountsSection } from './_accounts'
import { DemoLinksSection } from './_demo-links'
import { Panel } from './_panel'
import type { AdminData } from './_session'
import { TopicsSection } from './_topics'
import type { StaffApi } from './ports'
import type { AdminApi } from './ports-admin'

/**
 * „Administracja” in the panel: the panel header and navigation, then the staff accounts and
 * the high-risk topics and the demo links. Anyone signed out sees the sign-in page; the route sends other roles
 * back to /panel before this renders.
 *
 * @param props.data - The session, accounts and topics from `loadAdmin`.
 * @param props.staff - The staff API (sign-in, sign-out).
 * @param props.admin - The administration API.
 * @returns The page.
 * @feature US-MOD-05, US-OBS-06, F-20, F-25, F-28
 */
export function AdminPage(props: { data: AdminData; staff: StaffApi; admin: AdminApi }) {
  return (
    <Panel data={props.data} api={props.staff}>
      <h1 className="sr-only">{t.staff.admin.title}</h1>
      <div className="grid gap-10">
        <AccountsSection api={props.admin} initial={props.data.accounts} />
        <TopicsSection api={props.admin} initial={props.data.topics} />
        <DemoLinksSection api={props.admin} />
      </div>
    </Panel>
  )
}
