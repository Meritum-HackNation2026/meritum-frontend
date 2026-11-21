import { CitationItem, fill, formatDate, t } from '@/components/meritum'
import type { Citation, ClaimResult } from '@/contracts/meritum'
import { cn } from '@/lib/utils'
import { isConflict, type StanceGroup, stanceGroups, supersededOn } from './_chain'
import { DECISIVE_VERDICTS } from './constants'

function Entry({ citation, all }: { citation: Citation; all: readonly Citation[] }) {
  const published = citation.source.published_at
  const isSuperseded = citation.validity === 'superseded'
  const newer = isSuperseded ? supersededOn(citation, all) : null
  return (
    <li
      data-entry
      className="relative before:absolute before:top-1.5 before:-left-4 before:size-2 before:rounded-full before:bg-muted-foreground"
    >
      {published && (
        <time dateTime={published} className="font-mono text-meta text-muted-foreground">
          {formatDate(published)}
        </time>
      )}
      {newer && (
        <p className="mt-0.5 text-small font-semibold text-pretty">
          {fill(t.result.superseded, { date: formatDate(newer) })}
        </p>
      )}
      <ul>
        <CitationItem citation={citation} className="pt-1" />
      </ul>
    </li>
  )
}

function Group({ group, all }: { group: StanceGroup; all: readonly Citation[] }) {
  return (
    <div className="mt-2 min-w-0">
      <h5 className="font-semibold text-meta text-muted-foreground">
        {t.result.stance[group.stance]}
      </h5>
      <ol className="mt-1 ml-1.5 grid gap-1 border-l border-border pl-3">
        {group.citations.map((citation) => (
          <Entry key={citation.source.id + citation.fragment} citation={citation} all={all} />
        ))}
      </ol>
    </div>
  )
}

/**
 * The evidence chain of one claim as a timeline (DESIGN_SYSTEM.md 6.4): the claim's date and
 * where it comes from, then the citations grouped by stance (supporting, refuting, context), each
 * group oldest first with its publication date in Azeret Mono. Evidence the result marks as
 * superseded says so in words, with the date of the newer document. When reliable sources
 * disagree on an unsettled claim, both sides stand side by side under the note on what differs;
 * an unsettled claim without both sides shows no quotes.
 *
 * @param props.claim - One claim result from the API.
 * @returns The timeline, or null when there is nothing to show.
 * @feature US-ZRD-11, US-ZRD-04, US-ZRD-05, US-ZRD-10, F-17
 */
export function EvidenceTimeline({ claim }: { claim: ClaimResult }) {
  const citations = claim.citations ?? []
  const conflict = isConflict(claim)
  const isShown = DECISIVE_VERDICTS.has(claim.verdict) || conflict
  if (!isShown || citations.length === 0) {
    return null
  }
  return (
    <div className="mt-3">
      <h4 className="font-semibold text-meta text-muted-foreground">{t.result.timeline_title}</h4>
      {conflict && (
        <p className="mt-1 text-small text-pretty">
          {fill(t.result.conflict, { difference: claim.unresolved ?? '' })}
        </p>
      )}
      <p className="mt-1 text-small">
        {t.result.claim}:{' '}
        <time dateTime={claim.claim_date} className="font-mono">
          {formatDate(claim.claim_date)}
        </time>{' '}
        <span className="text-muted-foreground">
          ({t.result.claim_date_source[claim.claim_date_source]})
        </span>
      </p>
      <div className={cn('grid gap-x-4', conflict && 'sm:grid-cols-2')}>
        {stanceGroups(citations).map((group) => (
          <Group key={group.stance} group={group} all={citations} />
        ))}
      </div>
    </div>
  )
}
