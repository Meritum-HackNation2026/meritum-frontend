/**
 * The progress strip on the result page, driven by recorded `AnalysisStatus` events through a
 * fake progress source behind the public API of `src/checks`; the API read never has a result.
 *
 * @feature US-SPR-02, F-09
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { act, render, screen, waitFor } from '@testing-library/react'
import { type ProgressSource, type ReadOutcome, ResultPage, type ResultReader } from '@/checks'
import examples from '@/contracts/examples.json'
import type { AnalysisStatus, AnalysisStep } from '@/contracts/meritum'
import pl from '@/copy/pl.json'

const recorded = examples.AnalysisStatus as AnalysisStatus
const result = examples['CheckResult.done'] as NonNullable<AnalysisStatus['result']>
const running: ResultReader = {
  read: () => Promise.resolve({ status: { check_id: 'c_01', steps: recorded.steps } }),
}
/** The API after a workflow that failed without output: every step finished, no result. */
const failedRun: AnalysisStatus = {
  check_id: 'c_01',
  steps: recorded.steps.map((step) =>
    step.status === 'active' || step.status === 'pending' ? { ...step, status: 'failed' } : step,
  ) as AnalysisStatus['steps'],
}

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

/** Runs while the stream is open, then answers as a workflow that failed without output. */
function stopsAfterStream(): ResultReader {
  let call = 0
  return {
    read: () =>
      Promise.resolve({
        status: call++ === 0 ? { check_id: 'c_01', steps: recorded.steps } : failedRun,
      }),
  }
}

async function startCheck(fake: ReturnType<typeof fakeSource>, reader = running) {
  const page = render(
    <ResultPage checkId="c_01" reader={reader} progress={fake.source} pollMs={60_000} />,
  )
  // the subscription starts in an effect, which may run after the strip first renders
  await waitFor(() => assert.equal(fake.calls.watched.length, 1))
  // the first API read has rendered, so nothing is left running after the test
  await screen.findByText(pl.analysis.steps.search_corpus)
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

test('the result page subscribes to the progress of its check id', async () => {
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
  await startCheck(fake, stopsAfterStream())
  fake.emit(withVerify('failed'))
  fake.end()
  assert.deepEqual(shownVerdicts(), [])
  assert.equal((await screen.findByRole('alert')).textContent, pl.status_hint.technical_failure)
})

test('the result is announced in a polite live region', async () => {
  const fake = fakeSource()
  await startCheck(fake)
  fake.emit(withVerify('done'))
  fake.end()
  const badge = screen.getByText(pl.verdict.false)
  assert.equal(badge.closest('[aria-live]')?.getAttribute('aria-live'), 'polite')
  assert.deepEqual(screen.queryAllByRole('alert'), [])
})

test('a stream that ends without a result shows a message, not a verdict', async () => {
  const fake = fakeSource()
  await startCheck(fake, stopsAfterStream())
  fake.emit(withVerify('active'))
  fake.end()
  assert.equal((await screen.findByRole('alert')).textContent, pl.status_hint.technical_failure)
  assert.deepEqual(shownVerdicts(), [])
  assert.equal(screen.queryByText(pl.analysis.title), null)
})

test('a stream that ends early still shows the result the API has by then', async () => {
  const fake = fakeSource()
  let reads = 0
  const finishing: ResultReader = {
    read: () =>
      Promise.resolve({
        status: { check_id: 'c_01', steps: recorded.steps, ...(reads++ > 0 ? { result } : {}) },
      }),
  }
  render(<ResultPage checkId="c_01" reader={finishing} progress={fake.source} pollMs={60_000} />)
  await waitFor(() => assert.equal(fake.calls.watched.length, 1))
  await screen.findByText(pl.analysis.steps.search_corpus)
  fake.end()
  assert.ok(await screen.findByText(pl.verdict.false))
  assert.deepEqual(screen.queryAllByRole('alert'), [])
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

test('a failed read after the stream ended shows its own message and the page asks again', async () => {
  const fake = fakeSource()
  const answers = [
    { status: { check_id: 'c_01', steps: recorded.steps } },
    'offline',
    { status: { check_id: 'c_01', steps: recorded.steps, result } },
  ] as const
  let call = 0
  const flaky: ResultReader = {
    read: () => Promise.resolve(answers[Math.min(call++, 2)] ?? 'busy'),
  }
  render(<ResultPage checkId="c_01" reader={flaky} progress={fake.source} pollMs={150} />)
  await waitFor(() => assert.equal(fake.calls.watched.length, 1))
  await screen.findByText(pl.analysis.steps.search_corpus)
  fake.end()
  assert.equal((await screen.findByRole('alert')).textContent, pl.errors.offline)
  assert.ok(await screen.findByText(pl.verdict.false))
})

test('a stream that drops while the check still runs keeps the page reading until the result', async () => {
  const fake = fakeSource()
  const answers = [
    { status: { check_id: 'c_01', steps: recorded.steps } },
    { status: { check_id: 'c_01', steps: recorded.steps } },
    { status: { check_id: 'c_01', steps: recorded.steps, result } },
  ] as const
  let call = 0
  const later: ResultReader = {
    read: () => Promise.resolve(answers[Math.min(call++, 2)] ?? 'busy'),
  }
  render(<ResultPage checkId="c_01" reader={later} progress={fake.source} pollMs={20} />)
  await waitFor(() => assert.equal(fake.calls.watched.length, 1))
  await screen.findByText(pl.analysis.steps.search_corpus)
  fake.end()
  assert.ok(await screen.findByText(pl.verdict.false))
  assert.deepEqual(screen.queryAllByRole('alert'), [])
})

test('a check still in the queue when the stream drops keeps the page reading until the result', async () => {
  const fake = fakeSource()
  const queued: ReadOutcome = {
    status: { check_id: 'c_01', steps: [{ code: 'receive', status: 'done' }] },
  }
  const answers: ReadOutcome[] = [queued, queued, { status: { ...recorded, result } }]
  let call = 0
  const later: ResultReader = { read: () => Promise.resolve(answers[call++] ?? queued) }
  render(<ResultPage checkId="c_01" reader={later} progress={fake.source} pollMs={20} />)
  await waitFor(() => assert.equal(fake.calls.watched.length, 1))
  await screen.findByText(pl.analysis.steps.receive)
  fake.end()
  assert.ok(await screen.findByText(pl.verdict.false))
  assert.deepEqual(screen.queryAllByRole('alert'), [])
})
