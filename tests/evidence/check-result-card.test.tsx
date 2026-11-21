/**
 * The result card through the public API of `src/evidence`, rendered on the contract
 * examples (contracts/examples.json).
 *
 * @feature US-SPR-04, US-SPR-05, US-ZRD-01, US-ZRD-02, US-ZRD-03, US-ZRD-06, F-17
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { render, screen, within } from '@testing-library/react'
import examples from '@/contracts/examples.json'
import type { CheckResult, ClaimResult, Verdict } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { CheckResultCard } from '@/evidence'

const done = examples['CheckResult.done'] as CheckResult
const abstain = examples['CheckResult.abstain'] as CheckResult
const [falseClaim] = done.claims ?? []
const sourceMeta = /^Kancelaria Sejmu \(ISAP\), 16 lipca 1997\. Akt prawny, /
const premises = /Niezależne źródła: 1, w tym urzędowe lub pierwotne: 1\. Źródła są zgodne\./
const newest = /Najnowsze źródło jest z 16 lipca 1997, a twierdzenie dotyczy 21 listopada 2026/
const verdicts = Object.keys(pl.verdict).filter((key) => key !== '$comment') as Verdict[]

function renderClaim(claim: ClaimResult) {
  render(<CheckResultCard result={{ ...done, claims: [claim] }} />)
  return within(screen.getByRole('article'))
}

function claimWith(changes: Partial<ClaimResult>): ClaimResult {
  assert.ok(falseClaim)
  return { ...falseClaim, ...changes }
}

test('a false claim shows the word "Fałszywe" on its badge', () => {
  const claim = renderClaim(claimWith({}))
  assert.equal(claim.getByText(pl.verdict.false).textContent, 'Fałszywe')
})

test('a citation shows title as a link, publisher, date and the verbatim fragment', () => {
  const claim = renderClaim(claimWith({}))
  const citation = falseClaim?.citations?.[0]
  assert.ok(citation)
  const link = claim.getByRole('link', { name: citation.source.title })
  assert.equal(link.getAttribute('href'), citation.source.url)
  assert.ok(claim.getByText(sourceMeta))
  assert.equal(
    claim.getByRole('blockquote').textContent,
    `${pl.result.fragment}: „${citation.fragment}”`,
  )
})

test('strength "umiarkowana" comes with its premises', () => {
  const claim = renderClaim(claimWith({}))
  assert.ok(claim.getByText(`${pl.result.strength_title}: ${pl.strength.moderate}`))
  assert.ok(claim.getByText(premises))
  assert.ok(claim.getByText(newest))
})

test('the explanation stands in its own block with the AI note, and the card has the AI line', () => {
  const claim = renderClaim(claimWith({}))
  const block = claim.getByRole('heading', { name: pl.result.explanation }).parentElement
  assert.ok(block)
  assert.equal(within(block).getByText(falseClaim?.explanation ?? '').tagName, 'P')
  assert.ok(within(block).getByText(pl.result.explanation_hint))
  assert.equal(within(block).queryAllByRole('blockquote').length, 0)
  assert.ok(screen.getByText(pl.result.ai_disclosure))
})

test('strength is ink-coloured with three level bars, two of them filled for "moderate"', () => {
  const claim = renderClaim(claimWith({}))
  const title = claim.getByText(`${pl.result.strength_title}: ${pl.strength.moderate}`)
  const bars = [...(title.querySelector('[aria-hidden="true"]')?.children ?? [])]
  assert.equal(bars.length, 3)
  assert.deepEqual(
    bars.map((bar) => bar.className.includes('bg-foreground')),
    [true, true, false],
  )
})

test('insufficient evidence with sources still shows no quotes', () => {
  const claim = renderClaim(claimWith({ verdict: 'insufficient_evidence' }))
  assert.equal(claim.queryAllByRole('blockquote').length, 0)
  assert.equal(claim.queryByText(pl.result.sources_title), null)
})

test('insufficient evidence shows what is unresolved, with no strength and no citations', () => {
  render(<CheckResultCard result={abstain} />)
  const claim = within(screen.getByRole('article'))
  assert.ok(claim.getByText(pl.verdict.insufficient_evidence))
  assert.ok(claim.getByText(pl.result.unresolved))
  assert.ok(claim.getByText('Czy takie zdarzenie miało miejsce i kto je ogłosił.'))
  assert.equal(claim.queryByText(new RegExp(pl.result.strength_title)), null)
  assert.equal(claim.queryByText(pl.result.sources_title), null)
  assert.equal(claim.queryAllByRole('link').length, 0)
})

test('a technique shows its name and one "how to spot" sentence', () => {
  const claim = renderClaim(claimWith({ technique: 'out_of_context' }))
  assert.ok(claim.getByText(pl.techniques.out_of_context.name))
  assert.ok(claim.getByText(pl.techniques.out_of_context.how_to_spot))
})

test('the limitations of the check are listed', () => {
  render(<CheckResultCard result={done} />)
  assert.ok(screen.getByText(pl.result.limitations))
  assert.ok(screen.getByText(done.limitations?.[0] ?? ''))
  assert.equal(screen.getAllByRole('article').length, 2)
})

for (const verdict of verdicts) {
  test(`verdict "${verdict}" shows its full word "${pl.verdict[verdict]}" and its hint`, () => {
    const claim = renderClaim(claimWith({ verdict }))
    const badge = claim.getByText(pl.verdict[verdict])
    assert.equal(badge.textContent, pl.verdict[verdict])
    assert.ok(claim.getByText(pl.verdict_hint[verdict]))
    assert.equal(badge.className.includes('scam'), verdict === 'false')
  })
}

for (const [verdict, shown] of [
  ['confirmed', true],
  ['false', true],
  ['misleading', true],
  ['insufficient_evidence', false],
  ['not_verifiable', false],
] as const) {
  test(`strength is ${shown ? 'shown' : 'hidden'} for "${verdict}"`, () => {
    const claim = renderClaim(claimWith({ verdict }))
    const strength = claim.queryByText(new RegExp(`^${pl.result.strength_title}:`))
    assert.equal(strength !== null, shown)
  })
}

test('the long label "Brak wystarczających dowodów" is whole and can wrap below the claim', () => {
  const claim = renderClaim(claimWith({ verdict: 'insufficient_evidence', strength: null }))
  const badge = claim.getByText('Brak wystarczających dowodów')
  assert.equal(badge.textContent, 'Brak wystarczających dowodów')
  assert.equal(badge.parentElement?.className.includes('flex-wrap'), true)
})
