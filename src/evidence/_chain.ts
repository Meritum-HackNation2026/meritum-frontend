import type { Citation, ClaimResult, Stance } from '@/contracts/meritum'
import { AGE_EXEMPT_VALIDITY, STANCE_ORDER } from './constants'

/**
 * Citations of one stance on the evidence timeline, oldest first.
 *
 * @feature US-ZRD-11, US-ZRD-04, F-17
 */
export type StanceGroup = { stance: Stance; citations: Citation[] }

function publishedAt(citation: Citation): number {
  const date = citation.source.published_at
  // undated evidence goes last in its group
  return date ? Date.parse(date) : Number.POSITIVE_INFINITY
}

/**
 * Groups the citations by stance in `STANCE_ORDER`, each group oldest first; empty groups are
 * left out.
 *
 * @param citations - The claim's citations.
 * @returns The non-empty groups.
 * @feature US-ZRD-11, US-ZRD-04, F-17
 */
export function stanceGroups(citations: readonly Citation[]): StanceGroup[] {
  return STANCE_ORDER.map((stance) => ({
    stance,
    citations: citations
      .filter((citation) => citation.stance === stance)
      .sort((a, b) => publishedAt(a) - publishedAt(b)),
  })).filter((group) => group.citations.length > 0)
}

function newestDate(citations: readonly Citation[]): string | null {
  const dated = citations.filter((c) => c.source.published_at && publishedAt(c) < Infinity)
  const newest = dated.sort((a, b) => publishedAt(b) - publishedAt(a))[0]
  return newest?.source.published_at ?? null
}

/**
 * The date of the document that superseded a piece of evidence: the newest later citation of the
 * same publisher, else the newest later citation of any publisher. The contract marks evidence
 * as superseded but does not link the newer document, so the card names it only by its date.
 *
 * @param citation - A citation whose validity is `superseded`.
 * @param citations - All citations of the claim.
 * @returns The newer document's date, or null when the claim cites none.
 * @feature US-ZRD-04, F-17, ADR-25
 */
export function supersededOn(citation: Citation, citations: readonly Citation[]): string | null {
  const later = citations.filter((other) => publishedAt(other) > publishedAt(citation))
  const samePublisher = later.filter(
    (other) => other.source.publisher_id === citation.source.publisher_id,
  )
  return newestDate(samePublisher) ?? newestDate(later)
}

/**
 * Reliable sources disagree: the claim is unsettled and cites both sides.
 *
 * @param claim - The claim result.
 * @returns True when both sides stand next to each other on the card.
 * @feature US-ZRD-04, F-17
 */
export function isConflict(claim: ClaimResult): boolean {
  const citations = claim.citations ?? []
  const isUnsettled = claim.verdict === 'insufficient_evidence'
  const hasSupport = citations.some((c) => c.stance === 'supports')
  const hasRefutation = citations.some((c) => c.stance === 'refutes')
  return isUnsettled && hasSupport && hasRefutation
}

/**
 * Whether the card warns that the newest evidence is old for the claim's date: the result says
 * so (`archival`) and some current evidence can go out of date. Laws in force, pages updated in
 * place and past events never do (ADR-25).
 *
 * @param claim - The claim result.
 * @returns True when the warning shows.
 * @feature US-ZRD-05, US-ZRD-10, F-17, ADR-25
 */
export function showsArchivalWarning(claim: ClaimResult): boolean {
  const current = (claim.citations ?? []).filter((c) => c.validity !== 'superseded')
  const canAge = current.some((c) => !(c.validity && AGE_EXEMPT_VALIDITY.has(c.validity)))
  return claim.archival === true && (current.length === 0 || canAge)
}

/**
 * The newest source date the warning about old evidence names: the strength premises' date,
 * else the newest current citation.
 *
 * @param claim - The claim result.
 * @returns The date, or null when no source is dated.
 * @feature US-ZRD-05, US-ZRD-10, F-17
 */
export function newestSourceDate(claim: ClaimResult): string | null {
  const current = (claim.citations ?? []).filter((c) => c.validity !== 'superseded')
  return claim.strength?.premises.newest_source_published_at ?? newestDate(current)
}
