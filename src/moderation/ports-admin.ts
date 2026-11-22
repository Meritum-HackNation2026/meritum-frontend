import type { StaffRole } from './ports'

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
 * A technical account a demo link signs its visitor in to (backend#53).
 *
 * @feature US-OBS-06, US-MOD-05, F-28
 */
export type DemoAccount = 'obywatel' | 'admin'

/**
 * A demo link the API issued: the address (shown once) and the last moment it works (ISO 8601).
 *
 * @feature US-OBS-06, US-MOD-05, F-28
 */
type DemoLink = { id: string; url: string; expiresAt: string }

/**
 * Metadata of an active demo link.
 *
 * @feature US-OBS-06, US-MOD-05, F-28
 */
export type ActiveDemoLink = { id: string; account: DemoAccount; expiresAt: string }

/**
 * What issuing a demo link gave: the link, `unavailable` outside the dev environment (404), or
 * why a write fails.
 *
 * @feature US-OBS-06, US-MOD-05, F-28
 */
type DemoIssueOutcome = { link: DemoLink } | 'unavailable' | Exclude<AdminOutcome, 'saved'>

/**
 * What revoking a demo link gave: a write outcome, or `not_found` when the API no longer knows
 * the link.
 *
 * @feature US-OBS-06, US-MOD-05, F-28
 */
export type DemoRevokeOutcome = AdminOutcome | 'not_found'

/**
 * The administration API of meritum-backend: staff accounts, high-risk topics and demo links.
 * Adapters never throw; a list the API did not give is null.
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
  /**
   * @param account - The technical account the link opens.
   * @param expiresAt - The deadline, ISO 8601, at most 7 days ahead.
   * @returns The issued link, or why there is none.
   */
  issueDemoLink(account: DemoAccount, expiresAt: string): Promise<DemoIssueOutcome>
  /** @returns Active demo links, or why the list could not be loaded. */
  demoLinks(): Promise<ActiveDemoLink[] | 'unavailable' | 'failed'>
  /**
   * @param id - The demo link identifier.
   * @returns What the API did.
   */
  revokeDemoLink(id: string): Promise<DemoRevokeOutcome>
}
