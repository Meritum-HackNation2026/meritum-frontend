import type { AskerAnswerReader } from '@/moderation'
import { fetchClient } from './_client'
import { sessionId } from './_session'
import { HTTP_NOT_FOUND, SESSION_HEADER } from './constants'

/**
 * Reads the moderator's answer through GET /api/v1/moderation/answers/{case_id}, typed by the
 * backend's OpenAPI schema, with this tab's session: the API answers 404 unless the session got
 * the notification, so the answer is not public. Never throws: 404 is `not_found`, anything else
 * that is not an answer, an unreachable API included, is `failed`.
 *
 * @feature US-MOD-07, US-POW-02, F-39
 */
export const apiAskerAnswer: AskerAnswerReader = {
  async read(caseId) {
    try {
      const { data, response } = await fetchClient.GET('/api/v1/moderation/answers/{case_id}', {
        params: { path: { case_id: caseId }, header: { [SESSION_HEADER]: sessionId() } },
      })
      if (response.status === HTTP_NOT_FOUND) {
        return 'not_found'
      }
      if (!(response.ok && data)) {
        return 'failed'
      }
      return {
        answer: {
          text: data.text,
          citations: data.quotes.map(({ fragment, source }) => ({
            fragment,
            source: `${source.title}, ${source.publisher}`,
          })),
        },
      }
    } catch {
      return 'failed'
    }
  },
}
