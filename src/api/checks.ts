import type { CheckSender } from '@/checks'
import { sessionId } from './_session'
import { CHECKS_ENDPOINT, HTTP_TOO_MANY_REQUESTS, SESSION_HEADER } from './constants'

async function acceptedId(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json()
    const id = (body as { check_id?: unknown } | null)?.check_id
    return typeof id === 'string' ? id : null
  } catch {
    return null
  }
}

/**
 * Sends checks to POST /api/v1/checks with the tab's session id. Never throws: a network
 * failure is `offline`, HTTP 429 is `rate_limited` and any other refusal, or a 202 answer
 * without a check id, is `busy`.
 *
 * @feature US-SPR-01, US-SPR-02, F-01, F-09, F-21
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
      const checkId = await acceptedId(response)
      return checkId === null ? 'busy' : { checkId }
    }
    return response.status === HTTP_TOO_MANY_REQUESTS ? 'rate_limited' : 'busy'
  },
}
