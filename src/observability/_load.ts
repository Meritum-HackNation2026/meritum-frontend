import { type StaffApi, type StaffSession, sectionsFor } from '@/moderation'
import type { EvalApi, EvalRun } from './ports'

/**
 * What the evaluation page shows once loaded: the session and, for analysts and
 * administrators, the runs (null when the API did not give them); `allowed` is false for a
 * role that may not see them.
 *
 * @feature US-OBS-06, F-28
 */
export interface EvalData {
  session: StaffSession
  allowed: boolean
  runs: EvalRun[] | null
}

/**
 * Reads the session first and the runs only for a role that may see them, so a moderator never
 * gets run data; a session that ends or loses its role in between counts as such.
 *
 * @param staff - The staff API.
 * @param api - The evaluation API.
 * @returns The session and the runs.
 * @feature US-OBS-06, F-28
 */
export async function loadEval(staff: StaffApi, api: EvalApi): Promise<EvalData> {
  const session = await staff.session()
  const allowed = session.kind === 'member' && sectionsFor(session.role).includes('evaluation')
  const runs = allowed ? await api.runs() : null
  if (typeof runs === 'string') {
    return { session: { kind: runs }, allowed: false, runs: null }
  }
  return { session, allowed, runs }
}

/**
 * Reads the session for the export page; the export itself is a download the person starts, so
 * nothing else is read. `allowed` is false for a role that may not export.
 *
 * @param staff - The staff API.
 * @returns The session and whether its role may export.
 * @feature US-OBS-03, F-36
 */
export async function loadExport(
  staff: StaffApi,
): Promise<{ session: StaffSession; allowed: boolean }> {
  const session = await staff.session()
  return {
    session,
    allowed: session.kind === 'member' && sectionsFor(session.role).includes('export'),
  }
}
