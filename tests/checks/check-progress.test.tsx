/**
 * The progress strip of an accepted check, driven by recorded `AnalysisStatus` events through
 * a fake progress source behind the public API of `src/checks`.
 *
 * @feature US-SPR-02, F-09
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CheckPage, type CheckSender, type ProgressSource } from '@/checks'
import examples from '@/contracts/examples.json'
import type { AnalysisStatus, AnalysisStep } from '@/contracts/meritum'
import pl from '@/copy/pl.json'

const accepted: CheckSender = { send: () => Promise.resolve({ checkId: 'c_01' }) }
const recorded = examples.AnalysisStatus as AnalysisStatus
const result = examples['CheckResult.done'] as NonNullable<AnalysisStatus['result']>

function fakeSource() {
  const calls = { watched: [] as string[], stopped: 0 }
  let push: (status: AnalysisStatus) => void = () => undefined
  let close: () => void = () => undefined
  const source: ProgressSource = {
    watch(checkId, onStatus, onClosed) {
      calls.watched.push(checkId)
      push = onStatus
      close = onClosed
      return () => {
        calls.stopped += 1
      }
    },
  }
  return {
    source,
    calls,
    emit: (status: AnalysisStatus) => act(() => push(status)),
    end: () => act(() => close()),
  }
}

async function startCheck(fake: ReturnType<typeof fakeSource>) {
  const page = render(<CheckPage sender={accepted} progress={fake.source} />)
  fireEvent.change(screen.getByLabelText(pl.form.input_label), {
    target: { value: 'Od stycznia nie zapłacisz w sklepie gotówką' },
  })
  fireEvent.click(screen.getByRole('button', { name: pl.form.submit }))
  // the subscription starts in an effect, which may run after the strip first renders
  await waitFor(() => assert.equal(fake.calls.watched.length, 1))
  return page
}

function stepText(code: AnalysisStep['code']): string {
  return screen.getByText(pl.analysis.steps[code]).closest('li')?.textContent ?? ''
}

function shownVerdicts(): string[] {
  return Object.values(pl.verdict).filter((word) => screen.queryAllByText(word).length > 0)
}

function withVerify(status: AnalysisStep['status']): AnalysisStatus {
  return {
    check_id: 'c_01',
    steps: [...recorded.steps, { code: 'verify_citations', status }],
    result,
  }
}

test('an accepted check subscribes to the progress of its id', async () => {
  const fake = fakeSource()
  await startCheck(fake)
  assert.deepEqual(fake.calls.watched, ['c_01'])
})

test('three research steps reported as active show as active at once', async () => {
  const fake = fakeSource()
  await startCheck(fake)
  fake.emit(recorded)
  for (const code of ['search_corpus', 'search_web', 'search_fact_checks'] as const) {
    assert.equal(stepText(code), `${pl.analysis.steps[code]}, w toku`)
  }
})

test('a skipped link download is struck through and named "pominięte" for screen readers', async () => {
  const fake = fakeSource()
  await startCheck(fake)
  fake.emit(recorded)
  assert.equal(stepText('fetch_url'), `${pl.analysis.steps.fetch_url}, pominięte`)
  const step = screen.getByText(pl.analysis.steps.fetch_url).closest('li')
  assert.equal(step?.classList.contains('line-through'), true)
})

test('a streamed answer shows no verdict until verify_citations is done', async () => {
  const fake = fakeSource()
  await startCheck(fake)
  fake.emit(withVerify('active'))
  assert.deepEqual(shownVerdicts(), [])
  assert.equal(screen.queryAllByText(pl.analysis.draft).length, 1)
  fake.emit(withVerify('done'))
  assert.deepEqual(shownVerdicts().sort(), [pl.verdict.confirmed, pl.verdict.false].sort())
  assert.equal(screen.queryAllByText(pl.analysis.draft).length, 0)
})

test('verdicts show when verify_citations is skipped, as in the backend rule', async () => {
  const fake = fakeSource()
  await startCheck(fake)
  fake.emit(withVerify('skipped'))
  assert.deepEqual(shownVerdicts().sort(), [pl.verdict.confirmed, pl.verdict.false].sort())
})

test('a failed verify_citations keeps the verdicts hidden and ends with a message', async () => {
  const fake = fakeSource()
  await startCheck(fake)
  fake.emit(withVerify('failed'))
  fake.end()
  assert.deepEqual(shownVerdicts(), [])
  assert.equal(screen.getByRole('alert').textContent, pl.status_hint.technical_failure)
})

test('the result is announced in a polite live region', async () => {
  const fake = fakeSource()
  await startCheck(fake)
  fake.emit(withVerify('done'))
  fake.end()
  const card = screen.getByRole('region', { name: 'Meritum: wynik sprawdzenia' })
  assert.equal(card.closest('[aria-live]')?.getAttribute('aria-live'), 'polite')
  assert.deepEqual(screen.queryAllByRole('alert'), [])
})

test('a stream that ends without a result shows a message, not a verdict', async () => {
  const fake = fakeSource()
  await startCheck(fake)
  fake.emit(withVerify('active'))
  fake.end()
  assert.equal(screen.getByRole('alert').textContent, pl.status_hint.technical_failure)
  assert.deepEqual(shownVerdicts(), [])
})

test('a result without verdicts shows at once and ends without a message', async () => {
  const fake = fakeSource()
  await startCheck(fake)
  const outOfScope = { check_id: 'c_01', status: 'out_of_scope', corpus_version: '1' } as const
  fake.emit({ check_id: 'c_01', steps: recorded.steps, result: outOfScope })
  fake.end()
  assert.equal(screen.queryAllByText(pl.status.out_of_scope).length, 1)
  assert.deepEqual(screen.queryAllByRole('alert'), [])
})

test('leaving the page closes the subscription', async () => {
  const fake = fakeSource()
  const page = await startCheck(fake)
  assert.equal(fake.calls.stopped, 0)
  page.unmount()
  assert.equal(fake.calls.stopped, 1)
})
