import type { ReadOutcome, ResultReader } from '@/checks'
import type { AnalysisStatus } from '@/contracts/meritum'
import { type ApiSchemas, failureOf, fetchClient } from './_client'
import { HTTP_NOT_FOUND } from './constants'

// Trust boundary: `body` has the OpenAPI type of the answer. The contract type the page renders
// also has minItems tuples (steps, claims, signatories), which the OpenAPI type and openapi-fetch's
// response type keep as plain arrays, so the answer becomes an `AnalysisStatus` with one `as` once
// the shape the page branches on is checked: at least one step, a result that is an object or none.
// shortcut: the nested tuples are the first-party contract, upgrade to a schema check if another
// origin ever answers this call
function parseStatus(body: ApiSchemas['AnalysisStatus'] | undefined): ReadOutcome {
  const result: unknown = body?.result
  const isResultValid = result == null || typeof result === 'object'
  const hasSteps = Array.isArray(body?.steps) && body.steps.length > 0
  return body !== undefined && hasSteps && isResultValid
    ? { status: body as AnalysisStatus }
    : 'busy'
}

/**
 * Reads GET /api/v1/checks/{id}: the steps of a running check and its result once it finished,
 * typed by the backend's OpenAPI schema. Never throws: a network failure is `offline`, 404 is
 * `not_found` and any other failure, or an answer that is not an `AnalysisStatus`, is `busy`.
 *
 * @feature US-SPR-01, F-01, F-21
 */
export const apiResultReader: ResultReader = {
  async read(checkId) {
    try {
      const { data, response } = await fetchClient.GET('/api/v1/checks/{check_id}', {
        params: { path: { check_id: checkId } },
      })
      if (response.ok) {
        return parseStatus(data)
      }
      return response.status === HTTP_NOT_FOUND ? 'not_found' : 'busy'
    } catch (error) {
      return failureOf(error)
    }
  },
}
