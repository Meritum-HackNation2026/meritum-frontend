import type { AnswerApi, AnswerOutcome, AnswerSource, CloseOutcome } from '@/moderation'
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

function refusal(status: number): 'expired' | 'no_access' | 'failed' {
  if (status === HTTP_UNAUTHORIZED) {
    return 'expired'
  }
  return status === HTTP_FORBIDDEN ? 'no_access' : 'failed'
}

function outcomeOf(status: number, error: unknown): AnswerOutcome {
  if (status === HTTP_UNAUTHORIZED || status === HTTP_FORBIDDEN) {
    return refusal(status)
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
 * unreachable API included, is `failed`. A close (backend issue 140) reads its refusals the same way, a
 * 409 for a case no longer open included. The picker lists the sources the case's checks cited,
 * because the API has no list of the whole catalogue; one unreadable check is skipped.
 *
 * @feature US-MOD-07, US-MOD-01, F-39, F-25, ADR-06
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
  async close(caseId, reason): Promise<CloseOutcome> {
    try {
      const headers = await csrfHeaders()
      if (!headers) {
        return 'expired'
      }
      const { response } = await fetchClient.POST('/api/v1/moderation/cases/{case_id}/close', {
        params: { path: { case_id: caseId } },
        headers,
        body: { reason },
      })
      return response.ok ? 'closed' : refusal(response.status)
    } catch {
      return 'failed'
    }
  },
}
