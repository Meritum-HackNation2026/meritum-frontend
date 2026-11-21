import { type FormEvent, useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { CheckRequest } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { fill, t } from "./copy"

const MAX = 4000

type ErrorKey = keyof typeof t.errors

/** Text or a full http(s) link; a bare "www.x.pl" is rejected with a hint rather than guessed. */
export function toRequest(raw: string, channel: CheckRequest["channel"] = "web"): CheckRequest | ErrorKey {
  const value = raw.trim()
  if (value.length > MAX) return "too_long"
  if (/^\S+$/.test(value) && /^(https?:\/\/|www\.)/i.test(value)) {
    try {
      const url = new URL(value)
      return url.protocol === "http:" || url.protocol === "https:" ? { channel, url: url.href } : "invalid_url"
    } catch {
      return "invalid_url"
    }
  }
  return value.length < 3 ? "empty" : { channel, text: value }
}

/**
 * "Sprawdź informację" (DESIGN_SYSTEM.md 6.1): one column from 320 px, errors under the field from copy `errors`,
 * the typed text is never cleared on an error. `serverError` shows a rate limit, busy or offline message.
 */
export function CheckForm({
  onSubmit,
  pending = false,
  serverError,
  retentionDays,
  onDeleteChecks,
  className,
}: {
  onSubmit: (request: CheckRequest) => void
  pending?: boolean
  serverError?: ErrorKey | null
  retentionDays: number
  onDeleteChecks?: () => void
  className?: string
}) {
  const [value, setValue] = useState("")
  const [error, setError] = useState<ErrorKey | null>(null)
  const id = useId()
  const shown = error ?? serverError ?? null

  function submit(e: FormEvent) {
    e.preventDefault()
    const request = toRequest(value)
    if (typeof request === "string") return setError(request)
    setError(null)
    onSubmit(request)
  }

  return (
    <form onSubmit={submit} noValidate className={cn("grid min-w-0 max-w-[720px] gap-4 font-sans", className)}>
      <div className="grid gap-1">
        <h1 className="text-title font-bold text-balance">{t.form.title}</h1>
        <p className="text-body text-pretty">{t.form.lead}</p>
      </div>

      <div className="grid gap-2">
        <label htmlFor={id} className="text-small font-semibold">
          {t.form.input_label}
        </label>
        <Textarea
          id={id}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          placeholder={t.form.input_placeholder}
          rows={5}
          aria-invalid={shown !== null}
          aria-describedby={shown ? `${id}-error` : `${id}-count`}
          className="min-h-32 rounded-[10px] bg-card text-body"
        />
        <div className="flex items-start gap-3 text-meta">
          {shown && (
            <p id={`${id}-error`} role="alert" className="flex-1 text-scam-foreground">
              {t.errors[shown]}
            </p>
          )}
          <p id={`${id}-count`} className={cn("ml-auto tabular-nums", value.length > MAX ? "text-scam-foreground" : "text-muted-foreground")}>
            {value.length.toLocaleString("pl-PL")} / {MAX.toLocaleString("pl-PL")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={pending || value.trim().length < 3} className="h-10 rounded-pill px-6">
          {pending ? t.form.checking : t.form.submit}
        </Button>
      </div>

      <p className="text-small text-muted-foreground text-pretty">
        {fill(t.form.privacy, { days: retentionDays })}{" "}
        {onDeleteChecks && (
          <button type="button" onClick={onDeleteChecks} className="text-foreground underline underline-offset-3">
            {t.form.delete_session}
          </button>
        )}
      </p>
    </form>
  )
}
