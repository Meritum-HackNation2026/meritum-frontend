/**
 * The evidence chain of a claim on the result card (public API of `src/evidence`): the timeline
 * of citations by stance with their dates, superseded evidence and conflicting sources.
 *
 * @feature US-ZRD-11, US-ZRD-04, US-ZRD-05, US-ZRD-10, F-17
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fill, formatDate } from '@/components/meritum'
import pl from '@/copy/pl.json'
import { citation, hasText, newer, older, renderClaim } from './chain-fixtures'

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
  const oldItem = claim.getByRole('link', { name: 'Dokument old' }).closest('li')
  assert.equal(oldItem?.textContent?.includes(superseded), true)
  const newItem = claim.getByRole('link', { name: 'Dokument new' }).closest('li')
  assert.equal(newItem?.textContent?.includes(superseded), false)
})

test('superseded evidence with no later document of its publisher is still marked, without a guessed date', () => {
  const other = citation(
    'other',
    { stance: 'refutes', validity: 'expires' },
    '2026-02-15T00:00:00Z',
    'other',
  )
  const claim = renderClaim({ citations: [older, other] })
  const oldItem = claim.getByRole('link', { name: 'Dokument old' }).closest('li')
  assert.equal(oldItem?.textContent?.includes(pl.result.superseded_undated), true)
  assert.equal(
    hasText(fill(pl.result.superseded, { date: formatDate('2026-02-15T00:00:00Z') })),
    false,
  )
})

test('an undated source names its publisher in words and has no date element', () => {
  const undated = { ...newer, source: { ...newer.source, published_at: null } }
  const claim = renderClaim({ citations: [undated] })
  const item = claim.getByRole('link', { name: 'Dokument new' }).closest('li')
  assert.equal(item?.querySelectorAll('time').length, 0)
  assert.equal(
    item?.textContent?.includes(
      fill(pl.result.source_undated, { publisher: newer.source.publisher }),
    ),
    true,
  )
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
    unresolved: difference,
    citations: [supports, refutes],
  })
  assert.ok(claim.getByText(fill(pl.result.conflict, { difference })))
  const sides = claim.getByRole('heading', { name: pl.result.stance.supports }).parentElement
    ?.parentElement
  assert.equal(sides?.classList.contains('sm:grid-cols-2'), true)
  assert.ok(claim.getByRole('heading', { name: pl.result.stance.supports }))
  assert.ok(claim.getByRole('heading', { name: pl.result.stance.refutes }))
  assert.equal(claim.queryAllByText(new RegExp(pl.result.strength_title)).length, 0)
  assert.equal(claim.queryAllByText(pl.result.unresolved).length, 0)
})

test('superseded evidence alone against a current source is no conflict, so no quotes', () => {
  const claim = renderClaim({
    verdict: 'insufficient_evidence',
    strength: null,
    citations: [
      older,
      citation('b', { stance: 'refutes', validity: 'expires' }, '2026-01-12T00:00:00Z', 'b'),
    ],
  })
  assert.equal(claim.queryAllByRole('blockquote').length, 0)
})

test('a conflict without a note on what differs says the sources disagree, with no empty "Różnica"', () => {
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
  renderClaim({
    verdict: 'insufficient_evidence',
    unresolved: null,
    citations: [supports, refutes],
  })
  assert.ok(hasText(pl.result.agreement.conflicting))
  assert.equal(hasText('Różnica:'), false)
})
