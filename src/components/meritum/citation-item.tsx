import type { Citation } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { fill, formatDate, t } from "./copy"

/** One source row: linked title, publisher and date, kind and tier, then the verbatim fragment on the raised surface. */
export function CitationItem({ citation, className }: { citation: Citation; className?: string }) {
  const { source: s, fragment } = citation
  const meta = s.published_at
    ? fill(t.result.source_meta, { publisher: s.publisher, date: formatDate(s.published_at) })
    : fill(t.result.source_undated, { publisher: s.publisher })
  return (
    <li className={cn("grid gap-1.5 py-2", className)}>
      <a
        href={s.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-small font-semibold text-[var(--host-link,var(--verified))] underline decoration-current/35 underline-offset-3 hover:decoration-current"
      >
        {s.title}
      </a>
      <p className="text-meta text-muted-foreground">
        {meta}. {capitalize(t.source_kind[s.kind])}, {t.source_tier[s.tier]}
        {s.via === "web_search" && <>, {t.result.via_web}</>}.
      </p>
      <blockquote className="rounded-md bg-secondary px-3 py-2 text-small text-pretty">
        <span className="sr-only">{t.result.fragment}: </span>„{fragment}”
      </blockquote>
    </li>
  )
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
