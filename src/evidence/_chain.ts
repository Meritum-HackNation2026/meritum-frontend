import type { Citation, ClaimResult, Stance } from '@/contracts/meritum'
import { AGE_EXEMPT_VALIDITY, DECISIVE_VERDICTS, STANCE_ORDER } from './constants'

/**
 * One citation on the evidence timeline: whether the result marks it as superseded and, when a
 * later citation of the same publisher shows it, the date of the newer document.
 *
 * @feature US-ZRD-11, US-ZRD-04, F-17
 */
export type TimelineEntry = {
  citation: Citation
  isSuperseded: boolean
  supersededOn: string | null
}

/**
 * Citations of one stance on the evidence timeline, oldest first.
 *
 * @feature US-ZRD-11, US-ZRD-04, F-17
 */
export type StanceGroup = { stance: Stance; entries: TimelineEntry[] }

function time(date: string | null | undefined): number {
  // undated or unreadable dates sort last
  const parsed = date ? Date.parse(date) : Number.NaN
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed
}

function isSuperseded(citation: Citation): boolean {
  return citation.validity === 'superseded'
}

function newest(dates: readonly (string | null | undefined)[]): string | null {
  const known = dates.filter((date): date is string => Boolean(date))
  return known.sort((a, b) => time(b) - time(a))[0] ?? null
}

// The contract marks evidence as superseded but does not link the newer document, so the card
// dates it only by a later citation of the same publisher; otherwise it names no date.
function supersededOn(citation: Citation, claim: ClaimResult): string | null {
  const published = time(citation.source.published_at)
  const samePublisher = (claim.citations ?? []).filter(
    (other) =>
      other.source.publisher_id === citation.source.publisher_id &&
      time(other.source.published_at) > published,
  )
  return newest(samePublisher.map((c) => c.source.published_at))
}

/**
 * Groups the claim's citations by stance in `STANCE_ORDER`, each group oldest first; empty
 * groups are left out.
 *
 * @param claim - The claim result.
 * @returns The non-empty groups.
 * @feature US-ZRD-11, US-ZRD-04, F-17
 */
export function stanceGroups(claim: ClaimResult): StanceGroup[] {
  const citations = claim.citations ?? []
  return STANCE_ORDER.map((stance) => ({
    stance,
    entries: citations
      .filter((citation) => citation.stance === stance)
      .sort((a, b) => time(a.source.published_at) - time(b.source.published_at))
      .map((citation) => ({
        citation,
        isSuperseded: isSuperseded(citation),
        supersededOn: isSuperseded(citation) ? supersededOn(citation, claim) : null,
      })),
  })).filter((group) => group.entries.length > 0)
}

/**
 * Reliable sources disagree: the claim is unsettled and current (not superseded) evidence
 * stands on both sides.
 *
 * @param claim - The claim result.
 * @returns True when both sides stand next to each other on the card.
 * @feature US-ZRD-04, F-17
 */
export function isConflict(claim: ClaimResult): boolean {
  const current = (claim.citations ?? []).filter((c) => !isSuperseded(c))
  const isUnsettled = claim.verdict === 'insufficient_evidence'
  const hasSupport = current.some((c) => c.stance === 'supports')
  const hasRefutation = current.some((c) => c.stance === 'refutes')
  return isUnsettled && hasSupport && hasRefutation
}

// current evidence on either side of the claim; context never dates a verdict
function currentEvidence(claim: ClaimResult): Citation[] {
  return (claim.citations ?? []).filter((c) => !isSuperseded(c) && c.stance !== 'context')
}

/**
 * Whether the card warns that the newest evidence is old for the claim's date: the result says
 * so (`archival`) and that evidence can go out of date. The strength premises name the validity
 * of the newest agreeing source; without them the current evidence decides. Laws in force, pages
 * updated in place and past events never go out of date (ADR-25).
 *
 * @param claim - The claim result.
 * @returns True when the warning shows.
 * @feature US-ZRD-05, US-ZRD-10, F-17, ADR-25
 */
export function showsArchivalWarning(claim: ClaimResult): boolean {
  const isExempt = (validity: Citation['validity']) =>
    Boolean(validity && AGE_EXEMPT_VALIDITY.has(validity))
  const premisesValidity = claim.strength?.premises.validity
  const evidence = currentEvidence(claim)
  const canAge = premisesValidity
    ? !isExempt(premisesValidity)
    : evidence.length === 0 || evidence.some((c) => !isExempt(c.validity))
  return claim.archival === true && canAge
}

/**
 * The newest source date the warning about old evidence names, when the strength section does
 * not already name it: the newest current evidence on either side of the claim.
 *
 * @param claim - The claim result.
 * @returns The date, or null when the strength section shows it or no source is dated.
 * @feature US-ZRD-05, US-ZRD-10, F-17
 */
export function newestDateForWarning(claim: ClaimResult): string | null {
  const strengthShowsIt =
    DECISIVE_VERDICTS.has(claim.verdict) &&
    Boolean(claim.strength?.premises.newest_source_published_at)
  return strengthShowsIt ? null : newest(currentEvidence(claim).map((c) => c.source.published_at))
}
