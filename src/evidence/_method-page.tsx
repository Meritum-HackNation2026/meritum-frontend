import {
  BookTextIcon,
  ChartNoAxesColumnIcon,
  LibraryIcon,
  RouteIcon,
  ScaleIcon,
} from 'lucide-react'
import pl from '@/copy/pl.json'
import { CatalogList } from './_catalog-list'
import { MethodDetails } from './_method-details'
import { QuestionPath, VerdictLegend } from './_method-path'
import { MethodSection } from './_method-section'
import { RunMetrics } from './_run-metrics'
import { METHOD_SECTIONS } from './constants'
import type { CatalogRow, EvalRunSummary } from './types'

const { method } = pl
const [path, verdicts, catalogSection, metrics, details] = METHOD_SECTIONS

/**
 * The "Jak działa Meritum" page as the path of a question: the twelve steps of a check, the
 * five possible answers, the source catalogue with exclusions, the metrics of the last
 * evaluation run and the principles (IFCN and EFCSN: sources, verdict, corrections, „Zgłoś
 * błąd”, the pilot, the team and the data controller) in rows that open. Texts come from
 * copy/pl.json and copy/privacy.json; the route puts MethodToc into the rail.
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
  return (
    <article className="grid gap-14 text-body">
      <header className="grid gap-3">
        <h1 className="font-bold text-headline tracking-tight text-balance">
          {pl.result.how_it_works}
        </h1>
        <p className="max-w-prose text-muted-foreground text-pretty">{method.lead}</p>
      </header>
      <MethodSection id={path.id} icon={RouteIcon} title={path.title} lead={method.path.lead}>
        <QuestionPath />
      </MethodSection>
      <MethodSection id={verdicts.id} icon={ScaleIcon} title={verdicts.title}>
        <VerdictLegend />
      </MethodSection>
      <MethodSection
        id={catalogSection.id}
        icon={LibraryIcon}
        title={catalogSection.title}
        lead={catalog ? method.catalog.lead : method.catalog.unavailable}
      >
        {catalog && <CatalogList entries={catalog} />}
      </MethodSection>
      <MethodSection
        id={metrics.id}
        icon={ChartNoAxesColumnIcon}
        title={metrics.title}
        lead={method.metrics.lead}
      >
        <RunMetrics run={run} />
      </MethodSection>
      <MethodSection id={details.id} icon={BookTextIcon} title={details.title}>
        <MethodDetails />
      </MethodSection>
    </article>
  )
}
