/**
 * The form limits in `checks/constants.ts` match the contract and the design-system validation.
 *
 * @feature US-SPR-01, F-01
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_TEXT_CHARS, MIN_TEXT_CHARS } from '@/checks'
import { toRequest } from '@/components/meritum/check-form'
import schema from '@/contracts/meritum.schema.json'

test('the longest text is the contract maxLength of CheckRequest.text', () => {
  const [text] = schema.$defs.CheckRequest.properties.text.anyOf
  assert.equal(MAX_TEXT_CHARS, text?.maxLength)
  assert.equal(typeof toRequest('a'.repeat(MAX_TEXT_CHARS)), 'object')
  assert.equal(toRequest('a'.repeat(MAX_TEXT_CHARS + 1)), 'too_long')
})

test('text shorter than MIN_TEXT_CHARS is refused as empty', () => {
  assert.equal(toRequest('a'.repeat(MIN_TEXT_CHARS - 1)), 'empty')
  assert.equal(typeof toRequest('a'.repeat(MIN_TEXT_CHARS)), 'object')
})

test('a link is refused as url_too_long above 2083 characters, even above 4000', () => {
  const link = (length: number) => `https://example.com/${'a'.repeat(length - 20)}`
  assert.equal(typeof toRequest(link(2083)), 'object')
  assert.equal(toRequest(link(2084)), 'url_too_long')
  assert.equal(toRequest(link(4100)), 'url_too_long')
})
