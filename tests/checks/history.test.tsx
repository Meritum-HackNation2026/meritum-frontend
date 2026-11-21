/**
 * The session history of `src/checks`: results kept in sessionStorage under one key, newest
 * first, so the tab can open them again without asking the API.
 *
 * @feature US-SPR-09, US-BEZ-05, F-01, F-20
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findSavedCheck, forgetChecks, saveCheck, savedChecks } from '@/checks'
import examples from '@/contracts/examples.json'
import type { CheckResult } from '@/contracts/meritum'

const done = examples['CheckResult.done'] as CheckResult
const abstain = examples['CheckResult.abstain'] as CheckResult

test('an empty tab has no saved checks', () => {
  assert.deepEqual(savedChecks(), [])
})

test('saved results come back newest first, all under one sessionStorage key', () => {
  saveCheck(done)
  saveCheck(abstain)
  assert.deepEqual(
    savedChecks().map((saved) => saved.result.check_id),
    ['c_02', 'c_01'],
  )
  assert.equal(sessionStorage.length, 1)
})

test('saving a check again replaces its entry and moves it to the top', () => {
  saveCheck(done)
  saveCheck(abstain)
  saveCheck(done)
  assert.deepEqual(
    savedChecks().map((saved) => saved.result.check_id),
    ['c_01', 'c_02'],
  )
})

test('a saved check is found by its id; an unknown id is not', () => {
  saveCheck(done)
  assert.deepEqual(findSavedCheck('c_01'), done)
  assert.equal(findSavedCheck('c_99'), undefined)
})

test('forgetting the checks empties the history', () => {
  saveCheck(done)
  forgetChecks()
  assert.deepEqual(savedChecks(), [])
})

test('a broken or foreign value under the key reads as an empty history', () => {
  saveCheck(done)
  const [key] = Object.keys(sessionStorage)
  for (const value of ['not json', '{"a":1}', '[{"at":"x"}]', '[null]']) {
    sessionStorage.setItem(String(key), value)
    assert.deepEqual(savedChecks(), [], value)
  }
})
