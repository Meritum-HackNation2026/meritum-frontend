import { useId } from 'react'
import { t } from '@/components/meritum'
import type { CheckResult } from '@/contracts/meritum'
import { Transcript } from './_transcript'

/**
 * The text read from a checked screenshot or photo next to its result (US-SPR-08): the heading,
 * the note that the system read it automatically and may have misread letters, the text as the
 * API sent it (line breaks kept), and the reminder that a date visible in the image does not
 * confirm when it was published. It is context, separate from the verdicts.
 *
 * @param props.text - `CheckResult.image_text`: the text read from the image by OCR.
 * @returns The image text section.
 * @feature US-SPR-08, F-33
 */
function ImageText({ text }: { text: string }) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="grid min-w-0 gap-1.5 rounded-lg border border-border bg-card px-3.5 py-3 text-card-foreground"
    >
      <h2 id={id} className="text-small font-semibold">
        {t.result.image_text}
      </h2>
      <p className="text-meta text-muted-foreground text-pretty">{t.result.image_text_hint}</p>
      <p className="text-body whitespace-pre-line break-words">{text}</p>
      <p className="text-meta text-muted-foreground text-pretty">{t.result.image_date_hint}</p>
    </section>
  )
}

/**
 * What the system read from the file the citizen sent, above the result: the transcript of a
 * recording or the text of an image; nothing for a typed text or link.
 *
 * @param props.result - The result of the check.
 * @returns The sections that apply, or nothing.
 * @feature US-SPR-08, US-SPR-11, F-08, F-33
 */
export function ReadFromFile({ result }: { result: CheckResult }) {
  return (
    <>
      {result.transcript && <Transcript text={result.transcript} />}
      {result.image_text && <ImageText text={result.image_text} />}
    </>
  )
}
