import { ArrowUp, ImageIcon, Mic, X } from "lucide-react"
import { type FormEvent, type KeyboardEvent, type ReactNode, useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { CheckRequest } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { toRequest } from "./check-form"
import { t } from "./copy"
import { MeritumMark } from "./meritum-mark"

type ErrorKey = keyof typeof t.errors

const MAX = 4000
const TIME = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" })
const PRESS = "transition-transform duration-150 ease-out-meritum active:scale-97 motion-reduce:transition-none"
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

function Time({ at }: { at: string }) {
  const date = new Date(at)
  // a damaged history entry must not break the whole thread
  if (Number.isNaN(date.getTime())) return null
  return (
    <time dateTime={at} className="text-small tabular-nums text-muted-foreground">
      {TIME.format(date)}
    </time>
  )
}

/**
 * The citizen's question in the conversation (DESIGN_SYSTEM.md 6.8): their own words as a quoted letter on the
 * raised surface, right-aligned, the tail corner towards them, an opening „ hanging in the margin and the time
 * under it. The speaker is named for screen readers only.
 *
 * @param props - The question as `children`, the time it was sent (`at`, ISO 8601), `isNew` for the entry motion of a
 *   question just sent (not one restored from history) and an optional class.
 * @returns The question.
 * @feature US-SPR-01, US-SPR-09, F-01
 */
export function Question({ children, at, isNew = false, className }: { children: ReactNode; at?: string | undefined; isNew?: boolean; className?: string }) {
  return (
    <div className={cn("ml-10 grid min-w-0 justify-items-end gap-1 font-sans sm:ml-24", isNew && "animate-enter motion-reduce:animate-none", className)}>
      <p className="sr-only">{t.conversation.you}</p>
      <blockquote className="relative min-w-0 rounded-xl rounded-br-sm bg-secondary px-4 py-3 text-body text-secondary-foreground whitespace-pre-line break-words text-pretty">
        <span aria-hidden="true" className="pointer-events-none absolute -left-5 top-1 select-none text-title leading-none font-bold text-muted-foreground">
          „
        </span>
        {children}
      </blockquote>
      {at && <Time at={at} />}
    </div>
  )
}

/**
 * Meritum's reply (6.8): signed with the mark and the name set like the logotype, the time beside it, then the
 * analysis steps or the result card as `children`. `data-reply` lets a card inside drop its own „Meritum” header
 * (`in-data-reply:hidden`), since the signature already names the speaker.
 *
 * @param props - The steps or card as `children`, the time of the answer (`at`, ISO 8601) and an optional class.
 * @returns The reply.
 * @feature US-SPR-01, US-SPR-04, F-01, F-17
 */
export function Reply({ children, at, className }: { children: ReactNode; at?: string | undefined; className?: string }) {
  return (
    <div data-reply="" className={cn("grid min-w-0 gap-3 font-sans", className)}>
      <p className="flex items-center gap-2">
        <MeritumMark className="size-5" />
        <span className="text-body font-semibold tracking-tight font-stretch-semi-expanded">{t.brand.name}</span>
        {at && <Time at={at} />}
      </p>
      {children}
    </div>
  )
}

/**
 * The empty conversation (6.8): the first tagline set large, what happens to a pasted text and an optional slot,
 * then two or three example claims set as hanging quotes, beside it from 1024 px; a click sends one as a question.
 * The page gives the h1. The AI notice is not passed here: it stands once, above the composer.
 *
 * @param props - `onPick(claim)`, `disabled` while a check is sent, the notice as `children` and an optional class.
 * @returns The welcome.
 * @feature US-SPR-01, F-01
 */
export function Welcome({
  onPick,
  disabled = false,
  children,
  className,
}: {
  onPick: (claim: string) => void
  disabled?: boolean
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid min-w-0 gap-8 font-sans lg:grid-cols-2 lg:items-end lg:gap-16", className)}>
      <div className="grid gap-4">
        <p className="text-headline font-bold tracking-tight text-balance font-stretch-semi-expanded lg:text-display">{t.brand.taglines[0]}</p>
        <p className="max-w-prose text-body text-muted-foreground text-pretty">{t.form.lead}</p>
        {children}
      </div>
      <div className="grid gap-3">
        <p className="text-small text-muted-foreground">{t.conversation.examples_lead}</p>
        <ul className="grid gap-2">
          {t.conversation.examples.map((claim) => (
            <li key={claim}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(claim)}
                aria-label={`„${claim}”`}
                className={cn(
                  "relative w-full rounded-lg py-3 pr-4 pl-10 text-left text-title font-semibold tracking-tight text-pretty text-card-foreground hover:bg-secondary disabled:opacity-60",
                  PRESS,
                  FOCUS,
                )}
              >
                <span aria-hidden="true" className="absolute top-2 left-3 select-none text-headline leading-none font-bold text-verified">
                  „
                </span>
                {claim}”
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * A file attached to the composer (6.8): a recording (`kind="audio"`, the default) or a screenshot or photo
 * (`kind="image"`). It shows the kind's icon, or the app's `preview` (a thumbnail of the image), the file name,
 * the kind's remove button and, as `children`, what happens to the file (provider, cost, retention, limits,
 * warnings) and its refusals, shown before it is sent.
 *
 * @param props - `kind`, the file `name`, `onRemove`, an optional `preview` in place of the icon, the notes and
 *   errors as `children`, `disabled` while it is sent.
 * @returns The attachment.
 * @feature US-SPR-11, US-SPR-08, F-08, F-33
 */
export function Attachment({
  kind = "audio",
  name,
  onRemove,
  preview,
  children,
  disabled = false,
}: {
  kind?: "audio" | "image"
  name: string
  onRemove: () => void
  preview?: ReactNode
  children?: ReactNode
  disabled?: boolean
}) {
  const Icon = kind === "image" ? ImageIcon : Mic
  const removeLabel = kind === "image" ? t.conversation.remove_image : t.conversation.remove_audio
  return (
    <div className="grid gap-2 px-2 pt-1 font-sans">
      <div className="flex min-w-0 items-center gap-2 text-body">
        {preview ?? <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={onRemove} aria-label={removeLabel} className={cn("size-10 rounded-pill", FOCUS)}>
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>
      {children && <div className="grid gap-1 text-small text-muted-foreground text-pretty">{children}</div>}
    </div>
  )
}

/**
 * The message field docked at the bottom of the conversation (6.1, 6.8): text or a link up to 4000 characters,
 * validated with `toRequest`; Enter sends, Shift+Enter adds a line. `tools` sit left of „Sprawdź” (the
 * recording button). With an `attachment` the field gives way to it and „Sprawdź” calls `onSendAttachment`.
 * Errors show under the field from copy `errors`; the typed text is never cleared on an error. With an attachment
 * the caller shows the recording's refusals inside it, so the field's errors stay hidden.
 *
 * @param props - The controlled `value`, `onSubmit(CheckRequest)`, `pending`, `serverError`, `tools`, `attachment`, `placeholder` (default: the example claim).
 * @returns The message field.
 * @feature US-SPR-01, US-SPR-11, F-01, F-08
 */
export function Composer({
  value,
  onValueChange,
  onSubmit,
  pending = false,
  serverError,
  tools,
  attachment,
  onSendAttachment,
  placeholder = t.form.input_placeholder,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  onSubmit: (request: CheckRequest) => void
  pending?: boolean
  serverError?: ErrorKey | null
  tools?: ReactNode
  attachment?: ReactNode
  onSendAttachment?: () => void
  placeholder?: string
  className?: string
}) {
  const id = useId()
  const [error, setError] = useState<ErrorKey | null>(null)
  const shown = attachment ? null : (error ?? serverError ?? null)
  const counted = value.length > 0 ? `${id}-count` : undefined

  function submit(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    if (attachment) return onSendAttachment?.()
    const request = toRequest(value)
    if (typeof request === "string") return setError(request)
    setError(null)
    onSubmit(request)
  }

  function sendOnEnter(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return
    e.preventDefault()
    e.currentTarget.form?.requestSubmit()
  }

  return (
    <form onSubmit={submit} noValidate aria-label={t.form.title} className={cn("grid min-w-0 gap-1.5 font-sans", className)}>
      <div className="grid gap-1 rounded-xl border border-border bg-card p-2 shadow-float has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-ring">
        {attachment ?? (
          <>
            <label htmlFor={id} className="sr-only">
              {t.form.input_label}
            </label>
            <Textarea
              id={id}
              value={value}
              onChange={(e) => {
                onValueChange(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={sendOnEnter}
              placeholder={placeholder}
              rows={1}
              enterKeyHint="send"
              aria-invalid={shown !== null}
              aria-describedby={shown ? `${id}-error` : counted}
              className="max-h-28 min-h-11 sm:max-h-48 resize-none border-0 bg-transparent px-2 text-base shadow-none focus-visible:ring-0 sm:text-body dark:bg-transparent"
            />
          </>
        )}
        <div className="flex items-center gap-2">
          {tools}
          {!attachment && value.length > 0 && (
            <span id={`${id}-count`} className={cn("text-meta tabular-nums", value.length > MAX ? "text-scam-foreground" : "text-muted-foreground")}>
              {value.length.toLocaleString("pl-PL")} / {MAX.toLocaleString("pl-PL")}
            </span>
          )}
          <Button type="submit" disabled={pending} className={cn("ml-auto h-10 gap-1.5 rounded-pill px-5", PRESS, FOCUS)}>
            {pending ? t.form.checking : t.form.submit}
            <ArrowUp aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
      {shown && (
        <p id={`${id}-error`} role="alert" className="px-2 text-meta text-scam-foreground">
          {t.errors[shown]}
        </p>
      )}
    </form>
  )
}
