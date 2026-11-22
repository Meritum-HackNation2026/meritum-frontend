import type { LoginProvider, StaffRole } from './ports'
import type { DemoAccount } from './ports-admin'

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

/**
 * Technical accounts a demo link can open, in the order of the account picker.
 *
 * @feature US-OBS-06, US-MOD-05, F-28
 */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = ['obywatel', 'admin']

/**
 * How long a new demo link works, in the order of the picker (the first is the default). The API
 * allows 7 days at most, so the longest is 6 and clock skew cannot push it over.
 *
 * @feature US-OBS-06, US-MOD-05, F-28
 */
export const DEMO_VALIDITIES = [
  { key: 'validity_day', hours: 24 },
  { key: 'validity_three_days', hours: 72 },
  { key: 'validity_six_days', hours: 144 },
] as const

/**
 * Milliseconds in one hour.
 *
 * @feature US-OBS-06, F-28
 */
export const MS_PER_HOUR = 3_600_000
