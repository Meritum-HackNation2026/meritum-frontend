import type { ImageOutcome, ImageUploader } from '@/checks'
import { failureOf, fetchClient } from './_client'
import {
  DAILY_LIMIT_KEY,
  HTTP_TOO_MANY_REQUESTS,
  IMAGE_REFUSALS,
  UNKNOWN_AUDIO_TYPE,
} from './constants'

/** The `message_key` of a refusal body, or an empty string when it has none. */
function messageKey(body: unknown): string {
  const key: unknown = typeof body === 'object' && body !== null && Reflect.get(body, 'message_key')
  return typeof key === 'string' ? key : ''
}

/** What a refused upload means: by its status, a rate limit (daily by its key) or the file. */
function refusal(status: number, key: string): ImageOutcome {
  if (status === HTTP_TOO_MANY_REQUESTS) {
    return key === DAILY_LIMIT_KEY ? 'rate_limited_daily' : 'rate_limited'
  }
  return Object.hasOwn(IMAGE_REFUSALS, status)
    ? IMAGE_REFUSALS[status as keyof typeof IMAGE_REFUSALS]
    : 'busy'
}

/**
 * Uploads screenshots and photos to POST /api/v1/images as the raw request body, typed by the
 * backend's OpenAPI schema. Never throws: a network failure is `offline`; 413 is a too large
 * image, 415 an unsupported format, 429 a rate limit (daily by its key); any other answer
 * without an `image_id` is `busy`.
 *
 * @feature US-SPR-08, F-33
 */
export const apiImageUploader: ImageUploader = {
  async upload(file) {
    try {
      const { data, error, response } = await fetchClient.POST('/api/v1/images', {
        // type only: openapi-typescript types a binary body as string; bodySerializer below
        // sends the file untouched, and the API checks its bytes
        body: file as unknown as string,
        bodySerializer: (body) => body,
        headers: { 'Content-Type': file.type || UNKNOWN_AUDIO_TYPE },
      })
      // trust boundary: the schema promises an image id, the page still checks it is there
      if (typeof data?.image_id === 'string') {
        return { imageId: data.image_id }
      }
      return refusal(response.status, messageKey(error))
    } catch (error) {
      return failureOf(error)
    }
  },
}
