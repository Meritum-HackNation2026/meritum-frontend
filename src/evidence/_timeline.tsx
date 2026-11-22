import { fill, formatDate, t } from '@/components/meritum'
import type { ClaimResult } from '@/contracts/meritum'
import { cn } from '@/lib/utils'
import { type StanceGroup, stanceGroups, type TimelineEntry } from './_chain'

function sourceLine({ citation }: TimelineEntry): string {
  const { publisher, kind, tier, via } = citation.source
  const found = via === 'web_search' ? `, ${t.result.via_web}` : ''
  const kindWord = t.source_kind[kind]
  return `${publisher}. ${kindWord.charAt(0).toUpperCase()}${kindWord.slice(1)}, ${t.source_tier[tier]}${found}.`
}

function supersededText({ supersededOn }: TimelineEntry): string {
  return supersededOn
    ? fill(t.result.superseded, { date: formatDate(supersededOn) })
    : t.result.superseded_undated
}

// One timeline row: the publication date, a superseded mark in words, then the source as
// CitationItem shows it (DESIGN_SYSTEM.md 6.4: the fragment first with its „ hanging in the
// margin, the attribution under it) without repeating the date. Not CitationItem itself: that
// renders its own <li>, and this row is already one.
function Entry({ entry }: { entry: TimelineEntry }) {
  const { source, fragment } = entry.citation
  return (
    <li className="relative grid gap-1.5 py-2 before:absolute before:top-3.5 before:-left-4 before:size-2 before:rounded-full before:bg-muted-foreground">
      <p className="text-small tabular-nums text-muted-foreground">
        {source.published_at ? (
          <time dateTime={source.published_at}>{formatDate(source.published_at)}</time>
        ) : (
          fill(t.result.source_undated, { publisher: source.publisher })
        )}
      </p>
      {entry.isSuperseded && (
        <p className="text-small font-semibold text-pretty">{supersededText(entry)}</p>
      )}
      <blockquote className="relative ml-6 text-body text-pretty">
        <span
          aria-hidden="true"
          className="absolute -top-1 -left-6 select-none font-bold text-title text-verified leading-none"
        >
          „
        </span>
        <span className="sr-only">{t.result.fragment}: </span>
        {fragment}”
      </blockquote>
      <p className="ml-6 text-small text-muted-foreground">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-verified underline decoration-current/35 underline-offset-3 hover:decoration-current"
        >
          {source.title}
        </a>{' '}
        <span>{sourceLine(entry)}</span>
      </p>
    </li>
  )
}

function Group({ group, isWide }: { group: StanceGroup; isWide: boolean }) {
  return (
    <div className={cn('mt-2 min-w-0', isWide && 'sm:col-span-2')}>
      <h5 className="font-semibold text-small text-muted-foreground">
        {t.result.stance[group.stance]}
      </h5>
      <ol className="mt-1 ml-1.5 border-l border-border pl-3">
        {group.entries.map((entry) => (
          <Entry key={entry.citation.source.id + entry.citation.fragment} entry={entry} />
        ))}
      </ol>
    </div>
  )
}

/**
 * The evidence chain of one claim as a timeline (DESIGN_SYSTEM.md 6.4), in place of the plain
 * source list: the claim's date and where it comes from, then the citations grouped by stance
 * (supporting, refuting, context), each group oldest first with its publication date. Evidence the result marks as superseded says so in words. When reliable sources disagree
 * on an unsettled claim, the two sides stand side by side under the note on what differs and
 * context goes below them; an unsettled claim (`insufficient_evidence`) without both sides shows
 * no quotes, every other verdict shows its citations.
 *
 * @param props.claim - One claim result from the API.
 * @param props.isConflict - Reliable sources disagree (`isConflict` of the claim).
 * @returns The timeline, or null when there is nothing to show.
 * @feature US-ZRD-11, US-ZRD-04, US-ZRD-05, US-ZRD-10, F-17
 */
export function EvidenceTimeline({
  claim,
  isConflict,
}: {
  claim: ClaimResult
  isConflict: boolean
}) {
  const groups = stanceGroups(claim)
  // unsettled claims show quotes only when both sides stand next to each other
  const isHiddenUnsettled = claim.verdict === 'insufficient_evidence' && !isConflict
  if (isHiddenUnsettled || groups.length === 0) {
    return null
  }
  const difference = claim.unresolved
  return (
    <div className="mt-4">
      <h4 className="font-semibold text-small text-muted-foreground">{t.result.timeline_title}</h4>
      {isConflict && (
        <p className="mt-1 text-small text-pretty">
          {difference ? fill(t.result.conflict, { difference }) : t.result.agreement.conflicting}
        </p>
      )}
      <p className="mt-1 text-small">
        {t.result.claim}:{' '}
        <time dateTime={claim.claim_date} className="tabular-nums">
          {formatDate(claim.claim_date)}
        </time>{' '}
        <span className="text-muted-foreground">
          ({t.result.claim_date_source[claim.claim_date_source]})
        </span>
      </p>
      <div className={cn('grid gap-x-4', isConflict && 'sm:grid-cols-2')}>
        {groups.map((group) => (
          <Group
            key={group.stance}
            group={group}
            isWide={isConflict && group.stance === 'context'}
          />
        ))}
      </div>
    </div>
  )
}
