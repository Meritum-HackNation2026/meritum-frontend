import { useId } from 'react'
import { Badge } from '@/components/ui/badge'
import pl from '@/copy/pl.json'
import type { CatalogRow } from './types'

const { catalog: text } = pl.method
const { columns } = text

function Source({ entry }: { entry: CatalogRow }) {
  return (
    <div className="grid content-start justify-items-start gap-1">
      <span className="wrap-anywhere font-medium font-mono text-small">{entry.domain}</span>
      <span className="text-muted-foreground text-small text-pretty">{entry.publisher}</span>
    </div>
  )
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-meta text-muted-foreground">{term}</dt>
      <dd className="text-pretty">{value}</dd>
    </div>
  )
}

/**
 * The source catalogue as two lists: the sources Meritum uses, each with its domain in mono,
 * publisher, kind and tier badges, qualification reason and licence, and the excluded ones with
 * the reason for exclusion.
 *
 * @param props.entries - Catalogue entries from catalog.json.
 * @returns The two lists.
 * @feature US-ZRD-12, US-KOR-01, F-29
 */
export function CatalogList({ entries }: { entries: readonly CatalogRow[] }) {
  const excludedId = useId()
  const used = entries.filter((e) => !e.excluded)
  const excluded = entries.filter((e) => e.excluded)
  return (
    <>
      <ul className="grid gap-8">
        {used.map((e) => (
          <li key={e.domain} className="grid gap-3 sm:flex sm:gap-8">
            <div className="grid content-start justify-items-start gap-2 sm:w-60 sm:shrink-0">
              <Source entry={e} />
              <span className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="font-normal">
                  {pl.source_kind[e.kind]}
                </Badge>
                <Badge variant="secondary" className="font-normal">
                  {pl.source_tier[e.tier]}
                </Badge>
              </span>
            </div>
            <dl className="grid min-w-0 content-start gap-3">
              <Fact term={columns.qualified_because} value={e.qualified_because} />
              <Fact term={columns.license} value={e.license} />
            </dl>
          </li>
        ))}
      </ul>
      <h3 id={excludedId} className="pt-4 font-semibold">
        {text.excluded_title}
      </h3>
      <p className="max-w-prose text-muted-foreground text-pretty">{text.excluded_lead}</p>
      <ul aria-labelledby={excludedId} className="grid gap-6">
        {excluded.map((e) => (
          <li key={e.domain} className="grid gap-3 sm:flex sm:gap-8">
            <div className="sm:w-60 sm:shrink-0">
              <Source entry={e} />
            </div>
            <dl>
              <Fact term={columns.exclusion_reason} value={e.exclusion_reason ?? ''} />
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
