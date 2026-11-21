/**
 * Results that are not verdicts (needs_clarification, out_of_scope, technical_failure) through
 * the public API of `src/checks`: a neutral line from `copy/pl.json`, never the API `message`,
 * never a verdict badge or a claim.
 *
 * @feature US-SPR-06, F-18
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { render, screen } from '@testing-library/react'
import { type ProgressSource, ResultPage, type ResultReader } from '@/checks'
import examples from '@/contracts/examples.json'
import type { CheckResult } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { fakeHandoff } from '../moderation/fake-handoff'

const { handoff } = fakeHandoff()

/** A progress stream that never reports, so only the read drives the page. */
const idle: ProgressSource = { watch: () => () => undefined }

const leakedCopyKey = 'status_hint.technical_failure'

function renderResult(result: CheckResult) {
  const reader: ResultReader = {
    read: () =>
      Promise.resolve({
        status: { check_id: result.check_id, steps: [{ code: 'receive', status: 'done' }], result },
      }),
  }
  render(<ResultPage handoff={handoff} checkId={result.check_id} reader={reader} progress={idle} />)
}

function nonVerdict(
  status: Exclude<CheckResult['status'], 'done'>,
  extra: Partial<CheckResult> = {},
): CheckResult {
  return { check_id: 'c_09', status, corpus_version: '1', message: leakedCopyKey, ...extra }
}

const verdictWords = Object.values(pl.verdict)

function assertNoVerdict() {
  for (const word of verdictWords) {
    assert.equal(screen.queryByText(word), null, `verdict "${word}" is shown`)
  }
  assert.equal(screen.queryByRole('article'), null)
  assert.equal(screen.queryByText(leakedCopyKey), null)
}

test('a technical failure says the check failed and is not a rating, from its failure code', async () => {
  const failure = examples['CheckResult.failure'] as CheckResult
  renderResult({ ...failure, message: leakedCopyKey })
  assert.ok(await screen.findByText(pl.status.technical_failure))
  assert.ok(screen.getByText(pl.failure_code.web_search_unavailable))
  assertNoVerdict()
})

test('a state card has only the icon, the title and one line: no limitations, no AI line', async () => {
  renderResult(nonVerdict('technical_failure', { limitation_codes: ['fact_check_unavailable'] }))
  assert.ok(await screen.findByText(pl.status.technical_failure))
  assert.equal(screen.queryByText(pl.result.limitations), null)
  assert.equal(screen.queryByText(pl.limitation_code.fact_check_unavailable), null)
  assert.equal(screen.queryByText(pl.result.ai_disclosure), null)
})

test('a technical failure without a code shows the general failure line', async () => {
  renderResult(nonVerdict('technical_failure'))
  assert.ok(await screen.findByText(pl.status.technical_failure))
  assert.ok(screen.getByText(pl.status_hint.technical_failure))
  assertNoVerdict()
})

test('out of scope shows the general out-of-scope line, not a verdict', async () => {
  renderResult(nonVerdict('out_of_scope', { message: 'Obrazów nie obsługujemy.' }))
  assert.ok(await screen.findByText(pl.status.out_of_scope))
  assert.ok(screen.getByText(pl.status_hint.out_of_scope))
  assert.equal(screen.queryByText('Obrazów nie obsługujemy.'), null)
  assertNoVerdict()
})

test('needs clarification asks to write the claim to check, never the message', async () => {
  renderResult(nonVerdict('needs_clarification', { message: 'czy to prawda?' }))
  assert.ok(await screen.findByText(pl.status.needs_clarification))
  assert.ok(screen.getByText(pl.status_hint.needs_clarification))
  assertNoVerdict()
})

test('a done result with a verdict and an opinion shows two claims', async () => {
  const done = examples['CheckResult.done'] as CheckResult
  const [claim] = done.claims ?? []
  assert.ok(claim)
  const opinion = {
    ...claim,
    claim: 'To najgorsza ustawa w historii.',
    verdict: 'not_verifiable' as const,
  }
  renderResult({ ...done, claims: [claim, opinion] })
  const claims = await screen.findAllByRole('article')
  assert.equal(claims.length, 2)
  assert.ok(screen.getByText(pl.verdict[claim.verdict]))
  assert.ok(screen.getByText(pl.verdict.not_verifiable))
  assert.equal(screen.queryByText(pl.status.technical_failure), null)
})

test('a failure code the copy does not know yet falls back to the general failure line', async () => {
  // a code a newer backend may send before the copy has a text for it
  const unknownCode = 'quota_exceeded' as NonNullable<CheckResult['failure_code']>
  renderResult(nonVerdict('technical_failure', { failure_code: unknownCode }))
  assert.ok(await screen.findByText(pl.status.technical_failure))
  assert.ok(screen.getByText(pl.status_hint.technical_failure))
  assertNoVerdict()
})
