import type { AudioUploader, UploadOutcome } from '@/checks'
import { failureOf, fetchClient } from './_client'
import {
  AUDIO_REFUSALS,
  DAILY_LIMIT_KEY,
  HTTP_TOO_MANY_REQUESTS,
  UNKNOWN_AUDIO_TYPE,
} from './constants'

/** The `message_key` of a refusal body, or an empty string when it has none. */
function messageKey(body: unknown): string {
  const key: unknown = typeof body === 'object' && body !== null && Reflect.get(body, 'message_key')
  return typeof key === 'string' ? key : ''
}

/** What a refused upload means: a rate limit by its status, otherwise its known `message_key`. */
function refusal(status: number, key: string): UploadOutcome {
  if (status === HTTP_TOO_MANY_REQUESTS) {
    return key === DAILY_LIMIT_KEY ? 'rate_limited_daily' : 'rate_limited'
  }
  return Object.hasOwn(AUDIO_REFUSALS, key)
    ? AUDIO_REFUSALS[key as keyof typeof AUDIO_REFUSALS]
    : 'busy'
}

/**
 * Uploads recordings to POST /api/v1/audio as the raw request body, typed by the backend's
 * OpenAPI schema. Never throws: a network failure is `offline`; a refusal with the size, length
 * or format `message_key` is that refusal; 429 is a rate limit (daily by its key); any other
 * answer without an `audio_id`, a 422 of a malformed request included, is `busy`.
 *
 * @feature US-SPR-11, F-08
 */
export const apiAudioUploader: AudioUploader = {
  async upload(file) {
    try {
      const { data, error, response } = await fetchClient.POST('/api/v1/audio', {
        // type only: openapi-typescript types a binary body as string; bodySerializer below
        // sends the file untouched, and the API checks its bytes
        body: file as unknown as string,
        bodySerializer: (body) => body,
        headers: { 'Content-Type': file.type || UNKNOWN_AUDIO_TYPE },
      })
      // trust boundary: the schema promises an audio id, the page still checks it is there
      if (typeof data?.audio_id === 'string') {
        return { audioId: data.audio_id }
      }
      return refusal(response.status, messageKey(error))
    } catch (error) {
      return failureOf(error)
    }
  },
}
