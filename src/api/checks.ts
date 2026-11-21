import type { CheckSender } from '@/checks'
import { sessionId } from './_session'
import { CHECKS_ENDPOINT, HTTP_TOO_MANY_REQUESTS, SESSION_HEADER } from './constants'

/**
 * Sends checks to POST /api/v1/checks with the tab's session id. Never throws: a network
 * failure is `offline`, HTTP 429 is `rate_limited` and any other refusal is `busy`.
 *
 * @feature US-SPR-01, F-01, F-21
 */
export const apiCheckSender: CheckSender = {
  async send(request) {
    let response: Response
    try {
      response = await fetch(CHECKS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [SESSION_HEADER]: sessionId() },
        body: JSON.stringify(request),
      })
    } catch {
      return 'offline'
    }
    if (response.ok) {
      return 'accepted'
    }
    return response.status === HTTP_TOO_MANY_REQUESTS ? 'rate_limited' : 'busy'
  },
}
