import { LoaderCircle } from 'lucide-react'
import { type ChangeEvent, useCallback } from 'react'
import { t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AnswerCitationFields } from './_answer-citation'
import { useAnswerForm } from './_answer-state'
import type { AnswerApi, AnswerDraft, AnswerSource } from './ports'

const copy = t.moderation.answer

/**
 * The moderator's answer to one open case: the text, one or more citations (a catalogue source
 * and a fragment) and „Wyślij odpowiedź”. The browser only checks that nothing is empty; the API
 * checks every fragment verbatim against its source, and a citation it rejects is named on its
 * row while everything typed stays. A send already out blocks the next one.
 *
 * @param props.caseId - The case being answered.
 * @param props.checkIds - The checks of the case, whose cited sources fill the picker.
 * @param props.api - Reads the catalogue and sends the answer (the `src/api` adapter in the app).
 * @param props.onSent - Told the sent draft with the catalogue, so the panel can show it.
 * @returns The answer form.
 * @feature US-MOD-07, F-39, ADR-06
 */
export function AnswerForm({
  caseId,
  checkIds,
  api,
  onSent,
}: {
  caseId: string
  checkIds: readonly string[]
  api: AnswerApi
  onSent: (draft: AnswerDraft, sources: AnswerSource[]) => void
}) {
  const form = useAnswerForm(caseId, checkIds, api, onSent)
  const { errors, rows } = form
  const { setText } = form
  const changeText = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => setText(event.target.value),
    [setText],
  )
  const general = errors.find((e) => e.row === null)
  return (
    <form onSubmit={form.submit} noValidate className="grid gap-3 pt-4">
      <h3 className="text-body font-bold">{copy.title}</h3>
      <label htmlFor={`${caseId}-answer`} className="text-small font-semibold">
        {copy.text_label}
      </label>
      <Textarea
        id={`${caseId}-answer`}
        value={form.text}
        aria-invalid={general?.message === copy.text_required}
        onChange={changeText}
      />
      <h4 className="text-small font-semibold">{copy.citations_title}</h4>
      {rows.map((row, index) => (
        <AnswerCitationFields
          key={row.key}
          position={index + 1}
          row={row}
          sources={form.sources}
          error={errors.find((e) => e.row === index)?.message ?? null}
          onEdit={form.editRow}
          onRemove={form.removeRow}
          removable={rows.length > 1}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 justify-self-start rounded-pill px-4"
        onClick={form.addRow}
      >
        {copy.add_citation}
      </Button>
      {general && (
        <p role="alert" className="text-small font-semibold text-pretty">
          {general.message}
        </p>
      )}
      <Button
        type="submit"
        aria-disabled={form.pending}
        aria-busy={form.pending}
        size="lg"
        className="h-11 justify-self-start rounded-pill px-5 aria-disabled:opacity-50"
      >
        {form.pending && (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        )}
        {form.pending ? copy.sending : copy.send}
      </Button>
    </form>
  )
}
