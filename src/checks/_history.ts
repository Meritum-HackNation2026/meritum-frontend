import type { CheckResult } from '@/contracts/meritum'
import { HISTORY_STORAGE_KEY, RESULT_STATUSES } from './constants'

/**
 * One result kept in this tab's history, with the time it arrived (ISO 8601).
 *
 * @feature US-SPR-09, F-01
 */
export type SavedCheck = { at: string; result: CheckResult }

// Trust boundary: anything can sit under the key (an old version, a hand edit). An entry the
// page can show has a time and a result with a check id, a known status and claims as a list.
// shortcut: the claims' own shape is not checked; they were written by this page from a
// validated API answer, upgrade to a schema check if another writer ever shares the key
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function isResult(value: unknown): value is CheckResult {
  if (!isObject(value)) {
    return false
  }
  const { check_id: checkId, status, claims } = value
  const isKnownStatus = typeof status === 'string' && Object.hasOwn(RESULT_STATUSES, status)
  const hasClaimList = claims === undefined || Array.isArray(claims)
  return typeof checkId === 'string' && isKnownStatus && hasClaimList
}

function isSavedCheck(value: unknown): value is SavedCheck {
  return isObject(value) && typeof value['at'] === 'string' && isResult(value['result'])
}

function read(): unknown {
  try {
    return JSON.parse(sessionStorage.getItem(HISTORY_STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

/**
 * This tab's checked results, newest first; empty when sessionStorage is blocked or holds
 * something else.
 *
 * @returns The saved checks.
 * @feature US-SPR-09, F-01
 */
export function savedChecks(): SavedCheck[] {
  const value = read()
  return Array.isArray(value) && value.every(isSavedCheck) ? value : []
}

/**
 * Keeps a result at the top of this tab's history, replacing an older entry of the same check.
 * Where sessionStorage is blocked or full the history stays as it was.
 *
 * @param result - The result the page has shown.
 * @feature US-SPR-09, F-01
 */
export function saveCheck(result: CheckResult): void {
  const others = savedChecks().filter((saved) => saved.result.check_id !== result.check_id)
  const next = [{ at: new Date().toISOString(), result }, ...others]
  try {
    sessionStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // blocked or full storage: the result is still on screen, only the history misses it
  }
}

/**
 * The saved result of one check, to show it without asking the API.
 *
 * @param checkId - The check's id.
 * @returns The result, or undefined when this tab has not kept it.
 * @feature US-SPR-09, F-01
 */
export function findSavedCheck(checkId: string): CheckResult | undefined {
  return savedChecks().find((saved) => saved.result.check_id === checkId)?.result
}

/**
 * Empties this tab's history („Usuń moje sprawdzenia”).
 *
 * @feature US-BEZ-05, F-20
 */
export function forgetChecks(): void {
  try {
    sessionStorage.removeItem(HISTORY_STORAGE_KEY)
  } catch {
    // blocked storage holds no history
  }
}
