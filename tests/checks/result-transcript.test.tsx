/**
 * The transcript of a checked recording on the result page, through the public API of
 * `src/checks` with a fake API behind `fetch`.
 *
 * @feature US-SPR-11, F-08
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { render, screen } from '@testing-library/react'
import { apiResultReader } from '@/api'
import { type ProgressSource, ResultPage, saveCheck } from '@/checks'
import examples from '@/contracts/examples.json'
import type { AnalysisStatus, CheckResult } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { fakeHandoff } from '../moderation/fake-handoff'

const { handoff } = fakeHandoff()
const idle: ProgressSource = { watch: () => () => undefined }
const transcript = 'Od stycznia nie zapłacisz w sklepie gotówką, tak powiedział minister.'

function fakeApi(t: TestContext, result: CheckResult) {
  const steps: AnalysisStatus['steps'] = [{ code: 'transcribe_audio', status: 'done' }]
  const status: AnalysisStatus = { check_id: 'c_01', steps, result }
  t.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify(status), { status: 200 })),
  )
}

function renderPage() {
  render(<ResultPage handoff={handoff} checkId="c_01" reader={apiResultReader} progress={idle} />)
}

const done = examples['CheckResult.done'] as CheckResult

test('a checked recording shows its transcript with the note that it was made automatically', async (t) => {
  fakeApi(t, { ...done, transcript })
  renderPage()
  const section = await screen.findByRole('region', { name: pl.result.transcript })
  const text = section.textContent ?? ''
  assert.ok(text.includes(transcript))
  assert.ok(text.includes(pl.result.transcript_hint))
  assert.ok(await screen.findByText(pl.verdict.false))
})

test('a result of text has no transcript section', async (t) => {
  fakeApi(t, done)
  renderPage()
  assert.ok(await screen.findByText(pl.verdict.false))
  assert.equal(screen.queryAllByRole('region', { name: pl.result.transcript }).length, 0)
})

test('a failed transcription is a technical failure with its own line and no verdict', async (t) => {
  const failed: CheckResult = {
    ...done,
    status: 'technical_failure',
    failure_code: 'transcription_failed',
    claims: [],
  }
  fakeApi(t, failed)
  renderPage()
  assert.ok(await screen.findByText(pl.failure_code.transcription_failed))
  assert.equal(screen.queryAllByText(pl.verdict.false).length, 0)
})

test('while a recording is transcribed the steps name the transcription', async (t) => {
  const steps: AnalysisStatus['steps'] = [
    { code: 'receive', status: 'done' },
    { code: 'transcribe_audio', status: 'active' },
  ]
  const running: AnalysisStatus = { check_id: 'c_01', steps }
  t.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify(running), { status: 200 })),
  )
  render(
    <ResultPage
      handoff={handoff}
      checkId="c_01"
      reader={apiResultReader}
      progress={idle}
      pollMs={60_000}
    />,
  )
  assert.ok(await screen.findByText(pl.analysis.steps.transcribe_audio))
})

test("a recording reopened from this tab's history still shows its transcript", async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', () => Promise.reject(new TypeError('offline')))
  saveCheck({ ...done, transcript })
  renderPage()
  const section = await screen.findByRole('region', { name: pl.result.transcript })
  assert.ok((section.textContent ?? '').includes(transcript))
  assert.equal(fetch.mock.callCount(), 0)
})
