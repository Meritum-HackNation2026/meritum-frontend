import type { LoginProvider, StaffRole } from './ports'

/**
 * Longest justification of „Zgłoś błąd” the API reads (`JUSTIFICATION_INPUT_MAX_CHARS` in
 * meritum-backend); it masks it before anything is stored.
 *
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
 */
export const MAX_JUSTIFICATION_CHARS = 4000

/**
 * Sections of the panel and the roles that see each, as the backend allows them (backend#22):
 * moderators and administrators handle cases, analysts and administrators read the quality
 * metrics and the export, administrators manage accounts and topics.
 *
 * @feature US-MOD-05, F-25
 */
export const SECTION_ROLES = {
  cases: ['moderator', 'admin'],
  evaluation: ['analyst', 'admin'],
  export: ['analyst', 'admin'],
  admin: ['admin'],
} as const satisfies Record<string, readonly StaffRole[]>

/**
 * The providers staff can sign in with, in the order of the buttons.
 *
 * @feature US-MOD-05, F-25
 */
export const LOGIN_PROVIDERS: readonly LoginProvider[] = ['google', 'microsoft']

/**
 * `ModeratorCase.distinct_askers` when the API leaves it out: the contract's default.
 *
 * @feature US-MOD-02, F-25
 */
export const DEFAULT_DISTINCT_ASKERS = 1

/**
 * An e-mail address as the API accepts it for a staff account (`_StaffEmail` in backend#22):
 * something, `@`, a domain with a dot, no spaces.
 *
 * @feature US-MOD-05, F-25
 */
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * Longest staff e-mail address the API accepts (backend#22).
 *
 * @feature US-MOD-05, F-25
 */
export const MAX_EMAIL_CHARS = 254

/**
 * Longest topic name the API accepts (`HighRiskTopic` in backend#22); a longer keyword is refused by the API (422).
 *
 * @feature US-MOD-05, F-20, F-25
 */
export const MAX_TOPIC_CHARS = 80

/**
 * Roles an administrator can grant, in the order of the role picker; moderator is the default.
 *
 * @feature US-MOD-05, F-25
 */
export const GRANTABLE_ROLES: readonly StaffRole[] = ['moderator', 'analyst', 'admin']
