import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from 'react'
import { fill, t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { focusOnMount, useHandoff } from './_handoff-state'
import { MAX_JUSTIFICATION_CHARS } from './constants'
import type { Handoff } from './ports'

type FormProps = {
  id: string
  pending: boolean
  error: string | null
  onSend: () => void
  onClose: () => void
  text: string
  onText: (text: string) => void
}

// The open form: the optional justification, the send button and the error of the last try.
function ReportForm({ id, pending, error, onSend, onClose, text, onText }: FormProps) {
  const fieldId = useId()
  const submit = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      onSend()
    },
    [onSend],
  )
  const closeOnEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    },
    [onClose],
  )
  const edit = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => onText(event.target.value),
    [onText],
  )
  return (
    <form id={id} onSubmit={submit} onKeyDown={closeOnEscape} className="grid w-full gap-2">
      <label htmlFor={fieldId} className="text-small">
        {t.result.report_error_reason}
      </label>
      <Textarea
        id={fieldId}
        value={text}
        maxLength={MAX_JUSTIFICATION_CHARS}
        onChange={edit}
        autoFocus
      />
      <Button
        type="submit"
        variant="outline"
        aria-disabled={pending}
        aria-busy={pending}
        className="justify-self-start aria-disabled:opacity-50"
      >
        {t.result.report_error_send}
      </Button>
      {error && (
        <p role="alert" className="text-small text-pretty">
          {error}
        </p>
      )}
    </form>
  )
}

/**
 * „Zgłoś błąd” under one claim: the button opens a short form with an optional justification
 * (up to what the API reads); sending it shows the case number and that the moderator's answer
 * comes as a notification. The text is the same whether the case was new or joined, so it never
 * tells whether someone else asked. Esc closes the form and returns focus to the button.
 *
 * @param props.checkId - The finished check.
 * @param props.claimIndex - The claim's position in the result.
 * @param props.handoff - Sends the dispute (the `src/api` adapter in the app).
 * @param props.onSaved - Told the case number once the API saved it.
 * @returns The report button, its form, or the confirmation.
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
 */
export function ReportError({
  checkId,
  claimIndex,
  handoff,
  onSaved,
}: {
  checkId: string
  claimIndex: number
  handoff: Handoff
  onSaved: (caseId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const toggle = useRef<HTMLButtonElement>(null)
  const formId = useId()
  const { caseId, error, pending, send } = useHandoff(
    () => handoff.dispute(checkId, claimIndex, text),
    onSaved,
  )
  const toggleForm = useCallback(() => setOpen((isOpen) => !isOpen), [])
  const close = useCallback(() => {
    setOpen(false)
    toggle.current?.focus()
  }, [])
  if (caseId) {
    return (
      <p ref={focusOnMount} tabIndex={-1} className="mt-3 text-small text-pretty">
        {fill(t.result.report_error_done, { case: caseId })}
      </p>
    )
  }
  return (
    <div className="mt-3 grid justify-items-start gap-2">
      <Button
        ref={toggle}
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-controls={open ? formId : undefined}
        className="h-10 rounded-pill px-4 text-small font-semibold"
        onClick={toggleForm}
      >
        {t.result.report_error}
      </Button>
      {open && (
        <ReportForm
          id={formId}
          {...{ pending, error, text, onText: setText, onSend: send, onClose: close }}
        />
      )}
    </div>
  )
}
