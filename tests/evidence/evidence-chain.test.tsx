/**
 * The evidence chain of a claim on the result card (public API of `src/evidence`): the timeline
 * of citations by stance with their dates, a superseded piece of evidence, conflicting sources,
 * the warning about old evidence and „co zmieniłoby werdykt”, all from the contract's fields.
 *
 * @feature US-ZRD-11, US-ZRD-04, US-ZRD-05, US-ZRD-10, F-17
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { render, screen, within } from '@testing-library/react'
import { fill, formatDate } from '@/components/meritum'
import examples from '@/contracts/examples.json'
import type { CheckResult, Citation, ClaimResult } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { CheckResultCard } from '@/evidence'
import { fakeHandoff } from '../moderation/fake-handoff'

const done = examples['CheckResult.done'] as CheckResult
const [base] = done.claims ?? []
const { handoff } = fakeHandoff()

function citation(
  id: string,
  changes: Partial<Citation>,
  published: string,
  publisher = 'gov',
): Citation {
  assert.ok(base?.citations?.[0])
  const { source } = base.citations[0]
  return {
    ...base.citations[0],
    ...changes,
    source: {
      ...source,
      id,
      title: `Dokument ${id}`,
      publisher_id: publisher,
      published_at: published,
    },
  }
}

function renderClaim(changes: Partial<ClaimResult>) {
  assert.ok(base)
  render(
    <CheckResultCard result={{ ...done, claims: [{ ...base, ...changes }] }} handoff={handoff} />,
  )
  return within(screen.getByRole('article'))
}

function hasText(text: string): boolean {
  return document.body.textContent?.includes(text) ?? false
}

const older = citation(
  'old',
  { stance: 'supports', validity: 'superseded' },
  '2025-01-10T00:00:00Z',
)
const newer = citation('new', { stance: 'refutes', validity: 'expires' }, '2026-02-15T00:00:00Z')

test('the timeline shows both citations with their dates and marks the older one as superseded', () => {
  const claim = renderClaim({
    claim_date: '2026-03-01',
    claim_date_source: 'text',
    citations: [newer, older],
  })
  assert.ok(claim.getByRole('heading', { name: pl.result.timeline_title }))
  const dates = claim.getAllByRole('time').map((time) => time.textContent)
  assert.ok(dates.includes(formatDate('2025-01-10T00:00:00Z')))
  assert.ok(dates.includes(formatDate('2026-02-15T00:00:00Z')))
  const superseded = fill(pl.result.superseded, { date: formatDate('2026-02-15T00:00:00Z') })
  const oldItem = claim.getByRole('link', { name: 'Dokument old' }).closest('li[data-entry]')
  assert.equal(oldItem?.textContent?.includes(superseded), true)
  const newItem = claim.getByRole('link', { name: 'Dokument new' }).closest('li[data-entry]')
  assert.equal(newItem?.textContent?.includes(superseded), false)
})

test('the timeline groups citations: supporting, refuting, then context', () => {
  const context = citation('ctx', { stance: 'context' }, '2024-05-01T00:00:00Z')
  const claim = renderClaim({ citations: [context, newer, older] })
  const headings = claim.getAllByRole('heading', { level: 5 }).map((h) => h.textContent)
  assert.deepEqual(headings, [
    pl.result.stance.supports,
    pl.result.stance.refutes,
    pl.result.stance.context,
  ])
})

test('the timeline starts with the claim date and where that date comes from', () => {
  const claim = renderClaim({
    claim_date: '2026-03-01',
    claim_date_source: 'text',
    citations: [newer],
  })
  const first = claim.getAllByRole('time')[0]
  assert.equal(first?.textContent, formatDate('2026-03-01'))
  assert.ok(hasText(pl.result.claim_date_source.text))
})

test('conflicting sources stand side by side with the note on what differs, and no strength', () => {
  const supports = citation(
    'a',
    { stance: 'supports', validity: 'expires' },
    '2026-01-10T00:00:00Z',
    'a',
  )
  const refutes = citation(
    'b',
    { stance: 'refutes', validity: 'expires' },
    '2026-01-12T00:00:00Z',
    'b',
  )
  const difference = 'Jedno źródło podaje 12 osób, drugie 21.'
  const claim = renderClaim({
    verdict: 'insufficient_evidence',
    strength: null,
    unresolved: difference,
    citations: [supports, refutes],
  })
  assert.ok(claim.getByText(fill(pl.result.conflict, { difference })))
  assert.ok(claim.getByRole('heading', { name: pl.result.stance.supports }))
  assert.ok(claim.getByRole('heading', { name: pl.result.stance.refutes }))
  assert.equal(claim.queryAllByText(new RegExp(pl.result.strength_title)).length, 0)
  assert.equal(claim.queryAllByText(pl.result.unresolved).length, 0)
})

test('old evidence shows the newest source date and the claim date with a warning, not a day count', () => {
  const stale = citation('s', { stance: 'supports', validity: 'expires' }, '2025-01-25T00:00:00Z')
  assert.ok(base?.strength)
  const premises = { ...base.strength.premises, newest_source_published_at: '2025-01-25T00:00:00Z' }
  renderClaim({
    verdict: 'confirmed',
    claim_date: '2026-03-01',
    claim_date_source: 'text',
    archival: true,
    strength: { level: 'weak', premises },
    citations: [stale],
  })
  const warning = screen.getByText(new RegExp(pl.result.archival.slice(0, 20)))
  const newest = fill(pl.result.newest, {
    source_date: formatDate('2025-01-25T00:00:00Z'),
    claim_date: formatDate('2026-03-01'),
    claim_date_source: pl.result.claim_date_source.text,
  })
  assert.equal(warning.textContent?.includes(newest), true)
  assert.equal(warning.textContent?.includes('400'), false)
})

test('a law in force is never old evidence, so it gets no warning', () => {
  const law = citation('law', { stance: 'refutes', validity: 'in_force' }, '1997-07-16T00:00:00Z')
  renderClaim({ archival: true, citations: [law] })
  assert.equal(hasText(pl.result.archival), false)
})

test('„co zmieniłoby werdykt” lists the codes from the result in copy words', () => {
  const claim = renderClaim({
    verdict: 'confirmed',
    would_change_verdict: ['needs_primary_source'],
  })
  assert.ok(claim.getByRole('heading', { name: pl.result.what_would_change }))
  assert.ok(claim.getByText(pl.would_change_verdict.needs_primary_source))
})

test('a result without codes shows no „co zmieniłoby werdykt” block', () => {
  const claim = renderClaim({ would_change_verdict: [] })
  assert.equal(claim.queryAllByText(pl.result.what_would_change).length, 0)
})
