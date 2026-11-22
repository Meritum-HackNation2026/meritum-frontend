import { t } from '@/components/meritum'
import type { AnswerDraft, AnswerSource } from './ports'

const copy = t.moderation.answer

/**
 * The answer a moderator just sent: its text, each citation with its source, and that it went
 * to the askers as a notification and is not public. Never says who asked. Takes focus when it
 * appears, so the change from the form is announced.
 *
 * @param props.draft - What was sent.
 * @param props.sources - The catalogue, to name each cited source.
 * @returns The sent answer.
 * @feature US-MOD-07, F-39, ADR-06
 */
export function AnswerSent({ draft, sources }: { draft: AnswerDraft; sources: AnswerSource[] }) {
  return (
    <section
      ref={(element) => element?.focus()}
      tabIndex={-1}
      aria-labelledby="answer-sent-title"
      className="grid gap-3 border-t pt-4 outline-none"
    >
      <h3 id="answer-sent-title" className="text-body font-bold">
        {copy.sent_title}
      </h3>
      <p className="text-body whitespace-pre-line text-pretty">{draft.text}</p>
      <ul className="grid gap-2">
        {draft.citations.map((citation) => {
          const source = sources.find((candidate) => candidate.id === citation.source_id)
          return (
            <li
              key={`${citation.source_id}-${citation.fragment}`}
              className="grid gap-0.5 text-small"
            >
              <q className="text-pretty">{citation.fragment}</q>
              {source && (
                <span className="text-muted-foreground">{`${source.title}, ${source.publisher}`}</span>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-small text-muted-foreground text-pretty">{copy.sent_note}</p>
    </section>
  )
}
