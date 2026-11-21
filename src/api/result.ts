import type { ReadOutcome, ResultReader } from '@/checks'
import type { AnalysisStatus } from '@/contracts/meritum'
import { failureOf, fetchClient } from './_client'
import { HTTP_NOT_FOUND } from './constants'

function parseStatus(body: unknown): ReadOutcome {
  const { steps, result } = (body ?? {}) as { steps?: unknown; result?: unknown }
  const hasResult = typeof result === 'object' && result !== null
  const isStatus = Array.isArray(steps) && (result == null || hasResult)
  // shortcut: checks the shape the page branches on; the rest is the first-party backend
  // contract, upgrade to a schema check if another origin ever answers this call
  return isStatus ? { status: body as AnalysisStatus } : 'busy'
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
