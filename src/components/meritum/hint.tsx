import type { ReactNode } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** Tooltip on a real focusable element, so keyboard users reach every explanation. */
export function Hint({ text, children, align = "center" }: { text: string; children: ReactNode; align?: "start" | "center" | "end" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent align={align} className="max-w-64 text-pretty">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

export function InfoButton({ text, label }: { text: string; label: string }) {
  return (
    <Hint text={text} align="end">
      <button type="button" aria-label={label} className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground">
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
          <circle cx="8" cy="8" r="6.8" fill="none" stroke="currentColor" strokeWidth={1.3} />
          <path d="M8 7.2v4.3M8 4.8v.1" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </svg>
      </button>
    </Hint>
  )
}
