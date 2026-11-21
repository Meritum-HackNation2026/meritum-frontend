import type { Handoff, HandoffOutcome } from '@/moderation'
import { type ApiSchemas, failureOf, fetchClient } from './_client'
import { HTTP_TOO_MANY_REQUESTS } from './constants'

type Answer = { data?: ApiSchemas['Handoff'] | undefined; response: Response }

// Trust boundary: a case number counts only from an answer that saved the case (ADR-22); a 503
// carries escalation "recommended" without one, and anything else without a number is no case.
function outcomeOf({ data, response }: Answer): HandoffOutcome {
  const caseId = data?.escalation.case_id
  const isSaved = response.ok && data?.escalation.state !== 'recommended'
  if (isSaved && typeof caseId === 'string' && caseId !== '') {
    return { caseId }
  }
  return response.status === HTTP_TOO_MANY_REQUESTS ? 'rate_limited' : 'busy'
}

async function handOff(call: () => Promise<Answer>): Promise<HandoffOutcome> {
  try {
    return outcomeOf(await call())
  } catch (error) {
    return failureOf(error)
  }
}

/**
 * Hands claims to the moderators through POST /api/v1/checks/{id}/claims/{n}/escalate and
 * /dispute, typed by the backend's OpenAPI schema. Never throws: a network failure is
 * `offline`, HTTP 429 is `rate_limited`, and a 503 or any answer without a saved case number is
 * `busy`. A blank justification is sent as none.
 *
 * @feature US-MOD-03, US-MOD-06, F-24, ADR-22
 */
export const apiHandoff: Handoff = {
  escalate(checkId, claimIndex) {
    return handOff(() =>
      fetchClient.POST('/api/v1/checks/{check_id}/claims/{claim_index}/escalate', {
        params: { path: { check_id: checkId, claim_index: claimIndex } },
      }),
    )
  },
  dispute(checkId, claimIndex, justification) {
    return handOff(() =>
      fetchClient.POST('/api/v1/checks/{check_id}/claims/{claim_index}/dispute', {
        params: { path: { check_id: checkId, claim_index: claimIndex } },
        body: { justification: justification.trim() || null },
      }),
    )
  },
}
