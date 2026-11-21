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
