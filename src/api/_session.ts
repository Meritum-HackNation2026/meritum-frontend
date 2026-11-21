import { SESSION_STORAGE_KEY } from './constants'

let fallback: string | undefined

/**
 * The random id of this browser tab's session, created on first use. No account, no login.
 * Where sessionStorage is blocked, the id lives in memory until the page reloads.
 *
 * @returns The session id.
 * @feature US-SPR-01, F-21
 */
export function sessionId(): string {
  try {
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (saved) {
      return saved
    }
    const created = crypto.randomUUID()
    sessionStorage.setItem(SESSION_STORAGE_KEY, created)
    return created
  } catch {
    fallback ??= crypto.randomUUID()
    return fallback
  }
}
