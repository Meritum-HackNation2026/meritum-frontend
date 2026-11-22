import type { ModeratorCase } from '@/contracts/meritum'
import type { StaffApi } from '@/moderation'
import { fetchClient } from './_client'
import { csrfHeaders } from './_csrf'
import { HTTP_FORBIDDEN, HTTP_UNAUTHORIZED } from './constants'

/**
 * Staff API of meritum-backend through the OpenAPI client: sign-in with OIDC (backend#15), the
 * role from GET /api/v1/staff/me (backend#22, a jury session read-only: backend#32) and the cases. Never throws: an unreachable API is
 * `failed` or no cases; a 401 on the cases is an ended session, a 403 a role taken away.
 *
 * @feature US-MOD-05, US-MOD-02, F-25
 */
export const apiStaff: StaffApi = {
  loginUrl: (provider, returnTo) =>
    `/api/v1/auth/login/${provider}?${new URLSearchParams({ return_to: returnTo })}`,
  async session() {
    try {
      const { data, response } = await fetchClient.GET('/api/v1/staff/me')
      if (data?.role) {
        return {
          kind: 'member',
          email: data.email,
          role: data.role,
          readOnly: data.read_only === true,
        }
      }
      if (response.status === HTTP_UNAUTHORIZED) {
        return { kind: 'signed_out' }
      }
      return response.status === HTTP_FORBIDDEN ? { kind: 'no_access' } : { kind: 'failed' }
    } catch {
      return { kind: 'failed' }
    }
  },
  async cases() {
    try {
      const { data, response } = await fetchClient.GET('/api/v1/moderation/cases')
      if (response.status === HTTP_UNAUTHORIZED) {
        return 'expired'
      }
      if (response.status === HTTP_FORBIDDEN) {
        return 'no_access'
      }
      // Trust boundary: the first-party backend validates cases against the core contract;
      // its OpenAPI type keeps minItems tuples as plain arrays.
      return Array.isArray(data) ? (data as ModeratorCase[]) : null
    } catch {
      return null
    }
  },
  async signOut() {
    try {
      const headers = await csrfHeaders()
      if (headers) {
        await fetchClient.POST('/api/v1/auth/logout', { headers })
      }
    } catch {
      // an unreachable API leaves the cookie, which expires on its own
    }
  },
}
