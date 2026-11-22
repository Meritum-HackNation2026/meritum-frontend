/**
 * The result card on a payload the dev API really returned for a check with no sources.
 *
 * @feature US-SPR-04, F-17
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { render, screen } from '@testing-library/react'
import type { CheckResult } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { CheckResultCard } from '@/evidence'
import payload from '../fixtures/dev-check-insufficient.json'
import { fakeHandoff } from '../moderation/fake-handoff'

const { handoff } = fakeHandoff()

test('a check with no sources renders its card', () => {
  render(<CheckResultCard result={payload as CheckResult} handoff={handoff} />)
  assert.ok(screen.getByRole('article'))
})

test('a limit the API repeats is listed once', () => {
  render(<CheckResultCard result={payload as CheckResult} handoff={handoff} />)
  const limitation = pl.limitation_code.corpus_scope
  const items = screen.getAllByRole('listitem').filter((item) => item.textContent === limitation)
  assert.equal(items.length, 1)
})
