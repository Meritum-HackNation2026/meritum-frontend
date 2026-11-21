import type { CheckSender } from '@/checks'
import { failureOf, fetchClient } from './_client'
import { sessionId } from './_session'
import { HTTP_TOO_MANY_REQUESTS, SESSION_HEADER } from './constants'

/**
 * Sends checks to POST /api/v1/checks with the tab's session id, typed by the backend's
 * OpenAPI schema. Never throws: a network failure is `offline`, HTTP 429 is `rate_limited` and
 * any other refusal, or a 202 answer without a check id, is `busy`.
 *
 * @feature US-SPR-01, US-SPR-02, F-01, F-09, F-21
 */
export const apiCheckSender: CheckSender = {
  async send(request) {
    try {
      const { data, response } = await fetchClient.POST('/api/v1/checks', {
        params: { header: { [SESSION_HEADER]: sessionId() } },
        body: request,
      })
      // trust boundary: the schema promises a check id, the page still checks it is there
      if (typeof data?.check_id === 'string') {
        return { checkId: data.check_id }
      }
      return response.status === HTTP_TOO_MANY_REQUESTS ? 'rate_limited' : 'busy'
    } catch (error) {
      return failureOf(error)
    }
  },
}
