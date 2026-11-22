import { type EvalRunSummary, type LatestRunSource, METRIC_KEYS } from '@/evidence'
import { LATEST_RUN_ENDPOINT, LATEST_RUN_TIMEOUT_MS } from './constants'

/**
 * Whether an API value is a JSON object.
 *
 * @param value - Parsed JSON.
 * @returns True for a non-null object.
 * @feature US-ZRD-12, US-OBS-06, F-29, F-28
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isHttpsUrl(value: unknown): value is string {
  return typeof value === 'string' && URL.canParse(value) && new URL(value).protocol === 'https:'
}

/**
 * Whether an API value is a date string that parses.
 *
 * @param value - Parsed JSON.
 * @returns True for a parseable date string.
 * @feature US-ZRD-12, US-OBS-06, F-29, F-28
 */
export function isDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

/**
 * Keeps only known metrics with finite numbers, so nothing unmeasured shows.
 *
 * @param metrics - The metrics object from the API.
 * @returns The measured metrics.
 * @feature US-ZRD-12, US-OBS-06, F-29, F-28
 */
export function measuredMetrics(metrics: Record<string, unknown>): EvalRunSummary['metrics'] {
  const measured: EvalRunSummary['metrics'] = {}
  for (const key of METRIC_KEYS) {
    const value = metrics[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      measured[key] = value
    }
  }
  return measured
}

// Trust boundary: the page renders only what passes here.
function parseSummary(body: unknown): EvalRunSummary | null {
  if (!isRecord(body)) {
    return null
  }
  const { finished_at, bundle_url, metrics } = body
  const isValid = isDate(finished_at) && isHttpsUrl(bundle_url) && isRecord(metrics)
  return isValid ? { finished_at, bundle_url, metrics: measuredMetrics(metrics) } : null
}

/**
 * Reads GET /api/v1/eval/runs/latest. Never throws: a network failure, a timeout, any refusal
 * (404 while no run has finished) or a malformed body is null, so the page shows a message.
 *
 * @feature US-ZRD-12, F-29
 */
export const apiLatestRunSource: LatestRunSource = {
  async latestRun() {
    try {
      const response = await fetch(LATEST_RUN_ENDPOINT, {
        signal: AbortSignal.timeout(LATEST_RUN_TIMEOUT_MS),
      })
      return response.ok ? parseSummary(await response.json()) : null
    } catch {
      return null
    }
  },
}
