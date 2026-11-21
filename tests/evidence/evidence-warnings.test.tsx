/**
 * The warnings under the evidence chain (public API of `src/evidence`): old evidence with both
 * dates and „co zmieniłoby werdykt” from the contract's codes.
 *
 * @feature US-ZRD-11, US-ZRD-05, US-ZRD-10, F-17
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { screen } from '@testing-library/react'
import { fill, formatDate } from '@/components/meritum'
import pl from '@/copy/pl.json'
import { base, citation, hasText, renderClaim } from './chain-fixtures'

test('old evidence shows the newest source date and the claim date with a warning, not a day count', () => {
  const stale = citation('s', { stance: 'supports', validity: 'expires' }, '2025-01-25T00:00:00Z')
  assert.ok(base?.strength)
  const premises = { ...base.strength.premises, newest_source_published_at: '2025-01-25T00:00:00Z' }
  renderClaim({
    verdict: 'confirmed',
    claim_date: '2026-03-01',
    claim_date_source: 'text',
    archival: true,
    strength: { level: 'weak', premises: { ...premises, validity: 'expires' } },
    citations: [stale],
  })
  const newest = fill(pl.result.newest, {
    source_date: formatDate('2025-01-25T00:00:00Z'),
    claim_date: formatDate('2026-03-01'),
    claim_date_source: pl.result.claim_date_source.text,
  })
  const text = document.body.textContent ?? ''
  assert.ok(hasText(pl.result.archival))
  assert.equal(text.split(newest).length - 1, 1)
  assert.equal(text.includes('400'), false)
})

test('without a strength section the warning itself names both dates', () => {
  const stale = citation('s', { stance: 'refutes', validity: 'expires' }, '2025-01-25T00:00:00Z')
  renderClaim({
    claim_date: '2026-03-01',
    claim_date_source: 'text',
    archival: true,
    strength: null,
    citations: [stale],
  })
  const warning = screen.getByText(new RegExp(pl.result.archival.slice(0, 20)))
  assert.equal(warning.textContent?.includes(formatDate('2025-01-25T00:00:00Z')), true)
})

test('a law in force is never old evidence, so it gets no warning, even next to dated context', () => {
  const law = citation('law', { stance: 'refutes', validity: 'in_force' }, '1997-07-16T00:00:00Z')
  const context = citation(
    'ctx',
    { stance: 'context', validity: 'expires' },
    '2020-01-01T00:00:00Z',
  )
  renderClaim({ archival: true, strength: null, citations: [law, context] })
  assert.equal(hasText(pl.result.archival), false)
})

test('a decisive verdict whose newest agreeing source is a law in force gets no warning', () => {
  assert.ok(base?.strength)
  const premises = { ...base.strength.premises, validity: 'in_force' as const }
  const news = citation('news', { stance: 'refutes', validity: 'expires' }, '2020-01-01T00:00:00Z')
  renderClaim({ archival: true, strength: { level: 'moderate', premises }, citations: [news] })
  assert.equal(hasText(pl.result.archival), false)
})

test('evidence that can go out of date next to a law still gets the warning', () => {
  const law = citation('law', { stance: 'refutes', validity: 'in_force' }, '1997-07-16T00:00:00Z')
  const news = citation('news', { stance: 'refutes', validity: 'expires' }, '2020-01-01T00:00:00Z')
  renderClaim({ archival: true, strength: null, citations: [law, news] })
  assert.ok(hasText(pl.result.archival))
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
