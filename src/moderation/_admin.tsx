import { t } from '@/components/meritum'
import { AccountsSection } from './_accounts'
import { Panel } from './_panel'
import type { AdminData } from './_session'
import { TopicsSection } from './_topics'
import type { AdminApi, StaffApi } from './ports'

/**
 * „Administracja” in the panel: the panel header and navigation, then the staff accounts and
 * the high-risk topics. Anyone signed out sees the sign-in page; the route sends other roles
 * back to /panel before this renders.
 *
 * @param props.data - The session, accounts and topics from `loadAdmin`.
 * @param props.staff - The staff API (sign-in, sign-out).
 * @param props.admin - The administration API.
 * @returns The page.
 * @feature US-MOD-05, F-20, F-25
 */
export function AdminPage(props: { data: AdminData; staff: StaffApi; admin: AdminApi }) {
  return (
    <Panel data={props.data} api={props.staff}>
      <h1 className="sr-only">{t.staff.admin.title}</h1>
      <div className="grid gap-10">
        <AccountsSection api={props.admin} initial={props.data.accounts} />
        <TopicsSection api={props.admin} initial={props.data.topics} />
      </div>
    </Panel>
  )
}
