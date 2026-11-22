import { LoaderCircle } from 'lucide-react'
import { type ChangeEvent, type FormEvent, useCallback, useState } from 'react'
import { t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { AnswerApi, CloseOutcome } from './ports'

const copy = t.moderation.close

const refusals: Record<Exclude<CloseOutcome, 'closed'>, string> = {
  expired: t.staff.sign_in.session_expired,
  no_access: t.staff.sign_in.no_access,
  failed: copy.not_closed,
}

/**
 * „Zamknij bez odpowiedzi” for one open case, e.g. a test or groundless one: the moderator's
 * reason and the button. Nothing goes to the askers; the API keeps who closed the case and why.
 * An empty reason is not sent, a refused close keeps what was typed, a close already out blocks
 * the next one.
 *
 * @param props.caseId - The case being closed.
 * @param props.api - Closes the case (the `src/api` adapter in the app).
 * @param props.onClosed - Told once the API closed the case.
 * @returns The close form.
 * @feature US-MOD-01, US-MOD-07, F-25, F-39
 */
export function CloseForm({
  caseId,
  api,
  onClosed,
}: {
  caseId: string
  api: AnswerApi
  onClosed: () => void
}) {
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const change = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => setReason(event.target.value),
    [],
  )
  const submit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      if (pending) {
        return
      }
      if (!reason.trim()) {
        setError(copy.reason_required)
        return
      }
      setPending(true)
      setError(null)
      const outcome = await api.close(caseId, reason.trim())
      setPending(false)
      if (outcome === 'closed') {
        onClosed()
      } else {
        setError(refusals[outcome])
      }
    },
    [api, caseId, onClosed, pending, reason],
  )
  const fieldId = `${caseId}-close`
  return (
    <form onSubmit={submit} noValidate className="grid gap-3 border-t pt-4">
      <label htmlFor={fieldId} className="text-small font-semibold">
        {copy.reason_label}
      </label>
      <p id={`${fieldId}-hint`} className="text-small text-muted-foreground text-pretty">
        {copy.reason_hint}
      </p>
      <Textarea
        id={fieldId}
        value={reason}
        aria-describedby={`${fieldId}-hint`}
        aria-invalid={error === copy.reason_required}
        onChange={change}
      />
      {error && (
        <p role="alert" className="text-small font-semibold text-pretty">
          {error}
        </p>
      )}
      <Button
        type="submit"
        variant="outline"
        aria-disabled={pending}
        aria-busy={pending}
        size="lg"
        className="h-11 justify-self-start rounded-pill px-5 aria-disabled:opacity-50"
      >
        {pending && (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        )}
        {pending ? copy.closing : copy.button}
      </Button>
    </form>
  )
}
