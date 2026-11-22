import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { fill, t } from '@/components/meritum'
import type { CitationRow } from './_answer-citation'
import type { AnswerApi, AnswerDraft, AnswerOutcome, AnswerSource } from './ports'

const copy = t.moderation.answer

/** What stops a send: the row it belongs to (null for the text or the whole list) and its words. */
type AnswerProblem = { row: number | null; message: string }

const emptyRow = (key: number): CitationRow => ({ key, source_id: '', fragment: '' })

// Why the draft cannot be sent yet: the first problem, as the position of the row it belongs to
// (or null for the text) and its text. Nothing is sent to the API until this is empty.
function problem(text: string, rows: CitationRow[]): AnswerProblem[] {
  if (!text.trim()) {
    return [{ row: null, message: copy.text_required }]
  }
  const incomplete = rows.findIndex((row) => !(row.source_id && row.fragment.trim()))
  if (incomplete >= 0 && rows.length === 1 && !rows[0]?.source_id && !rows[0]?.fragment.trim()) {
    return [{ row: null, message: copy.citation_required }]
  }
  return incomplete >= 0
    ? [{ row: incomplete, message: fill(copy.citation_incomplete, { n: incomplete + 1 }) }]
    : []
}

const refusals = {
  expired: t.staff.sign_in.session_expired,
  no_access: t.staff.sign_in.no_access,
  failed: copy.not_sent,
}

function outcomeProblems(outcome: Exclude<AnswerOutcome, 'sent'>): AnswerProblem[] {
  if (typeof outcome === 'object') {
    return outcome.rejected.map((row) => ({
      row,
      message: fill(copy.citation_not_verbatim, { n: row + 1 }),
    }))
  }
  return [{ row: null, message: refusals[outcome] }]
}

/**
 * The state of one answer form: what is typed, the catalogue, the problem of the last try and
 * whether a send is out. Nothing is sent while the draft has a problem; a refused send keeps
 * everything typed.
 *
 * @param caseId - The case being answered.
 * @param checkIds - The checks of the case, whose cited sources fill the picker.
 * @param api - Reads the catalogue and sends the answer.
 * @param onSent - Told the sent draft with the catalogue.
 * @returns The fields' state and the submit handler.
 * @feature US-MOD-07, F-39, ADR-06
 */
export function useAnswerForm(
  caseId: string,
  checkIds: readonly string[],
  api: AnswerApi,
  onSent: (draft: AnswerDraft, sources: AnswerSource[]) => void,
) {
  const [text, setText] = useState('')
  const [rows, setRows] = useState<CitationRow[]>([emptyRow(0)])
  const [sources, setSources] = useState<AnswerSource[] | null | 'failed'>(null)
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<AnswerProblem[]>([])
  const nextKey = useRef(1)
  useEffect(() => {
    let current = true
    api.sources(checkIds).then((list) => current && setSources(list ?? 'failed'))
    return () => {
      current = false
    }
  }, [api, checkIds])
  const submit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      if (pending) {
        return
      }
      const found = problem(text, rows)
      setErrors(found)
      if (found.length > 0) {
        return
      }
      const draft = {
        text: text.trim(),
        citations: rows.map(({ source_id, fragment }) => ({
          source_id,
          fragment: fragment.trim(),
        })),
      }
      setPending(true)
      const outcome = await api.send(caseId, draft)
      setPending(false)
      if (outcome === 'sent') {
        onSent(draft, Array.isArray(sources) ? sources : [])
      } else {
        setErrors(outcomeProblems(outcome))
      }
    },
    [api, caseId, onSent, pending, rows, sources, text],
  )
  const addRow = useCallback(() => setRows((all) => [...all, emptyRow(nextKey.current++)]), [])
  const editRow = useCallback(
    (key: number, values: Pick<CitationRow, 'source_id' | 'fragment'>) =>
      setRows((all) => all.map((row) => (row.key === key ? { ...row, ...values } : row))),
    [],
  )
  const removeRow = useCallback(
    (key: number) => setRows((all) => all.filter((row) => row.key !== key)),
    [],
  )
  return { text, setText, rows, sources, pending, errors, submit, addRow, editRow, removeRow }
}
