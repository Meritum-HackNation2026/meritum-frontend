import { z } from 'zod'
import type { CheckRequest } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { MAX_TEXT_CHARS, MAX_URL_CHARS, MIN_TEXT_CHARS, URL_PROTOCOLS } from './constants'

/**
 * An `errors` key of copy/pl.json: the message shown under the field.
 *
 * @feature US-SPR-01, F-01
 */
export type ErrorKey = keyof typeof pl.errors

// Each message is an `errors` key, so the page shows the Polish text from copy/pl.json.
const text = z
  .string()
  .trim()
  .min(MIN_TEXT_CHARS, 'empty' satisfies ErrorKey)
  .max(MAX_TEXT_CHARS, 'too_long' satisfies ErrorKey)
const url = z
  .url({ protocol: URL_PROTOCOLS, error: 'invalid_url' satisfies ErrorKey })
  .max(MAX_URL_CHARS, 'url_too_long' satisfies ErrorKey)

/**
 * Checks a request from the form before it goes to the API, with the limits of the contract:
 * text of `MIN_TEXT_CHARS` to `MAX_TEXT_CHARS` characters, or a full http(s) link of at most
 * `MAX_URL_CHARS` characters.
 *
 * @param request - The request the form built.
 * @returns The request with its text trimmed, or the `errors` key that refuses it.
 * @feature US-SPR-01, F-01
 */
export function validateCheck(request: CheckRequest): CheckRequest | ErrorKey {
  const field = request.url === undefined ? 'text' : 'url'
  const parsed = (field === 'url' ? url : text).safeParse(request[field] ?? '')
  if (parsed.success) {
    return { ...request, [field]: parsed.data }
  }
  const key = parsed.error.issues[0]?.message ?? ''
  return Object.hasOwn(pl.errors, key) ? (key as ErrorKey) : 'empty'
}
