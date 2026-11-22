import type { ExportApi, ExportFormat } from '@/observability'
import { EXPORT_ENDPOINT, HTTP_UNAUTHORIZED } from './constants'

// The STIX bundle is JSON too, so it gets the .json extension.
const extensions: Record<ExportFormat, string> = { json: 'json', csv: 'csv', stix: 'json' }

/**
 * The analyst export of meritum-backend (backend#31) on plain `fetch`, until its route reaches
 * the OpenAPI schema. Never throws: an unreachable API, a refusal or a 403 is `failed`, a 401 an
 * ended session. The file is named by period and day, as the API sends no file name.
 *
 * @feature US-OBS-03, F-36
 */
export const apiExport: ExportApi = {
  async download(format, days) {
    try {
      const response = await fetch(
        `${EXPORT_ENDPOINT}?${new URLSearchParams({ format, days: String(days) })}`,
      )
      if (!response.ok) {
        return { kind: response.status === HTTP_UNAUTHORIZED ? 'expired' : 'failed' }
      }
      const day = new Date().toISOString().slice(0, 10)
      const name = `meritum-eksport-${days}d-${day}.${extensions[format]}`
      const file = new File([await response.blob()], name, {
        type: response.headers.get('Content-Type') ?? '',
      })
      return { kind: 'done', file }
    } catch {
      return { kind: 'failed' }
    }
  },
}
