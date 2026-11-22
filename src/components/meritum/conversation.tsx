import { ArrowUp, ImageIcon, Mic, X } from "lucide-react"
import { type FormEvent, type KeyboardEvent, type ReactNode, useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { CheckRequest } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { toRequest } from "./check-form"
import { fill, t } from "./copy"

type ErrorKey = keyof typeof t.errors

const MAX = 4000
const PRESS = "transition-transform duration-150 ease-out-meritum active:scale-97 motion-reduce:transition-none"
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

/**
 * The claim heading of a check page (DESIGN_SYSTEM.md 6.8): the citizen's words unchanged as the page's h1 in the
 * Title style, left-aligned, with an opening „ hanging in ink at its edge. A recording or an image stands here as
 * `conversation.audio_question` / `conversation.image_question` with its file name, without quote marks.
 *
 * @param props - The question as `children`, or a sent `file` (`kind` and `name`), and an optional class.
 * @returns The heading.
 * @feature US-SPR-01, US-SPR-09, F-01
 */
export function QuotedClaim({ children, file, className }: { children?: ReactNode; file?: { kind: "audio" | "image"; name: string }; className?: string }) {
  if (file) {
    const template = file.kind === "image" ? t.conversation.image_question : t.conversation.audio_question
    return <h1 className={cn("min-w-0 font-sans text-title font-bold tracking-tight break-words text-pretty", className)}>{fill(template, { name: file.name })}</h1>
  }
  return (
    <h1 className={cn("relative min-w-0 pl-7 font-sans text-title font-bold tracking-tight whitespace-pre-line break-words text-pretty", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute top-0 left-0 select-none text-headline leading-none font-bold text-foreground">
        „
      </span>
      {children}
      <span aria-hidden="true">”</span>
    </h1>
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
 * The message field of the check page (6.1, 6.8): a plain field in the page flow with a 1 px outline and no
 * shadow, scrolling with the content; text or a link up to 4000 characters,
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
      <div className="grid gap-1 rounded-lg border border-input bg-card p-2 has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-ring">
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
