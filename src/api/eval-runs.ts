import type { Verdict } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { METRIC_KEYS } from '@/evidence'
import {
  EVAL_RUN_STATUSES,
  type EvalApi,
  type EvalCase,
  type EvalComparison,
  type EvalOutcome,
  type EvalRun,
} from '@/observability'
import { csrfHeaders } from './_csrf'
import {
  EVAL_DATASETS_ENDPOINT,
  EVAL_RUNS_ENDPOINT,
  HTTP_FORBIDDEN,
  HTTP_UNAUTHORIZED,
} from './constants'
import { isDate, isRecord, measuredMetrics } from './evaluation'

const verdicts = Object.keys(pl.verdict) as Verdict[]

const verdictOf = (value: unknown): Verdict | null =>
  verdicts.find((verdict) => verdict === value) ?? null

const isMeasured = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0

// Trust boundary: the page renders only runs that pass here.
function parseRun(value: unknown): EvalRun | null {
  if (!isRecord(value)) {
    return null
  }
  const { id, status, dataset, started_at, finished_at, metrics } = value
  const knownStatus = EVAL_RUN_STATUSES.find((known) => known === status)
  const hasEnd = finished_at === null || finished_at === undefined || isDate(finished_at)
  if (!(isId(id) && knownStatus && isId(dataset) && isDate(started_at) && hasEnd)) {
    return null
  }
  const measured = isRecord(metrics) ? measuredMetrics(metrics) : {}
  const finished = isDate(finished_at) ? finished_at : null
  return { id, status: knownStatus, dataset, started_at, finished_at: finished, metrics: measured }
}

function parseCases(body: unknown): EvalCase[] | null {
  if (!Array.isArray(body)) {
    return null
  }
  return body.flatMap((value) =>
    isRecord(value) && isId(value['case_id'])
      ? [{ case_id: value['case_id'], verdict: verdictOf(value['verdict']) }]
      : [],
  )
}

function parseComparison(body: unknown): EvalComparison | null {
  if (!(isRecord(body) && isRecord(body['metrics']) && Array.isArray(body['changed_cases']))) {
    return null
  }
  const { metrics, changed_cases: changed } = body
  const pairs: EvalComparison['metrics'] = {}
  for (const key of METRIC_KEYS) {
    const pair = metrics[key]
    if (isRecord(pair) && isMeasured(pair['a']) && isMeasured(pair['b'])) {
      pairs[key] = { a: pair['a'], b: pair['b'] }
    }
  }
  const cases = changed.flatMap((value: unknown) =>
    isRecord(value) && isId(value['case_id'])
      ? [{ case_id: value['case_id'], a: verdictOf(value['a']), b: verdictOf(value['b']) }]
      : [],
  )
  return { metrics: pairs, changed_cases: cases }
}

const outcomeOf = (response: Response): EvalOutcome => {
  if (response.ok) {
    return 'done'
  }
  return response.status === HTTP_UNAUTHORIZED ? 'expired' : 'failed'
}

function startWith(headers: Record<string, string>, dataset: string): Promise<Response> {
  return fetch(EVAL_RUNS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ dataset }),
  })
}

// Every write repeats the session's CSRF token; no session means it ended, and nothing is sent.
async function write(
  call: (headers: Record<string, string>) => Promise<EvalOutcome>,
): Promise<EvalOutcome> {
  try {
    const headers = await csrfHeaders()
    return headers ? await call(headers) : 'expired'
  } catch {
    return 'failed'
  }
}

/**
 * Evaluation runs of meritum-backend (backend#35) on plain `fetch`, until their routes reach
 * the OpenAPI schema. Never throws: an unreachable API or a body that does not validate is
 * null or `failed`.
 *
 * @feature US-OBS-06, US-OBS-05, F-28
 */
export const apiEval: EvalApi = {
  async runs() {
    try {
      const response = await fetch(EVAL_RUNS_ENDPOINT)
      if (response.status === HTTP_UNAUTHORIZED) {
        return 'expired'
      }
      if (response.status === HTTP_FORBIDDEN) {
        return 'no_access'
      }
      const body: unknown = response.ok ? await response.json() : null
      return Array.isArray(body) ? body.flatMap((run) => parseRun(run) ?? []) : null
    } catch {
      return null
    }
  },
  async cases(runId) {
    try {
      const response = await fetch(`${EVAL_RUNS_ENDPOINT}/${encodeURIComponent(runId)}/cases`)
      return response.ok ? parseCases(await response.json()) : null
    } catch {
      return null
    }
  },
  start: (dataset) => write(async (headers) => outcomeOf(await startWith(headers, dataset))),
  upload: (file) =>
    write(async (headers) => {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch(EVAL_DATASETS_ENDPOINT, {
        method: 'POST',
        headers,
        body: form,
      })
      const body: unknown = response.ok ? await response.json() : null
      if (!(isRecord(body) && isId(body['id']))) {
        return outcomeOf(response) === 'done' ? 'failed' : outcomeOf(response)
      }
      return outcomeOf(await startWith(headers, body['id']))
    }),
  async compare(a, b) {
    try {
      const query = new URLSearchParams({ a, b })
      const response = await fetch(`${EVAL_RUNS_ENDPOINT}/compare?${query}`)
      return response.ok ? parseComparison(await response.json()) : null
    } catch {
      return null
    }
  },
}
