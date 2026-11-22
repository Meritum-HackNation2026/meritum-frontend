import { type FormEvent, useId, useState } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { CheckRequest } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { fill, t } from "./copy"

const MIN = 3
const MAX = 4000
const MAX_URL = 2083 // CheckRequest.url maxLength in the contract

type ErrorKey = keyof typeof t.errors

// Each message is an `errors` key, so the page shows the Polish text from copy/pl.json.
const textSchema = z
  .string()
  .trim()
  .min(MIN, "empty" satisfies ErrorKey)
  .max(MAX, "too_long" satisfies ErrorKey)
const urlSchema = z
  .url({ protocol: /^https?$/, error: "invalid_url" satisfies ErrorKey })
  .max(MAX_URL, "url_too_long" satisfies ErrorKey)

/**
 * Text or a full http(s) link of at most 2083 characters, checked with a zod schema; a bare "www.x.pl" or another
 * scheme ("ftp://…") is rejected with a hint rather than guessed or sent as text.
 */
export function toRequest(raw: string, channel: CheckRequest["channel"] = "web"): CheckRequest | ErrorKey {
  const value = raw.trim()
  const isLink = /^\S+$/.test(value) && /^([a-z][a-z\d+.-]*:\/\/|www\.)/i.test(value)
  const parsed = (isLink ? urlSchema : textSchema).safeParse(value)
  if (!parsed.success) {
    const key = parsed.error.issues[0]?.message
    return key && Object.hasOwn(t.errors, key) ? (key as ErrorKey) : "empty"
  }
  return isLink ? { channel, url: parsed.data } : { channel, text: parsed.data }
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
        <Button type="submit" disabled={pending} className="h-10 rounded-pill px-6">
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
