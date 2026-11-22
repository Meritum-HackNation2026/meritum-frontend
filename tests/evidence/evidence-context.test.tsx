/**
 * The context block of the result card (public API of `src/evidence`): fact-checkers' ratings,
 * the incident match with what it rests on and the sanctions note, each apart from the verdict.
 *
 * @feature US-ZRD-08, US-ZRD-07, US-KOR-01, F-11, F-14, F-34
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { render, screen, within } from '@testing-library/react'
import { fill, formatDate } from '@/components/meritum'
import examples from '@/contracts/examples.json'
import type { CheckResult, ClaimReviewPremise, IncidentMatch } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { CheckResultCard } from '@/evidence'
import { fakeHandoff } from '../moderation/fake-handoff'
import { hasText, renderClaim } from './chain-fixtures'

const done = examples['CheckResult.done'] as CheckResult
const { handoff } = fakeHandoff()

const incident: IncidentMatch = {
  database: 'euvsdisinfo',
  incident_id: 'euvsd-1',
  matched_on: 'content',
  match_basis: ['title', 'topic', 'date'],
  title: 'Polska planuje wysłać wojsko na Ukrainę',
  date: '2025-03-04',
  url: 'https://euvsdisinfo.eu/report/polska-wojsko/',
  similarity: 0.91,
}

function contextBlock() {
  return within(screen.getByRole('region', { name: pl.result.context_title }))
}

test('a match from EUvsDisinfo shows title, date, the case link, the source and its disclaimer', () => {
  renderClaim({ incident })
  const block = contextBlock()
  assert.ok(hasText(incident.title))
  assert.ok(hasText(formatDate(incident.date)))
  assert.ok(hasText('EUvsDisinfo'))
  assert.ok(hasText('EEAS East StratCom Task Force'))
  assert.ok(hasText(pl.result.euvsdisinfo_disclaimer))
  const links = block.getAllByRole('link')
  assert.deepEqual(
    links.map((link) => link.getAttribute('href')),
    [incident.url],
  )
  assert.equal(links[0]?.textContent, pl.result.incident_link)
})

test('a match from the organiser database names that database and has no EUvsDisinfo disclaimer', () => {
  renderClaim({ incident: { ...incident, database: 'organiser' } })
  assert.ok(hasText(pl.result.incident_database.organiser))
  assert.equal(hasText(pl.result.euvsdisinfo_disclaimer), false)
})

test('a domain match is a neutral warning outside the verdict row', () => {
  renderClaim({ incident: { ...incident, matched_on: 'domain', match_basis: ['domain', 'topic'] } })
  const block = contextBlock()
  assert.ok(
    block.getByText(
      (_, node) =>
        node?.tagName === 'P' && (node.textContent?.startsWith('Ten link prowadzi') ?? false),
    ),
  )
  assert.equal(block.queryByText(pl.verdict.false), null)
})

test('the card says what the match rests on: title, topic and date', () => {
  renderClaim({ incident })
  assert.ok(hasText(fill(pl.result.match_basis, { fields: 'tytuł, temat i data' })))
})

test('a fact-checker premise shows publisher, the rating verbatim, title, date and link, no fragment', () => {
  const premise: ClaimReviewPremise = {
    publisher: 'Demagog',
    publisher_id: 'demagog',
    signatory_of: ['ifcn', 'efcsn'],
    rating: 'Fałsz',
    title: 'Nie, Polska nie wysyła wojska',
    reviewed_at: '2026-10-02',
    url: 'https://demagog.org.pl/fake_news/wojsko/',
    fetched_at: '2026-11-21T10:00:00Z',
    stance: 'refutes',
  }
  const claim = renderClaim({ claim_review_premises: [premise] })
  const link = claim.getByRole('link', { name: premise.title })
  assert.equal(link.getAttribute('href'), premise.url)
  assert.ok(hasText(fill(pl.result.claim_review, { publisher: 'Demagog', rating: 'Fałsz' })))
  assert.ok(hasText(fill(pl.result.claim_review_meta, { date: formatDate(premise.reviewed_at) })))
  const item = link.closest('li')
  assert.equal(item?.querySelector('blockquote'), null)
})

test('a fact-checker rating left as context sits in the context block with its link', () => {
  renderClaim({
    claim_reviews: [
      { publisher: 'AFP Sprawdzam', rating: 'Bez kontekstu', url: 'https://sprawdzam.afp.com/x' },
    ],
  })
  const block = contextBlock()
  assert.ok(
    hasText(
      fill(pl.result.claim_review_context, { publisher: 'AFP Sprawdzam', rating: 'Bez kontekstu' }),
    ),
  )
  assert.equal(block.getByRole('link').getAttribute('href'), 'https://sprawdzam.afp.com/x')
})

test('a sanctions note links to the list entry and stays apart from every verdict', () => {
  const warning = {
    code: 'eu_sanctioned_entity' as const,
    entity: 'RT',
    basis_url: 'https://eur-lex.europa.eu/x',
  }
  render(<CheckResultCard result={{ ...done, source_warning: warning }} handoff={handoff} />)
  const link = screen.getByRole('link', { name: pl.source_warning.basis_link })
  assert.equal(link.getAttribute('href'), warning.basis_url)
  assert.equal(link.closest('article'), null)
  assert.ok(hasText(fill(pl.source_warning.eu_sanctioned_entity, { entity: 'RT' })))
})

test('without context data the card has no context block', () => {
  renderClaim({ incident: null, claim_reviews: [] })
  assert.equal(screen.queryByRole('region', { name: pl.result.context_title }), null)
})
