import { type ReactNode, useId } from 'react'
import { fill, formatDate, t } from '@/components/meritum'
import type {
  ClaimResult,
  ClaimReviewContext,
  ClaimReviewPremise,
  IncidentMatch,
  MatchBasis,
  SourceStatusWarning,
} from '@/contracts/meritum'
import { LOCALE } from './constants'

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-verified underline decoration-current/35 underline-offset-3 hover:decoration-current"
    >
      {children}
    </a>
  )
}

// One neutral row of the context block: never red, never a verdict badge (DESIGN_SYSTEM.md 6.4).
function Row({ children }: { children: ReactNode }) {
  return <li className="grid gap-0.5 py-1.5 text-small text-pretty">{children}</li>
}

function matchBasisText(basis: MatchBasis): string {
  const fields = new Intl.ListFormat(LOCALE, { type: 'conjunction' }).format(
    basis.map((field) => t.match_basis[field]),
  )
  return fill(t.result.match_basis, { fields })
}

// The incident: database, title and date, what the match rests on and the link to the case
// description. The contract's url is that description, never the disinformation material.
function IncidentRow({ incident }: { incident: IncidentMatch }) {
  const database = t.result.incident_database[incident.database ?? 'organiser']
  const text = incident.matched_on === 'domain' ? t.result.incident_domain : t.result.incident
  return (
    <Row>
      <p>
        {fill(text, { database, title: incident.title, date: formatDate(incident.date) })}{' '}
        <ExternalLink href={incident.url}>{t.result.incident_link}</ExternalLink>
      </p>
      <p className="text-meta text-muted-foreground">{matchBasisText(incident.match_basis)}</p>
      {incident.database === 'euvsdisinfo' && (
        <p className="text-meta text-muted-foreground">{t.result.euvsdisinfo_disclaimer}</p>
      )}
    </Row>
  )
}

function ReviewRow({ review }: { review: ClaimReviewContext }) {
  return (
    <Row>
      <p>
        {fill(t.result.claim_review_context, {
          publisher: review.publisher,
          rating: review.rating,
        })}{' '}
        <ExternalLink href={review.url}>
          <span className="font-mono text-meta">{new URL(review.url).hostname}</span>
        </ExternalLink>
      </p>
    </Row>
  )
}

/**
 * Context of one claim, in its own titled region under the evidence and apart from the verdict:
 * the incident match with the database, what it rests on and the case link (the EUvsDisinfo
 * disclaimer with it), and fact-checkers' ratings kept as context, each with its link. Neutral
 * rows; none changes the verdict (ADR-24, ADR-26).
 *
 * @param props.claim - One claim result from the API.
 * @returns The context block, or null when the claim has no context.
 * @feature US-ZRD-08, US-ZRD-07, F-11, F-14
 */
export function ContextSection({ claim }: { claim: ClaimResult }) {
  const reviews = claim.claim_reviews ?? []
  const id = useId()
  if (!claim.incident && reviews.length === 0) {
    return null
  }
  return (
    <section aria-labelledby={id} className="mt-2.5 border-t border-border/70 pt-2">
      <h4 id={id} className="font-semibold text-meta text-muted-foreground">
        {t.result.context_title}
      </h4>
      <ul>
        {claim.incident && <IncidentRow incident={claim.incident} />}
        {reviews.map((review) => (
          <ReviewRow key={review.url} review={review} />
        ))}
      </ul>
    </section>
  )
}

/**
 * Fact-checkers' ClaimReview ratings that back the verdict, among the evidence: the publisher
 * and the rating verbatim, the linked title and the review date, with no page fragment (ADR-34).
 *
 * @param props.premises - `ClaimResult.claim_review_premises`.
 * @returns The list, or null when there are none.
 * @feature US-ZRD-07, F-11
 */
export function ClaimReviewPremises({ premises }: { premises?: ClaimReviewPremise[] | undefined }) {
  if (!premises || premises.length === 0) {
    return null
  }
  return (
    <ul className="mt-2.5">
      {premises.map((premise) => (
        <li key={premise.url} className="grid gap-0.5 py-1.5">
          <span className="text-small">
            <ExternalLink href={premise.url}>{premise.title}</ExternalLink>
          </span>
          <p className="text-small text-pretty">
            {fill(t.result.claim_review, { publisher: premise.publisher, rating: premise.rating })}
          </p>
          <p className="text-meta text-muted-foreground">
            {fill(t.result.claim_review_meta, { date: formatDate(premise.reviewed_at) })}
          </p>
        </li>
      ))}
    </ul>
  )
}

/**
 * The neutral note that the checked content comes from an entity on the EU sanctions list, with
 * the link to its entry, above the claims and outside every verdict (US-KOR-01).
 *
 * @param props.warning - `CheckResult.source_warning`.
 * @returns The note, or null.
 * @feature US-KOR-01, F-34
 */
export function SourceWarningNote({
  warning,
}: {
  warning?: SourceStatusWarning | null | undefined
}) {
  if (!warning) {
    return null
  }
  return (
    <p className="mx-3.5 mt-2.5 border-b border-border/70 pb-2 text-small text-pretty">
      {fill(t.source_warning[warning.code], { entity: warning.entity })}{' '}
      <ExternalLink href={warning.basis_url}>{t.source_warning.basis_link}</ExternalLink>
    </p>
  )
}
