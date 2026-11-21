import { type EvalRunSummary, type LatestRunSource, METRIC_KEYS } from '@/evidence'
import { LATEST_RUN_ENDPOINT } from './constants'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isHttpsUrl(value: unknown): value is string {
  return typeof value === 'string' && URL.canParse(value) && new URL(value).protocol === 'https:'
}

// Trust boundary: keeps only known metrics with finite numbers, so nothing unmeasured shows.
function parseSummary(body: unknown): EvalRunSummary | null {
  if (!isRecord(body) || typeof body['finished_at'] !== 'string') {
    return null
  }
  const { finished_at, bundle_url, metrics } = body
  if (!(isHttpsUrl(bundle_url) && isRecord(metrics))) {
    return null
  }
  const measured: EvalRunSummary['metrics'] = {}
  for (const key of METRIC_KEYS) {
    const value = metrics[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      measured[key] = value
    }
  }
  return { finished_at, bundle_url, metrics: measured }
}

/**
 * Reads GET /api/v1/eval/runs/latest. Never throws: a network failure, any refusal (404
 * while no run has finished) or a malformed body is null, so the page shows a message.
 *
 * @feature US-ZRD-12, F-29
 */
export const apiLatestRunSource: LatestRunSource = {
  async latestRun() {
    try {
      const response = await fetch(LATEST_RUN_ENDPOINT)
      return response.ok ? parseSummary(await response.json()) : null
    } catch {
      return null
    }
  },
}
