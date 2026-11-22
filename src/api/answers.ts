import type { AnswerApi, AnswerOutcome, AnswerSource } from '@/moderation'
import { fetchClient } from './_client'
import { csrfHeaders } from './_csrf'
import { HTTP_FORBIDDEN, HTTP_UNAUTHORIZED, HTTP_UNPROCESSABLE } from './constants'

// Trust boundary: the 422 body is `{ detail: { rejected_quotes: number[] } }` for quotes that are
// not verbatim; any other 422 (a malformed draft) carries no such list and reads as a failure.
function rejectedQuotes(error: unknown): number[] | null {
  const detail = (error as { detail?: { rejected_quotes?: unknown } } | undefined)?.detail
  const list = detail?.rejected_quotes
  return Array.isArray(list) && list.every((i) => Number.isInteger(i)) && list.length > 0
    ? (list as number[])
    : null
}

function outcomeOf(status: number, error: unknown): AnswerOutcome {
  if (status === HTTP_UNAUTHORIZED) {
    return 'expired'
  }
  if (status === HTTP_FORBIDDEN) {
    return 'no_access'
  }
  const rejected = status === HTTP_UNPROCESSABLE ? rejectedQuotes(error) : null
  return rejected ? { rejected } : 'failed'
}

async function citedSources(checkId: string): Promise<AnswerSource[]> {
  const { data } = await fetchClient.GET('/api/v1/checks/{check_id}', {
    params: { path: { check_id: checkId } },
  })
  const claims = data?.result?.claims ?? []
  return claims.flatMap((claim) =>
    (claim.citations ?? []).map(({ source: { id, title, publisher } }) => ({
      id,
      title,
      publisher,
    })),
  )
}

/**
 * The moderator's answer through POST /api/v1/moderation/cases/{id}/answer (backend#36), typed
 * by the backend's OpenAPI schema. Never throws: a 401 is an ended session, a 403 a taken role,
 * a 422 with `rejected_quotes` names the quotes that are not verbatim, and anything else, an
 * unreachable API included, is `failed`. The picker lists the sources the case's checks cited,
 * because the API has no list of the whole catalogue; one unreadable check is skipped.
 *
 * @feature US-MOD-07, F-39, ADR-06
 */
export const apiAnswers: AnswerApi = {
  async sources(checkIds) {
    const read = await Promise.allSettled(checkIds.map(citedSources))
    const lists = read.flatMap((one) => (one.status === 'fulfilled' ? [one.value] : []))
    if (lists.length === 0) {
      return null
    }
    const byId = new Map(lists.flat().map((source) => [source.id, source]))
    return [...byId.values()]
  },
  async send(caseId, draft) {
    try {
      const headers = await csrfHeaders()
      if (!headers) {
        return 'expired'
      }
      const { response, error } = await fetchClient.POST(
        '/api/v1/moderation/cases/{case_id}/answer',
        {
          params: { path: { case_id: caseId } },
          headers,
          body: { text: draft.text, quotes: draft.citations },
        },
      )
      return response.ok ? 'sent' : outcomeOf(response.status, error)
    } catch {
      return 'failed'
    }
  },
}
