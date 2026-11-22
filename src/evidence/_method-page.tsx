import { useId } from 'react'
import pl from '@/copy/pl.json'
import privacy from '@/copy/privacy.json'
import { CatalogTables } from './_catalog-tables'
import { RunMetrics } from './_run-metrics'
import { CATALOG_SECTION_ID } from './constants'
import type { CatalogRow, EvalRunSummary } from './types'

const { method } = pl
const { controller } = privacy

function TextSection({ section }: { section: { title: string; text: string[] } }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{section.title}</h2>
      {section.text.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </section>
  )
}

/**
 * The "Jak działa Meritum" page: the method by the IFCN and EFCSN principles (sources,
 * verdict and strength, who runs the project and the data controller), the source
 * catalogue with exclusions, the metrics of the last evaluation run, the corrections
 * policy, what "Zgłoś błąd" does and the road to the pilot. Texts come from copy/pl.json
 * and copy/privacy.json.
 *
 * @param props.catalog - Catalogue entries, or null while catalog.json is not published.
 * @param props.run - Summary of the last finished evaluation run, or null when there is none.
 * @returns The page as an article.
 * @feature US-ZRD-12, US-MOD-06, F-29
 */
export function MethodPage({
  catalog,
  run,
}: {
  catalog: readonly CatalogRow[] | null
  run: EvalRunSummary | null
}) {
  const catalogId = useId()
  return (
    <article className="space-y-8 text-body">
      <header className="space-y-2">
        <h1 className="text-title font-semibold">{pl.result.how_it_works}</h1>
        <p>{method.lead}</p>
      </header>
      <TextSection section={method.sources} />
      <TextSection section={method.verdict} />
      <section id={CATALOG_SECTION_ID} className="space-y-3">
        <h2 id={catalogId} className="font-semibold">
          {method.catalog.title}
        </h2>
        {catalog ? (
          <>
            <p>{method.catalog.lead}</p>
            <CatalogTables entries={catalog} titleId={catalogId} />
          </>
        ) : (
          <p>{method.catalog.unavailable}</p>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">{method.metrics.title}</h2>
        <p>{method.metrics.lead}</p>
        <RunMetrics run={run} />
      </section>
      <TextSection section={method.corrections} />
      <TextSection section={method.report_error} />
      <TextSection section={method.pilot} />
      <TextSection section={method.team} />
      <section className="space-y-2">
        <h2 className="font-semibold">{controller.title}</h2>
        <p>{controller.name}</p>
        <p>{controller.deployment}</p>
        <p>{controller.contact}</p>
      </section>
    </article>
  )
}
