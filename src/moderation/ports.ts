import type { ModeratorCase } from '@/contracts/meritum'

/**
 * What a hand-off to the moderators gave: the number of the saved case (created or joined,
 * shown the same), or the `errors` key of copy/pl.json when no case was saved.
 *
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
 */
export type HandoffOutcome =
  | { caseId: string }
  | 'rate_limited_handoff'
  | 'handoff_not_found'
  | 'handoff_rejected'
  | 'busy'
  | 'offline'

/**
 * Hands one claim of a finished check to the moderators.
 *
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
 */
export interface Handoff {
  /**
   * „Przekaż moderatorom”: turns a recommendation into a saved case; never throws.
   *
   * @param checkId - The finished check.
   * @param claimIndex - The claim's position in the check's result.
   * @returns The saved case, or why there is none.
   */
  escalate(checkId: string, claimIndex: number): Promise<HandoffOutcome>
  /**
   * „Zgłoś błąd”: opens or joins a case with reason `user_dispute`; never throws.
   *
   * @param checkId - The finished check.
   * @param claimIndex - The claim's position in the check's result.
   * @param justification - What the person thinks is wrong; blank means none.
   * @returns The saved case, or why there is none.
   */
  dispute(checkId: string, claimIndex: number, justification: string): Promise<HandoffOutcome>
}

/**
 * A role in the panel, granted by an administrator (backend#22).
 *
 * @feature US-MOD-05, F-25
 */
export type StaffRole = 'moderator' | 'analyst' | 'admin'

/**
 * An OIDC provider staff sign in with (backend#15).
 *
 * @feature US-MOD-05, F-25
 */
export type LoginProvider = 'google' | 'microsoft'

/**
 * Who opened the panel: a staff member with a role, nobody signed in, a session that ended
 * while the panel loaded, a signed-in account without a role, or an API that did not answer.
 *
 * @feature US-MOD-05, F-25
 */
export type StaffSession =
  | { kind: 'member'; email: string; role: StaffRole }
  | { kind: 'signed_out' }
  | { kind: 'expired' }
  | { kind: 'no_access' }
  | { kind: 'failed' }

/**
 * The staff API of meritum-backend: the signed-in member, the cases and sign-out. Adapters
 * never throw.
 *
 * @feature US-MOD-05, US-MOD-02, F-25
 */
export interface StaffApi {
  /**
   * Where the browser goes to sign in with one provider.
   *
   * @param provider - The OIDC provider.
   * @returns The login address of the API.
   */
  loginUrl(provider: LoginProvider): string
  /**
   * Reads the signed-in member and their role.
   *
   * @returns The session, `failed` when the API cannot be reached.
   */
  session(): Promise<StaffSession>
  /**
   * Reads the moderator cases.
   *
   * @returns The cases; `expired` when the session ended, `no_access` when the role was taken
   *   away, null when the API cannot be read.
   */
  cases(): Promise<ModeratorCase[] | 'expired' | 'no_access' | null>
  /** Ends the staff session on the server. */
  signOut(): Promise<void>
}
