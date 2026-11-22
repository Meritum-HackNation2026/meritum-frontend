import { Badge } from "@/components/ui/badge"
import type { Citation } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { fill, formatDate, t } from "./copy"
import { Explain } from "./explain"

/**
 * One source as evidence (6.4): the verbatim fragment first, set as a quote with its opening „ hanging in the margin
 * in ink (`--link`; teal only under a platform skin), then the attribution under it: linked title, publisher and
 * date, and the kind and tier as labels that explain themselves (6.10). No box: the quote mark is the frame.
 * `showDate={false}` is for the evidence timeline, which shows the date itself: the attribution then names the
 * publisher only (no "data publikacji nieznana" either). `disclaimer` is the catalogue's note on the publisher
 * (`CatalogEntry.disclaimer`, e.g. EUvsDisinfo), shown as one calm line under the attribution.
 *
 * @param props.citation - The citation from the API.
 * @param props.showDate - Show the publication date (default true).
 * @param props.disclaimer - The publisher's catalogue disclaimer, if any.
 * @param props.className - Extra classes for the list item.
 * @returns One `li` with the quote and its source.
 * @feature US-ZRD-01, US-ZRD-02, F-17
 */
export function CitationItem({
  citation,
  showDate = true,
  disclaimer,
  className,
}: {
  citation: Citation
  showDate?: boolean
  disclaimer?: string | null
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
        <span aria-hidden="true" className="absolute -left-6 -top-1 select-none text-title leading-none font-bold text-link">
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
          className="font-semibold text-[var(--host-link,var(--link))] underline decoration-current/35 underline-offset-3 hover:decoration-current"
        >
          {s.title}
        </a>
        {". "}
        {meta}
        {s.via === "web_search" && <>, {t.result.via_web}</>}.
      </p>
      <p className="flex flex-wrap gap-1.5">
        <Explain text={t.source_kind_hint[s.kind]}>
          <Badge variant="secondary" className="font-normal text-muted-foreground">
            {t.source_kind[s.kind]}
          </Badge>
        </Explain>
        <Explain text={t.source_tier_hint[s.tier]}>
          <Badge variant="secondary" className="font-normal text-muted-foreground">
            {t.source_tier[s.tier]}
          </Badge>
        </Explain>
      </p>
      {disclaimer && <p className="text-meta text-muted-foreground text-pretty">{disclaimer}</p>}
    </li>
  )
}
