import type { SVGProps } from "react"

import { cn } from "@/lib/utils"

/**
 * Logo B "Dwa łuki" (DESIGN_SYSTEM.md section 2): two arches share one stem with a point of agreement above. On the
 * web page and in the panel it is monochrome ink; under `[data-host]` (platform skins) the stem and dot are sea.
 *
 * @param props - SVG props; `className` sets the size and the ink colour.
 * @returns The mark.
 * @feature none (infrastructure)
 */
export function MeritumMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("size-4 shrink-0 text-foreground", className)} {...props}>
      <path
        d="M10 40V25c0-5.5 3.1-9 7-9s7 3.5 7 9v15M24 25c0-5.5 3.1-9 7-9s7 3.5 7 9v15"
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* ink like the arcs on the page (brand/meritum-mark-mono.svg); inside a platform skin --verified is the sea colour */}
      <g className="in-data-host:text-verified">
        <path d="M24 25v15" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
        <circle cx="24" cy="7.6" r="3.5" fill="currentColor" />
      </g>
    </svg>
  )
}

/** Small "Meritum" label used in every injected widget header. Never omit it: it tells readers this is not the platform. */
export function MeritumLabel({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-sans text-meta font-semibold text-muted-foreground", className)}>
      <MeritumMark className="size-3.5" />
      Meritum
    </span>
  )
}
