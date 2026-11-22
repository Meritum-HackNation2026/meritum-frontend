import type { ModeratorCase } from '@/contracts/meritum'

/**
 * What a hand-off to the moderators gave: the number of the saved case (created or joined,
 * shown the same), or why no case was saved: an `errors` key of copy/pl.json, or `not_saved`
 * (`escalation.not_saved`) when the server failed or answered without a case.
 *
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
 */
export type HandoffOutcome =
  | { caseId: string }
  | 'rate_limited_handoff'
  | 'handoff_not_found'
  | 'handoff_rejected'
  | 'not_saved'
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
 * Who opened the panel: a staff member with a role (a jury session has no address and only
 * reads), nobody signed in, a session that ended while the panel loaded, a signed-in account
 * without a role, or an API that did not answer.
 *
 * @feature US-MOD-05, F-25
 */
export type StaffSession =
  | { kind: 'member'; email: string | null; role: StaffRole; readOnly: boolean }
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
   * @param returnTo - The panel page to open after sign-in.
   * @returns The login address of the API.
   */
  loginUrl(provider: LoginProvider, returnTo: string): string
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

/**
 * A panel role an administrator granted to an e-mail address (backend#22).
 *
 * @feature US-MOD-05, F-25
 */
export type StaffAccount = { email: string; role: StaffRole }

/**
 * One topic of the administrator's high-risk list with its fallback keywords (ADR-35).
 *
 * @feature US-MOD-05, F-20, F-25
 */
export type RiskTopic = { name: string; keywords: string[] }

/**
 * What a write to the administration API gave: saved, refused as invalid, an ended session, a
 * role taken away, or an API that did not answer.
 *
 * @feature US-MOD-05, F-25
 */
export type AdminOutcome = 'saved' | 'invalid' | 'expired' | 'no_access' | 'failed'

/**
 * The administration API of meritum-backend: staff accounts and high-risk topics. Adapters
 * never throw; a list the API did not give is null.
 *
 * @feature US-MOD-05, F-20, F-25
 */
export interface AdminApi {
  /** @returns The granted accounts, sorted by address, or null. */
  accounts(): Promise<StaffAccount[] | null>
  /**
   * @param account - The address and the role it gets (replacing an earlier one).
   * @returns What the API did.
   */
  grant(account: StaffAccount): Promise<AdminOutcome>
  /**
   * @param email - The address whose role is taken away.
   * @returns What the API did.
   */
  revoke(email: string): Promise<AdminOutcome>
  /** @returns The high-risk topics, sorted by name, or null. */
  topics(): Promise<RiskTopic[] | null>
  /**
   * @param topic - The topic to add (or replace, by name).
   * @returns What the API did.
   */
  saveTopic(topic: RiskTopic): Promise<AdminOutcome>
  /**
   * @param name - The topic to delete.
   * @returns What the API did.
   */
  deleteTopic(name: string): Promise<AdminOutcome>
}

/**
 * A source of the catalogue a moderator can cite: what the picker shows. The API checks the
 * fragment against the text of this source, never the browser.
 *
 * @feature US-MOD-07, F-39, ADR-06
 */
export type AnswerSource = { id: string; title: string; publisher: string }

/**
 * One citation of a moderator's answer: a source of the catalogue and a fragment of its text.
 *
 * @feature US-MOD-07, F-39, ADR-06
 */
type AnswerCitation = { source_id: string; fragment: string }

/**
 * What the moderator sends: the answer text and at least one citation.
 *
 * @feature US-MOD-07, F-39, ADR-06
 */
export type AnswerDraft = { text: string; citations: AnswerCitation[] }

/**
 * What a send gave: sent (the case is `answered`, the askers are notified), the positions
 * (from 0) of the citations that are not verbatim in their source, an ended session, a role taken
 * away, or an API that did not answer or refused the answer.
 *
 * @feature US-MOD-07, F-39, ADR-06
 */
export type AnswerOutcome = 'sent' | { rejected: number[] } | 'expired' | 'no_access' | 'failed'

/**
 * The answer API of meritum-backend (`POST /moderation/cases/{id}/answer`, backend#36).
 * Adapters never throw.
 *
 * @feature US-MOD-07, F-39, ADR-06
 */
export interface AnswerApi {
  /**
   * Reads the catalogue sources a citation can point to: the sources the case's checks cited
   * (the API has no list of the whole catalogue yet).
   *
   * @param checkIds - The checks of the case's claims.
   * @returns The sources, or null when none can be read.
   */
  sources(checkIds: readonly string[]): Promise<AnswerSource[] | null>
  /**
   * Answers a case; the API checks every citation verbatim before it notifies anyone.
   *
   * @param caseId - The case, e.g. `#S-12`.
   * @param draft - The text and its citations.
   * @returns What the API did.
   */
  send(caseId: string, draft: AnswerDraft): Promise<AnswerOutcome>
}
