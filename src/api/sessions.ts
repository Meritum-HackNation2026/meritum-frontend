import type { SessionEraser } from '@/checks'
import { fetchClient } from './_client'
import { sessionId } from './_session'
import { SESSION_HEADER } from './constants'

/**
 * Deletes this tab's checks through DELETE /api/v1/sessions/{session_id}/checks (backend/009),
 * typed by the backend's OpenAPI schema; the backend also deletes the session's notifications.
 * Never throws: a network failure or any answer but 2xx is false.
 *
 * @feature US-BEZ-05, F-20
 */
export const apiSessionEraser: SessionEraser = {
  async erase() {
    const id = sessionId()
    try {
      const { response } = await fetchClient.DELETE('/api/v1/sessions/{session_id}/checks', {
        params: { path: { session_id: id }, header: { [SESSION_HEADER]: id } },
      })
      return response.ok
    } catch {
      return false
    }
  },
}
