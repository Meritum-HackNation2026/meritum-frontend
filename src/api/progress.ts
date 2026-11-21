import type { ProgressSource } from '@/checks'
import type { AnalysisStatus } from '@/contracts/meritum'
import { CHECKS_ENDPOINT, STEP_CODES, STEP_STATUSES } from './constants'

function isStep(value: unknown): boolean {
  const { code, status } = (value ?? {}) as { code?: unknown; status?: unknown }
  const isKnownCode = typeof code === 'string' && Object.hasOwn(STEP_CODES, code)
  return isKnownCode && typeof status === 'string' && Object.hasOwn(STEP_STATUSES, status)
}

function parseStatus(data: string): AnalysisStatus | null {
  try {
    const value: unknown = JSON.parse(data)
    const steps = (value as { steps?: unknown } | null)?.steps
    // shortcut: validates the steps the strip renders; `result` is trusted as the first-party
    // backend contract, upgrade to a schema check if another origin ever feeds this stream
    return Array.isArray(steps) && steps.every(isStep) ? (value as AnalysisStatus) : null
  } catch {
    return null
  }
}

/**
 * Streams a check's progress from GET /api/v1/checks/{id}/events (Server-Sent Events,
 * meritum-backend#17). The backend closes the stream after the event with the result; the
 * browser would then reconnect and replay every step, so the first error closes the
 * connection for good and reports the end once. Events that are not an AnalysisStatus are
 * ignored.
 *
 * @feature US-SPR-02, F-09
 */
export const apiProgressSource: ProgressSource = {
  watch(checkId, onStatus, onClosed) {
    const events = new EventSource(`${CHECKS_ENDPOINT}/${encodeURIComponent(checkId)}/events`)
    let open = true
    const stop = () => {
      open = false
      events.close()
    }
    events.onmessage = (event: MessageEvent<string>) => {
      const status = open ? parseStatus(event.data) : null
      if (status) {
        onStatus(status)
      }
    }
    events.onerror = () => {
      if (open) {
        stop()
        onClosed()
      }
    }
    return stop
  },
}
