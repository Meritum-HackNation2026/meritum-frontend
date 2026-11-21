/**
 * Panel sections by role, as the backend allows them (backend#22): moderators handle cases,
 * analysts read evaluation and export, administrators see every section.
 *
 * @feature US-MOD-05, F-25
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sectionsFor } from '@/moderation'

test('each role sees its own panel sections', () => {
  assert.deepEqual(sectionsFor('moderator'), ['cases'])
  assert.deepEqual(sectionsFor('analyst'), ['evaluation', 'export'])
  assert.deepEqual(sectionsFor('admin'), ['cases', 'evaluation', 'export', 'admin'])
})
