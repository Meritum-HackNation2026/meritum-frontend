/**
 * The zod check of a request before it goes to the API agrees with the design-system form
 * (`toRequest`) on every limit, and names its refusal with an `errors` key of copy/pl.json.
 *
 * @feature US-SPR-01, F-01
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_TEXT_CHARS, MAX_URL_CHARS, MIN_TEXT_CHARS, validateCheck } from '@/checks'
import { toRequest } from '@/components/meritum/check-form'
import pl from '@/copy/pl.json'

const link = (length: number) => `https://example.com/${'a'.repeat(length - 20)}`

for (const input of [
  'a'.repeat(MIN_TEXT_CHARS - 1),
  'a'.repeat(MIN_TEXT_CHARS),
  'a'.repeat(MAX_TEXT_CHARS),
  'a'.repeat(MAX_TEXT_CHARS + 1),
  link(MAX_URL_CHARS),
  link(MAX_URL_CHARS + 1),
  'http://localhost:8000/a',
]) {
  test(`zod and the form agree on ${input.slice(0, 24)}… (${input.length} characters)`, () => {
    const field = input.startsWith('http') ? 'url' : 'text'
    assert.deepEqual(validateCheck({ channel: 'web', [field]: input }), toRequest(input))
  })
}

test('a link with another scheme is refused as invalid_url', () => {
  assert.equal(validateCheck({ channel: 'web', url: 'ftp://example.com/a' }), 'invalid_url')
})

test('a request with neither text nor link is refused as empty', () => {
  assert.equal(validateCheck({ channel: 'web' }), 'empty')
})

test('every refusal is a message of copy/pl.json', () => {
  for (const request of [{ channel: 'web' as const }, { channel: 'web' as const, url: 'x' }]) {
    const outcome = validateCheck(request)
    assert.equal(typeof outcome === 'string' && outcome in pl.errors, true)
  }
})
