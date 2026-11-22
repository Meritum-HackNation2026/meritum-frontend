import { Link } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { plural, t } from '@/components/meritum'
import type { ModeratorCase } from '@/contracts/meritum'
import { AnswerForm } from './_answer-form'
import { AnswerSent } from './_answer-sent'
import { DEFAULT_DISTINCT_ASKERS } from './constants'
import type { AnswerApi, AnswerDraft, AnswerSource } from './ports'

const copy = t.moderation

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * One case in full: summary, state and reasons, the matched high-risk topic with how it was
 * recognised, the distinct askers and every claim with the checks that asked it (the question
 * count is in the queue row). Shows only contract fields, so no channel ids or their hashes.
 *
 * An open case also has the moderator's answer form when an answer API is given; after a send
 * the form gives way to the sent answer.
 *
 * @param props.moderatorCase - The open case.
 * @param props.answers - Reads the catalogue and sends the answer; without it there is no form.
 * @param props.onAnswered - Told the case id once the answer was sent, so the panel can mark the case answered.
 * @returns The case detail.
 * @feature US-MOD-05, US-MOD-02, US-MOD-07, F-25, F-39
 */
export function CaseDetail({
  moderatorCase: c,
  answers,
  onAnswered,
}: {
  moderatorCase: ModeratorCase
  answers?: AnswerApi | undefined
  onAnswered?: (caseId: string) => void
}) {
  const [sent, setSent] = useState<{ draft: AnswerDraft; sources: AnswerSource[] } | null>(null)
  const markSent = useCallback(
    (draft: AnswerDraft, sources: AnswerSource[]) => {
      setSent({ draft, sources })
      onAnswered?.(c.id)
    },
    [c.id, onAnswered],
  )
  const checkIds = c.claims.flatMap((claim) => claim.check_ids)
  const titleId = `case-${c.id}`
  return (
    <article aria-labelledby={titleId} className="grid gap-4 rounded-lg border bg-card p-5">
      <header className="grid gap-1">
        <p className="flex flex-wrap items-center gap-2 text-small text-muted-foreground">
          <span className="font-mono">{c.id}</span>
          <span className="rounded-pill bg-secondary px-2 py-0.5 text-meta font-semibold text-foreground">
            {copy.state[c.state]}
          </span>
        </p>
        <h2 id={titleId} className="text-title font-bold text-balance">
          {c.summary}
        </h2>
      </header>
      <ul className="grid gap-1 text-body">
        {c.reasons.map((reason) => (
          <li key={reason}>{capitalize(copy.reason[reason])}</li>
        ))}
      </ul>
      {c.high_risk_topic && (
        <p className="text-body">
          <span className="font-semibold">{c.high_risk_topic}</span>
          {c.high_risk_classified_by && (
            <span className="block text-small text-muted-foreground">
              {capitalize(copy.high_risk_by[c.high_risk_classified_by])}
            </span>
          )}
        </p>
      )}
      <p className="text-small text-muted-foreground tabular-nums">
        {plural(copy.askers, c.distinct_askers ?? DEFAULT_DISTINCT_ASKERS)}
      </p>
      <ol className="grid gap-3">
        {c.claims.map((claim) => (
          <li key={claim.claim} className="grid gap-1 border-t pt-3">
            <p className="text-body">{claim.claim}</p>
            <ul className="flex flex-wrap gap-x-3 text-small">
              {claim.check_ids.map((checkId) => (
                <li key={checkId}>
                  <Link
                    to="/sprawdzenie/$checkId"
                    params={{ checkId }}
                    className="rounded-md font-mono underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {checkId}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      {sent && <AnswerSent draft={sent.draft} sources={sent.sources} />}
      {!sent && answers && c.state === 'open' && (
        <AnswerForm caseId={c.id} checkIds={checkIds} api={answers} onSent={markSent} />
      )}
    </article>
  )
}
