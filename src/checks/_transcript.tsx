import { useId } from 'react'
import { t } from '@/components/meritum'

/**
 * The transcript of a checked recording next to its result (US-SPR-11): the heading, the note
 * that it was made automatically and may have errors, then the masked text from the API as it
 * came, line breaks kept.
 *
 * @param props.text - `CheckResult.transcript`: the automatic transcript, personal data masked.
 * @returns The transcript section.
 * @feature US-SPR-11, F-08
 */
export function Transcript({ text }: { text: string }) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="grid min-w-0 gap-1.5 rounded-lg border border-border bg-card px-3.5 py-3 text-card-foreground"
    >
      <h2 id={id} className="text-small font-semibold">
        {t.result.transcript}
      </h2>
      <p className="text-meta text-muted-foreground text-pretty">{t.result.transcript_hint}</p>
      <p className="text-body whitespace-pre-line break-words">{text}</p>
    </section>
  )
}
