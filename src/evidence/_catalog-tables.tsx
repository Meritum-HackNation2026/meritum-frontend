import { type ReactNode, useId } from 'react'
import pl from '@/copy/pl.json'
import type { CatalogRow } from './types'

const { catalog: text } = pl.method
const { columns } = text

// The region takes focus so keyboard users can scroll the columns hidden at 320 px.
function ScrollTable({ labelId, children }: { labelId: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={labelId}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must take focus to scroll by keyboard (WCAG 2.1.1)
      tabIndex={0}
      className="overflow-x-auto rounded-lg border focus-visible:outline-2 focus-visible:outline-ring"
    >
      <table aria-labelledby={labelId} className="w-full text-left text-small">
        {children}
      </table>
    </section>
  )
}

function Head({ labels }: { labels: string[] }) {
  return (
    <thead className="bg-muted">
      <tr>
        {labels.map((label) => (
          <th key={label} scope="col" className="px-3 py-2 font-semibold">
            {label}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function SourceCell({ entry }: { entry: CatalogRow }) {
  return (
    <th scope="row" className="px-3 py-2 font-normal">
      <span className="block font-mono">{entry.domain}</span>
      <span className="block text-muted-foreground">{entry.publisher}</span>
    </th>
  )
}

/**
 * The source catalogue as two tables: the sources Meritum uses, each with its kind,
 * licence and qualification reason, and the excluded ones with the reason for exclusion.
 *
 * @param props.entries - Catalogue entries from catalog.json.
 * @param props.titleId - Id of the section heading that names the first table.
 * @returns The two tables.
 * @feature US-ZRD-12, US-KOR-01, F-29
 */
export function CatalogTables({
  entries,
  titleId,
}: {
  entries: readonly CatalogRow[]
  titleId: string
}) {
  const excludedId = useId()
  const used = entries.filter((e) => !e.excluded)
  const excluded = entries.filter((e) => e.excluded)
  return (
    <>
      <ScrollTable labelId={titleId}>
        <Head labels={[columns.source, columns.kind, columns.license, columns.qualified_because]} />
        <tbody>
          {used.map((e) => (
            <tr key={e.domain} className="border-t align-top">
              <SourceCell entry={e} />
              <td className="px-3 py-2">
                {pl.source_kind[e.kind]}, {pl.source_tier[e.tier]}
              </td>
              <td className="px-3 py-2">{e.license}</td>
              <td className="px-3 py-2">{e.qualified_because}</td>
            </tr>
          ))}
        </tbody>
      </ScrollTable>
      <h3 id={excludedId} className="font-semibold">
        {text.excluded_title}
      </h3>
      <p>{text.excluded_lead}</p>
      <ScrollTable labelId={excludedId}>
        <Head labels={[columns.source, columns.exclusion_reason]} />
        <tbody>
          {excluded.map((e) => (
            <tr key={e.domain} className="border-t align-top">
              <SourceCell entry={e} />
              <td className="px-3 py-2">{e.exclusion_reason}</td>
            </tr>
          ))}
        </tbody>
      </ScrollTable>
    </>
  )
}
