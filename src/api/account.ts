import type { CitizenAccount, SessionEraser } from '@/checks'
import { fetchClient } from './_client'
import { csrfHeaders } from './_csrf'
import { DEMO_PROVIDER } from './constants'

/** Deletes through a state-changing call that needs the session's CSRF token; false on any failure. */
function eraser(
  call: (headers: Record<string, string>) => Promise<{ response: Response }>,
): SessionEraser {
  return {
    async erase() {
      try {
        const headers = await csrfHeaders()
        return headers ? (await call(headers)).response.ok : false
      } catch {
        return false
      }
    },
  }
}

/**
 * The citizen account through the OpenAPI client (backend#28): the signed-in account from
 * GET /api/v1/auth/me, the history from GET /api/v1/me/checks, sign-in through
 * /api/v1/auth/login/{provider}, DELETE /api/v1/me/checks („Usuń moją historię”) and
 * DELETE /api/v1/me („Usuń konto”). Never throws: an unreachable API is no session, no history
 * or a deletion that did not happen.
 *
 * @feature US-SPR-10, US-BEZ-05, F-31
 */
export const apiAccount: CitizenAccount = {
  async session() {
    try {
      const { data, response } = await fetchClient.GET('/api/v1/auth/me')
      return response.ok && data
        ? { email: data.email, isDemo: data.provider === DEMO_PROVIDER }
        : null
    } catch {
      return null
    }
  },
  async history() {
    try {
      const { data } = await fetchClient.GET('/api/v1/me/checks')
      return Array.isArray(data)
        ? data.map((item) => ({
            checkId: item.check_id,
            at: item.received_at,
            question: item.question_masked,
          }))
        : []
    } catch {
      return []
    }
  },
  loginUrl: (provider, returnTo) =>
    `/api/v1/auth/login/${provider}?${new URLSearchParams({ return_to: returnTo })}`,
  async signOut() {
    try {
      const headers = await csrfHeaders()
      return headers
        ? (await fetchClient.POST('/api/v1/auth/logout', { headers })).response.ok
        : false
    } catch {
      return false
    }
  },
  historyEraser: eraser((headers) => fetchClient.DELETE('/api/v1/me/checks', { headers })),
  accountEraser: eraser((headers) => fetchClient.DELETE('/api/v1/me', { headers })),
}
