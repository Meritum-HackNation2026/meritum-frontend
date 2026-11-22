import { type ChangeEvent, useCallback, useId } from 'react'
import { fill, t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import type { AnswerSource } from './ports'

const copy = t.moderation.answer

/**
 * One citation row as the form keeps it; `key` is stable while rows come and go.
 *
 * @feature US-MOD-07, F-39, ADR-06
 */
export type CitationRow = { key: number; source_id: string; fragment: string }

/**
 * One citation of the answer form: the catalogue source, the verbatim fragment, and the error
 * of the last send for this row. The error is tied to the fragment field, so a screen reader
 * reads it with the field.
 *
 * @param props.position - The row's position from 1, shown in the labels and errors.
 * @param props.row - What is typed so far.
 * @param props.sources - The catalogue; null while loading, `failed` when unreadable.
 * @param props.error - Why this citation cannot be sent, or null.
 * @param props.onEdit - Told the row's key and its new values.
 * @param props.onRemove - Removes the row by its key.
 * @param props.removable - False when it is the only row.
 * @returns The citation fields.
 * @feature US-MOD-07, F-39, ADR-06
 */
export function AnswerCitationFields({
  position,
  row,
  sources,
  error,
  onEdit,
  onRemove,
  removable,
}: {
  position: number
  row: CitationRow
  sources: AnswerSource[] | null | 'failed'
  error: string | null
  onEdit: (key: number, values: Pick<CitationRow, 'source_id' | 'fragment'>) => void
  onRemove: (key: number) => void
  removable: boolean
}) {
  const id = useId()
  const errorId = `${id}-error`
  const pickSource = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) =>
      onEdit(row.key, { source_id: event.target.value, fragment: row.fragment }),
    [onEdit, row],
  )
  const typeFragment = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) =>
      onEdit(row.key, { source_id: row.source_id, fragment: event.target.value }),
    [onEdit, row],
  )
  const remove = useCallback(() => onRemove(row.key), [onRemove, row.key])
  const list = Array.isArray(sources) ? sources : []
  return (
    <fieldset className="grid gap-2 border-t pt-3">
      <legend className="sr-only">{`${copy.citations_title} ${position}`}</legend>
      <label htmlFor={`${id}-source`} className="text-small font-semibold">
        {copy.source_label}
      </label>
      <NativeSelect
        id={`${id}-source`}
        className="w-full [&_select]:h-11 [&_select]:rounded-md [&_select]:text-body"
        value={row.source_id}
        disabled={sources === null}
        onChange={pickSource}
      >
        <NativeSelectOption value="">
          {sources === null ? copy.source_loading : copy.source_placeholder}
        </NativeSelectOption>
        {list.map((source) => (
          <NativeSelectOption key={source.id} value={source.id}>
            {`${source.title}, ${source.publisher}`}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {sources === 'failed' && <p className="text-small text-pretty">{copy.sources_failed}</p>}
      <label htmlFor={`${id}-fragment`} className="text-small font-semibold">
        {copy.fragment_label}
      </label>
      <Textarea
        id={`${id}-fragment`}
        value={row.fragment}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        onChange={typeFragment}
      />
      {error && (
        <p id={errorId} role="alert" className="text-small font-semibold text-pretty">
          {error}
        </p>
      )}
      {removable && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-self-start rounded-pill"
          onClick={remove}
        >
          {fill(copy.remove_citation, { n: position })}
        </Button>
      )}
    </fieldset>
  )
}
