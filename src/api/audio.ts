import type { AudioUploader, UploadOutcome } from '@/checks'
import { failureOf, fetchClient } from './_client'
import {
  AUDIO_REFUSALS,
  DAILY_LIMIT_KEY,
  HTTP_TOO_MANY_REQUESTS,
  UNKNOWN_AUDIO_TYPE,
} from './constants'

/** The refusal of a 429: the daily recording limit by its `message_key`, else the minute limit. */
function rateLimit(body: unknown): UploadOutcome {
  const isDaily =
    typeof body === 'object' &&
    body !== null &&
    Reflect.get(body, 'message_key') === DAILY_LIMIT_KEY
  return isDaily ? 'rate_limited_daily' : 'rate_limited'
}

/**
 * Uploads recordings to POST /api/v1/audio as the raw request body, typed by the backend's
 * OpenAPI schema. Never throws: a network failure is `offline`; 413, 415 and 422 are the size,
 * format and length refusals (by status, so a newer `message_key` cannot break them); 429 is a
 * rate limit; any other answer without an `audio_id` is `busy`.
 *
 * @feature US-SPR-11, F-08
 */
export const apiAudioUploader: AudioUploader = {
  async upload(file) {
    try {
      const { data, error, response } = await fetchClient.POST('/api/v1/audio', {
        // openapi-typescript types a binary body as string; the file goes out as it is
        body: file as unknown as string,
        bodySerializer: (body) => body,
        headers: { 'Content-Type': file.type || UNKNOWN_AUDIO_TYPE },
      })
      // trust boundary: the schema promises an audio id, the page still checks it is there
      if (typeof data?.audio_id === 'string') {
        return { audioId: data.audio_id }
      }
      if (response.status === HTTP_TOO_MANY_REQUESTS) {
        return rateLimit(error)
      }
      return AUDIO_REFUSALS[response.status] ?? 'busy'
    } catch (error) {
      return failureOf(error)
    }
  },
}
