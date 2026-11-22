/**
 * The "Jak działa Meritum" page through the public API of `src/evidence`: the path of a question
 * first, then the five verdicts, the source catalogue as a list with exclusions, the measured
 * metrics of the last evaluation run as large numbers, and the principles in collapsed rows.
 *
 * @feature US-ZRD-12, F-29
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fireEvent, render, screen, within } from '@testing-library/react'
import pl from '@/copy/pl.json'
import privacy from '@/copy/privacy.json'
import { type CatalogRow, type EvalRunSummary, MethodPage } from '@/evidence'

const { method } = pl
const anyDigit = /\d/

// Two entries shaped like catalog/catalog.json from meritum-core#22.
const catalog: CatalogRow[] = [
  {
    domain: 'isap.sejm.gov.pl',
    publisher: 'Kancelaria Sejmu',
    kind: 'akt_prawny',
    tier: 'primary',
    license: 'dokument urzędowy (art. 4)',
    qualified_because: 'Oficjalny publikator aktów prawnych.',
    excluded: false,
    exclusion_reason: null,
  },
  {
    domain: 'konkret24.tvn24.pl',
    publisher: 'TVN',
    kind: 'fact_check',
    tier: 'secondary',
    license: 'umowa licencyjna z TVN',
    qualified_because: 'Fact-checking.',
    excluded: true,
    exclusion_reason: 'Brak w IFCN i EFCSN, wymagana umowa licencyjna.',
  },
]

const run: EvalRunSummary = {
  finished_at: '2026-11-20T18:30:00Z',
  bundle_url: 'https://github.com/Meritum-HackNation2026/meritum-core/tree/main/evals',
  metrics: { macro_f1: 0.71, latency_median_s: 12.4 },
}

const region = (name: string) => screen.getByRole('region', { name })

test('the page starts with the path of a question: twelve steps numbered 01 to 12', () => {
  render(<MethodPage catalog={null} run={null} />)
  const [first] = screen.getAllByRole('heading', { level: 2 })
  assert.equal(first?.textContent, method.path.title)
  const items = within(region(method.path.title)).getAllByRole('listitem')
  const steps = Object.values(pl.analysis.steps)
  assert.equal(items.length, 12)
  items.forEach((item, i) => {
    assert.equal(item.textContent, `${String(i + 1).padStart(2, '0')}${steps[i]}`)
  })
})

test('the five verdicts follow, each with its hint', () => {
  render(<MethodPage catalog={null} run={null} />)
  const section = region(method.verdicts.title)
  const verdicts = Object.keys(pl.verdict_hint) as (keyof typeof pl.verdict_hint)[]
  assert.equal(within(section).getAllByRole('listitem').length, 5)
  for (const verdict of verdicts) {
    assert.ok(within(section).getByText(pl.verdict[verdict]))
    assert.ok(within(section).getByText(pl.verdict_hint[verdict]))
  }
})

test('sections come in the order path, verdicts, catalogue, metrics, details', () => {
  render(<MethodPage catalog={null} run={null} />)
  assert.deepEqual(
    screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    [
      method.path.title,
      method.verdicts.title,
      method.catalog.title,
      method.metrics.title,
      method.details.title,
    ],
  )
})

test('the catalogue lists every used source with publisher, kind, tier, reason and licence', () => {
  render(<MethodPage catalog={catalog} run={null} />)
  const section = region(method.catalog.title)
  assert.equal(within(section).queryAllByRole('table').length, 0)
  const [used] = within(section).getAllByRole('list')
  const item = within(used as HTMLElement).getByRole('listitem')
  for (const text of [
    'isap.sejm.gov.pl',
    'Kancelaria Sejmu',
    pl.source_kind.akt_prawny,
    pl.source_tier.primary,
    'Oficjalny publikator aktów prawnych.',
    'dokument urzędowy (art. 4)',
  ]) {
    assert.ok(within(item).getByText(text))
  }
  assert.equal(within(used as HTMLElement).queryAllByText('konkret24.tvn24.pl').length, 0)
})

test('excluded sources are listed apart, each with its reason', () => {
  render(<MethodPage catalog={catalog} run={null} />)
  const section = region(method.catalog.title)
  assert.ok(within(section).getByRole('heading', { level: 3, name: method.catalog.excluded_title }))
  const [, excluded] = within(section).getAllByRole('list')
  const item = within(excluded as HTMLElement).getByRole('listitem')
  assert.ok(within(item).getByText('konkret24.tvn24.pl'))
  assert.ok(within(item).getByText('Brak w IFCN i EFCSN, wymagana umowa licencyjna.'))
})

test('without a published catalogue the page says so instead of an empty list', () => {
  render(<MethodPage catalog={null} run={null} />)
  const section = region(method.catalog.title)
  assert.ok(within(section).getByText(method.catalog.unavailable))
  assert.equal(within(section).queryAllByRole('list').length, 0)
})

test('the last run shows its date, the measured metrics as numbers and the bundle', () => {
  render(<MethodPage catalog={null} run={run} />)
  const section = region(method.metrics.title)
  const date = within(section).getByText('20 listopada 2026')
  assert.equal(
    date.closest('p')?.textContent,
    method.metrics.run_date.replace('{date}', '20 listopada 2026'),
  )
  assert.ok(within(section).getByText(method.metrics.names.macro_f1))
  assert.ok(within(section).getByText('0,71'))
  assert.ok(within(section).getByText('12,4'))
  assert.equal(within(section).queryAllByText(method.metrics.names.abstention).length, 0)
  const link = within(section).getByRole('link', { name: method.metrics.reproduce })
  assert.equal(link.getAttribute('href'), run.bundle_url)
  assert.equal(within(section).queryAllByText(method.metrics.no_run).length, 0)
})

test('with no finished run the metrics show method.metrics.no_run and no number', () => {
  render(<MethodPage catalog={null} run={null} />)
  const section = region(method.metrics.title)
  assert.ok(within(section).getByText(method.metrics.no_run))
  assert.doesNotMatch(section.textContent ?? '', anyDigit)
  assert.equal(within(section).queryAllByRole('link').length, 0)
})

test('the principles stand in collapsed rows that open', () => {
  render(<MethodPage catalog={null} run={null} />)
  const section = region(method.details.title)
  const rows = [
    method.sources,
    method.verdict,
    method.corrections,
    method.report_error,
    method.pilot,
    method.team,
  ]
  for (const row of rows) {
    const trigger = within(section).getByRole('button', { name: row.title })
    assert.equal(trigger.getAttribute('aria-expanded'), 'false')
    fireEvent.click(trigger)
    assert.equal(trigger.getAttribute('aria-expanded'), 'true')
    for (const paragraph of row.text) {
      assert.ok(within(section).getByText(paragraph))
    }
  }
  assert.ok(within(section).getByText(privacy.controller.name))
  assert.ok(within(section).getByText(privacy.controller.contact))
})

test('the page has its title and lead', () => {
  render(<MethodPage catalog={null} run={null} />)
  assert.ok(screen.getByRole('heading', { level: 1, name: pl.result.how_it_works }))
  assert.ok(screen.getByText(method.lead))
})
