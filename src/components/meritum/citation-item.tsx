import type { Citation } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { fill, formatDate, t } from "./copy"

/**
 * One source as evidence (6.4): the verbatim fragment first, set as a quote with its opening „ hanging in the margin,
 * then the attribution under it: linked title, publisher and date, kind and tier. No box: the quote mark is the frame.
 * `showDate={false}` is for the evidence timeline, which shows the date itself: the attribution then names the
 * publisher only (no "data publikacji nieznana" either).
 */
export function CitationItem({
  citation,
  showDate = true,
  className,
}: {
  citation: Citation
  showDate?: boolean
  className?: string
}) {
  const { source: s, fragment } = citation
  const meta = !showDate
    ? s.publisher
    : s.published_at
    ? fill(t.result.source_meta, { publisher: s.publisher, date: formatDate(s.published_at) })
    : fill(t.result.source_undated, { publisher: s.publisher })
  return (
    <li className={cn("grid gap-1.5 py-2 pl-6", className)}>
      <blockquote className="relative text-body text-pretty">
        <span aria-hidden="true" className="absolute -left-6 -top-1 select-none text-title leading-none font-bold text-verified">
          „
        </span>
        <span className="sr-only">{t.result.fragment}: </span>
        {fragment}”
      </blockquote>
      <p className="text-small text-muted-foreground">
        <a
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[var(--host-link,var(--verified))] underline decoration-current/35 underline-offset-3 hover:decoration-current"
        >
          {s.title}
        </a>
        {". "}
        {meta}. {capitalize(t.source_kind[s.kind])}, {t.source_tier[s.tier]}
        {s.via === "web_search" && <>, {t.result.via_web}</>}.
      </p>
    </li>
  )
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
