import type { Handoff, HandoffOutcome } from '@/moderation'
import { type ApiSchemas, failureOf, fetchClient } from './_client'
import { HANDOFF_REFUSALS } from './constants'

type Answer = { data?: ApiSchemas['Handoff'] | undefined; response: Response }

// widened once, so any status can be looked up; a status not in the table reads undefined
const refusals: Partial<Record<number, HandoffOutcome>> = HANDOFF_REFUSALS

// Trust boundary: a case number counts only from an answer that saved the case (ADR-22); a 503
// carries escalation "recommended" without one, and anything else without a number is no case:
// a 5xx, a 503 included, is a server failure, so it never reads as the overload text.
// message_key is ignored on purpose: the card writes the text, so created and updated read the same.
function outcomeOf({ data, response }: Answer): HandoffOutcome {
  const caseId = data?.escalation.case_id
  const isSaved = response.ok && data?.escalation.state !== 'recommended'
  if (isSaved && typeof caseId === 'string' && caseId !== '') {
    return { caseId }
  }
  return refusals[response.status] ?? 'not_saved'
}

async function handOff(call: () => Promise<Answer>): Promise<HandoffOutcome> {
  try {
    return outcomeOf(await call())
  } catch (error) {
    return failureOf(error) === 'offline' ? 'offline' : 'not_saved'
  }
}

/**
 * Hands claims to the moderators through POST /api/v1/checks/{id}/claims/{n}/escalate and
 * /dispute, typed by the backend's OpenAPI schema. Never throws: a network failure is
 * `offline`, HTTP 429, 404 and 422 are the refusals of `HANDOFF_REFUSALS`, and a 5xx, an
 * unreadable answer or any other answer without a saved case number is `not_saved`. A blank
 * justification is sent as none.
 *
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
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
