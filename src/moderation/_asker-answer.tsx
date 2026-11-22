import { useCallback, useEffect, useState } from 'react'
import { t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import type { AskerAnswerOutcome, AskerAnswerReader } from './ports'

const copy = t.moderation.asker_answer

function Message({ title, text, onRetry }: { title: string; text: string; onRetry?: () => void }) {
  return (
    <section className="grid justify-items-start gap-3">
      <h1 className="text-h2 font-bold">{title}</h1>
      <p role="alert" className="text-body text-pretty">
        {text}
      </p>
      {onRetry && (
        <Button type="button" variant="outline" className="rounded-pill" onClick={onRetry}>
          {copy.retry}
        </Button>
      )}
    </section>
  )
}

function Loaded({
  caseId,
  reader,
  onRetry,
}: {
  caseId: string
  reader: AskerAnswerReader
  onRetry: () => void
}) {
  const [outcome, setOutcome] = useState<AskerAnswerOutcome | null>(null)
  useEffect(() => {
    let active = true
    reader.read(caseId).then((next) => {
      if (active) {
        setOutcome(next)
      }
    })
    return () => {
      active = false
    }
  }, [caseId, reader])
  if (outcome === null) {
    return <p className="text-body text-muted-foreground">{copy.loading}</p>
  }
  if (outcome === 'not_found') {
    return <Message title={copy.not_found_title} text={copy.not_found} />
  }
  if (outcome === 'failed') {
    return <Message title={copy.title} text={copy.error} onRetry={onRetry} />
  }
  return (
    <article className="grid gap-4">
      <h1 className="text-title font-bold">{copy.title}</h1>
      <p className="text-body whitespace-pre-line text-pretty">{outcome.answer.text}</p>
      <section aria-labelledby="asker-citations" className="grid gap-2 border-t pt-4">
        <h2 id="asker-citations" className="text-body font-bold">
          {copy.citations_title}
        </h2>
        <ul className="grid gap-2">
          {outcome.answer.citations.map(({ fragment, source }) => (
            <li key={`${source}-${fragment}`} className="grid gap-1.5 py-2 pl-6">
              <blockquote className="relative text-body text-pretty">
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -left-6 select-none font-bold text-title text-verified leading-none"
                >
                  „
                </span>
                {fragment}”
              </blockquote>
              <p className="text-muted-foreground text-small">{source}</p>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-small text-muted-foreground text-pretty">{copy.note}</p>
    </article>
  )
}

/**
 * The moderator's answer as the asker reads it at /odpowiedzi/{case_id}: the text, each cited
 * fragment with its source, and that the answer is not public. An unknown answer and a failed
 * read have their own texts; only a failed read can be tried again. Never says who else asked.
 *
 * @param props.caseId - The case number from the notification link.
 * @param props.reader - Reads the answer (the `src/api` adapter in the app).
 * @returns The answer page.
 * @feature US-MOD-07, US-POW-02, F-39
 */
export function AskerAnswer({ caseId, reader }: { caseId: string; reader: AskerAnswerReader }) {
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return <Loaded key={attempt} caseId={caseId} reader={reader} onRetry={retry} />
}
