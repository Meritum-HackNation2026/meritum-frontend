/**
 * The progress bar of a running check (design-system#149) on the recorded `AnalysisStatus`
 * example: the counter, the steps in progress and the full step list under „Pokaż kroki”.
 *
 * @feature US-SPR-02, F-09
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { AnalysisSteps } from '@/components/meritum'
import examples from '@/contracts/examples.json'
import type { AnalysisStatus, AnalysisStep } from '@/contracts/meritum'
import pl from '@/copy/pl.json'

const recorded = examples.AnalysisStatus as AnalysisStatus

/** The full step list, which opens under „Pokaż kroki” (design-system#149). */
function stepList() {
  const toggle = screen.getByRole('button', { name: pl.analysis.show_steps })
  if (toggle.getAttribute('aria-expanded') !== 'true') {
    fireEvent.click(toggle)
  }
  const list = document.querySelector('ol')
  assert.ok(list)
  return within(list)
}

function stepText(code: AnalysisStep['code']): string {
  return stepList().getByText(pl.analysis.steps[code]).closest('li')?.textContent ?? ''
}

test('three research steps reported as active show as active at once', () => {
  render(<AnalysisSteps steps={recorded.steps} />)
  for (const code of ['search_corpus', 'search_web', 'search_fact_checks'] as const) {
    assert.equal(stepText(code), `${pl.analysis.steps[code]}, w toku`)
  }
})

test('a skipped link download is muted and says "pominięte" in words, not by style alone', () => {
  render(<AnalysisSteps steps={recorded.steps} />)
  assert.equal(stepText('fetch_url'), `${pl.analysis.steps.fetch_url}, pominięte`)
  const row = stepList().getByText(pl.analysis.steps.fetch_url).closest('li')
  assert.ok(row)
  assert.ok(row.classList.contains('text-muted-foreground'))
  const word = within(row).getByText(pl.analysis.step_status.skipped)
  assert.equal(word.classList.contains('sr-only'), false)
})

test('the bar counts the steps the check runs: skipped ones leave the count', () => {
  render(<AnalysisSteps steps={recorded.steps} />)
  const of = recorded.steps.filter((step) => step.status !== 'skipped').length
  const finished = recorded.steps.filter((step) => step.status === 'done').length
  const counter = pl.analysis.step_of
    .replace('{n}', String(finished + 1))
    .replace('{of}', String(of))
  assert.ok(screen.getByText(counter))
  assert.ok(screen.getByRole('progressbar'))
})
