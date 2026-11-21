import { fetchClient } from './_client'
import { CSRF_HEADER } from './constants'

/**
 * The header with the staff session's CSRF token, read from GET /api/v1/auth/me (backend#15).
 *
 * @returns The header, or null when there is no session.
 * @throws {TypeError} When the API cannot be reached.
 * @feature US-MOD-05, F-25
 */
export async function csrfHeaders(): Promise<Record<string, string> | null> {
  const { data } = await fetchClient.GET('/api/v1/auth/me')
  return data ? { [CSRF_HEADER]: data.csrf_token } : null
}
