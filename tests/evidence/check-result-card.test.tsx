/**
 * The result card through the public API of `src/evidence`, rendered on the contract
 * examples (contracts/examples.json).
 *
 * @feature US-SPR-04, US-SPR-05, US-ZRD-01, US-ZRD-02, US-ZRD-03, US-ZRD-06, F-17
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { render, screen, within } from '@testing-library/react'
import { formatDate } from '@/components/meritum'
import examples from '@/contracts/examples.json'
import type { CheckResult, ClaimResult, Verdict } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { CheckResultCard } from '@/evidence'
import { fakeHandoff } from '../moderation/fake-handoff'

const { handoff } = fakeHandoff()

const done = examples['CheckResult.done'] as CheckResult
const abstain = examples['CheckResult.abstain'] as CheckResult
const [falseClaim] = done.claims ?? []
// formatDate uses the machine's time zone; expected dates follow it, so CI on UTC agrees.
const sourceDate = formatDate('1997-07-16T00:00:00+02:00')
const claimDate = formatDate('2026-11-21')
const premises = /Niezależne źródła: 1, w tym urzędowe lub pierwotne: 1\. Źródła są zgodne\./
const verdicts = Object.keys(pl.verdict).filter((key) => key !== '$comment') as Verdict[]

function renderClaim(claim: ClaimResult) {
  render(<CheckResultCard result={{ ...done, claims: [claim] }} handoff={handoff} />)
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
  assert.ok(claim.getAllByRole('time').some((time) => time.textContent === sourceDate))
  const citation = falseClaim?.citations?.[0]
  assert.ok(citation)
  const link = claim.getByRole('link', { name: citation.source.title })
  assert.equal(link.getAttribute('href'), citation.source.url)
  assert.ok(claim.getByText('Kancelaria Sejmu (ISAP). Akt prawny, źródło urzędowe lub pierwotne.'))
  assert.equal(
    claim.getByRole('blockquote').textContent,
    `„${pl.result.fragment}: ${citation.fragment}”`,
  )
})

test('strength "umiarkowana" comes with its premises', () => {
  const claim = renderClaim(claimWith({}))
  assert.ok(claim.getByText(`${pl.result.strength_title}: ${pl.strength.moderate}`))
  assert.ok(claim.getByText(premises))
  assert.ok(
    claim.getByText((text) =>
      text.includes(`Najnowsze źródło jest z ${sourceDate}, a twierdzenie dotyczy ${claimDate}`),
    ),
  )
})

test('the explanation stands in its own block without a per-claim AI note; the card has the AI line once', () => {
  const claim = renderClaim(claimWith({}))
  const block = claim.getByRole('heading', { name: pl.result.explanation }).parentElement
  assert.ok(block)
  assert.equal(within(block).getByText(falseClaim?.explanation ?? '').tagName, 'P')
  assert.equal(within(block).queryByText(pl.result.explanation_hint), null)
  assert.equal(within(block).queryAllByRole('blockquote').length, 0)
  assert.ok(screen.getByText(pl.result.ai_disclosure))
})

test('a claim reads from its verdict: the verdict word comes before the claim, the explanation and the quotes', () => {
  // design-system#108: the verdict leads the card
  const claim = renderClaim(claimWith({}))
  const html = screen.getByRole('article').innerHTML
  const at = (text: string) => html.indexOf(text)
  const order = [
    pl.verdict.false,
    falseClaim?.claim ?? '',
    falseClaim?.explanation ?? '',
    'blockquote',
  ]
  assert.deepEqual(
    order.map(at),
    [...order.map(at)].sort((a, b) => a - b),
  )
  assert.ok(claim.getByRole('heading', { level: 3, name: new RegExp(`^${pl.verdict.false}`) }))
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
  render(<CheckResultCard result={abstain} handoff={handoff} />)
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
  render(<CheckResultCard result={done} handoff={handoff} />)
  assert.ok(screen.getByText(pl.result.limitations))
  assert.ok(screen.getByText(pl.limitation_code.corpus_scope))
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

test('the long label "Brak wystarczających dowodów" is whole and heads the claim on its own line', () => {
  const claim = renderClaim(claimWith({ verdict: 'insufficient_evidence', strength: null }))
  const badge = claim.getByText('Brak wystarczających dowodów')
  assert.equal(badge.textContent, 'Brak wystarczających dowodów')
  assert.equal(badge.parentElement?.className.includes('block'), true)
  assert.equal(badge.parentElement?.parentElement?.tagName, 'H3')
})

const claimReview = examples['CheckResult.claim_review'] as CheckResult

test('limitation codes are worded from copy, in place of the limitation texts', () => {
  render(<CheckResultCard result={claimReview} handoff={handoff} />)
  assert.ok(screen.getByText(pl.limitation_code.image_search_not_run))
  assert.equal(screen.queryByText(claimReview.limitations?.[0] ?? ''), null)
})
