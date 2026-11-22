import { type ReactNode, useEffect, useId, useRef, useState } from "react"

import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/** Grace period for the pointer to travel from the label to its note before the note closes (WCAG 1.4.13). */
const CLOSE_DELAY_MS = 120

/**
 * A small label that explains itself in one sentence (DESIGN_SYSTEM.md 6.10). The label is a button with a help
 * cursor; the note opens on hover, on keyboard focus and on a tap, and closes when the pointer leaves, on Esc and on
 * a tap elsewhere. Built on shadcn `Popover`, because a Tooltip does not open on touch. The note stays open while the
 * pointer is on it. Never put it inside another button or link.
 *
 * @param props.text - The explanation, usually one sentence from copy/pl.json.
 * @param props.children - The label itself (a badge, a word with bars).
 * @param props.className - Extra classes for the label button.
 * @returns The label button with its note.
 * @feature US-SPR-04, US-ZRD-01, US-ZRD-03, F-17
 */
export function Explain({ text, children, className }: { text: ReactNode; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const id = useId()
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const show = () => {
    window.clearTimeout(timer.current)
    setOpen(true)
  }
  const hide = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }
  // touch fires pointerenter too; a tap is handled by onClick and closed by a tap elsewhere
  const onHover = (action: () => void) => (event: { pointerType: string }) => {
    if (event.pointerType === "mouse") action()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <button
          type="button"
          aria-expanded={open}
          aria-describedby={open ? id : undefined}
          onClick={show}
          onPointerEnter={onHover(show)}
          onPointerLeave={onHover(hide)}
          onFocus={show}
          onBlur={hide}
          className={cn(
            "inline-flex max-w-full cursor-help rounded-pill text-left transition-opacity duration-150 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            className,
          )}
        >
          {children}
        </button>
      </PopoverAnchor>
      <PopoverContent
        id={id}
        role="tooltip"
        side="top"
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onPointerEnter={onHover(show)}
        onPointerLeave={onHover(hide)}
        className="w-64 gap-1.5 px-3 py-2 text-small text-pretty"
      >
        {text}
      </PopoverContent>
    </Popover>
  )
}
