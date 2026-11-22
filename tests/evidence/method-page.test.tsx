/**
 * The "Jak działa Meritum" page through the public API of `src/evidence`: the source
 * catalogue with qualification reasons, licences and exclusions, the measured metrics of
 * the last evaluation run with its date, and a message instead of numbers when there is no
 * finished run.
 *
 * @feature US-ZRD-12, F-29
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { render, screen, within } from '@testing-library/react'
import pl from '@/copy/pl.json'
import privacy from '@/copy/privacy.json'
import { type CatalogRow, type EvalRunSummary, MethodPage } from '@/evidence'

const { method } = pl
const isapRow = /isap\.sejm\.gov\.pl/
const konkret24 = /konkret24/
const konkret24Row = /konkret24\.tvn24\.pl/

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

test('the catalogue shows every source with its qualification reason and licence', () => {
  render(<MethodPage catalog={catalog} run={null} />)
  const table = screen.getByRole('table', { name: method.catalog.title })
  const row = within(table).getByRole('row', { name: isapRow })
  assert.ok(within(row).getByText('Oficjalny publikator aktów prawnych.'))
  assert.ok(within(row).getByText('dokument urzędowy (art. 4)'))
  assert.equal(within(table).queryAllByText(konkret24).length, 0)
})

test('excluded sources are listed apart, each with its reason', () => {
  render(<MethodPage catalog={catalog} run={null} />)
  const table = screen.getByRole('table', { name: method.catalog.excluded_title })
  const row = within(table).getByRole('row', { name: konkret24Row })
  assert.ok(within(row).getByText('Brak w IFCN i EFCSN, wymagana umowa licencyjna.'))
})

test('without a published catalogue the page says so instead of an empty table', () => {
  render(<MethodPage catalog={null} run={null} />)
  assert.ok(screen.getByText(method.catalog.unavailable))
  assert.equal(screen.queryAllByRole('table').length, 0)
})

test('the last run shows its date, only the measured metrics and the reproduction bundle', () => {
  render(<MethodPage catalog={null} run={run} />)
  const date = screen.getByText('20 listopada 2026')
  assert.equal(
    date.closest('p')?.textContent,
    method.metrics.run_date.replace('{date}', '20 listopada 2026'),
  )
  assert.ok(screen.getByText(method.metrics.names.macro_f1))
  assert.ok(screen.getByText('0,71'))
  assert.ok(screen.getByText('12,4'))
  assert.equal(screen.queryAllByText(method.metrics.names.abstention).length, 0)
  const link = screen.getByRole('link', { name: method.metrics.reproduce })
  assert.equal(link.getAttribute('href'), run.bundle_url)
  assert.equal(screen.queryAllByText(method.metrics.no_run).length, 0)
})

test('with no finished run the page shows a message instead of numbers', () => {
  render(<MethodPage catalog={null} run={null} />)
  assert.ok(screen.getByText(method.metrics.no_run))
  assert.equal(screen.queryAllByText(method.metrics.names.macro_f1).length, 0)
  assert.equal(screen.queryAllByRole('link', { name: method.metrics.reproduce }).length, 0)
})

test('the page describes the method, corrections, "Zgłoś błąd", the pilot and the team', () => {
  render(<MethodPage catalog={null} run={null} />)
  assert.ok(screen.getByRole('heading', { level: 1, name: pl.result.how_it_works }))
  for (const section of [
    method.sources,
    method.verdict,
    method.team,
    method.corrections,
    method.report_error,
    method.pilot,
  ]) {
    assert.ok(screen.getByRole('heading', { level: 2, name: section.title }))
    for (const paragraph of section.text) {
      assert.ok(screen.getByText(paragraph))
    }
  }
  assert.ok(screen.getByText(method.lead))
  assert.ok(screen.getByText(privacy.controller.name))
  assert.ok(screen.getByText(privacy.controller.contact))
})
