import type { ModeratorCase } from '@/contracts/meritum'
import { SECTION_ROLES } from './constants'
import type { StaffApi, StaffRole, StaffSession } from './ports'

/**
 * One section of the panel navigation.
 *
 * @feature US-MOD-05, F-25
 */
export type PanelSection = keyof typeof SECTION_ROLES

/**
 * What the panel shows once loaded: the session and, for a role that handles cases, the cases
 * (null when the API did not give them).
 *
 * @feature US-MOD-05, US-MOD-02, F-25
 */
export interface PanelData {
  session: StaffSession
  cases: ModeratorCase[] | null
}

const sections = Object.keys(SECTION_ROLES) as PanelSection[]

/**
 * The sections a role sees, in navigation order.
 *
 * @param role - The signed-in member's role.
 * @returns The sections whose roles include it.
 * @feature US-MOD-05, F-25
 */
export function sectionsFor(role: StaffRole): PanelSection[] {
  return sections.filter((section) =>
    (SECTION_ROLES[section] as readonly StaffRole[]).includes(role),
  )
}

/**
 * Reads the session first and the cases only for a member who may see them, so nobody
 * without a role ever gets case data; a session that ends or loses its role in between counts
 * as such.
 *
 * @param api - The staff API.
 * @returns The session and the cases.
 * @feature US-MOD-05, US-MOD-02, F-25
 */
export async function loadPanel(api: StaffApi): Promise<PanelData> {
  const session = await api.session()
  const seesCases = session.kind === 'member' && sectionsFor(session.role).includes('cases')
  const cases = seesCases ? await api.cases() : null
  return typeof cases === 'string' ? { session: { kind: cases }, cases: null } : { session, cases }
}
