// Copy of design-system/components/meritum/meritum-mark.tsx.
import type { SVGProps } from 'react'

import { cn } from '@/lib/utils'

/** Logo B "Dwa łuki": two arches share one stem (the consensus) with a point of agreement above. */
export function MeritumMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={cn('size-4 shrink-0 text-foreground', className)}
      {...props}
    >
      <path
        d="M10 40V25c0-5.5 3.1-9 7-9s7 3.5 7 9v15M24 25c0-5.5 3.1-9 7-9s7 3.5 7 9v15"
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 25v15"
        fill="none"
        stroke="var(--verified)"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <circle cx="24" cy="7.6" r="3.5" fill="var(--verified)" />
    </svg>
  )
}

/** Small "Meritum" label used in every injected widget header. Never omit it: it tells readers this is not the platform. */
export function MeritumLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-sans text-meta font-semibold text-muted-foreground',
        className,
      )}
    >
      <MeritumMark className="size-3.5" />
      Meritum
    </span>
  )
}
