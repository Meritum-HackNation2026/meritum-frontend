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

/**
 * „Zgłoś błąd” under one claim: the button opens a short form with an optional justification
 * (up to what the API reads); sending it shows the case number and that the moderator's answer
 * comes as a notification. The text is the same whether the case was new or joined, so it never
 * tells whether someone else asked. Esc closes the form and returns focus to the button.
 *
 * @param props.checkId - The finished check.
 * @param props.claimIndex - The claim's position in the result.
 * @param props.handoff - Sends the dispute (the `src/api` adapter in the app).
 * @returns The report button, its form, or the confirmation.
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
 */
export function ReportError({
  checkId,
  claimIndex,
  handoff,
}: {
  checkId: string
  claimIndex: number
  handoff: Handoff
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const toggle = useRef<HTMLButtonElement>(null)
  const formId = useId()
  const fieldId = useId()
  const { caseId, error, pending, send } = useHandoff(() =>
    handoff.dispute(checkId, claimIndex, text),
  )
  const submit = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      send()
    },
    [send],
  )
  const closeOnEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false)
      toggle.current?.focus()
    }
  }, [])
  const flip = useCallback(() => setOpen((isOpen) => !isOpen), [])
  const edit = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => setText(event.target.value),
    [],
  )
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
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls={open ? formId : undefined}
        className="-ml-2.5"
        onClick={flip}
      >
        {t.result.report_error}
      </Button>
      {open && (
        <form id={formId} onSubmit={submit} onKeyDown={closeOnEscape} className="grid w-full gap-2">
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
            className="justify-self-start"
          >
            {t.result.report_error}
          </Button>
          {error && (
            <p role="alert" className="text-small text-pretty">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
