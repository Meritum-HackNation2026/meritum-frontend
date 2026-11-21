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

/** A progress stream that never reports, so only the read drives the page. */
const idle: ProgressSource = { watch: () => () => undefined }

const rawKey = 'status_hint.technical_failure'

function renderResult(result: CheckResult) {
  const reader: ResultReader = {
    read: () =>
      Promise.resolve({
        status: { check_id: result.check_id, steps: [{ code: 'receive', status: 'done' }], result },
      }),
  }
  render(<ResultPage checkId={result.check_id} reader={reader} progress={idle} />)
}

function result(status: CheckResult['status'], extra: Partial<CheckResult> = {}): CheckResult {
  return { check_id: 'c_09', status, corpus_version: '1', message: rawKey, ...extra }
}

const verdictWords = Object.values(pl.verdict)

function assertNoVerdict() {
  for (const word of verdictWords) {
    assert.equal(screen.queryByText(word), null, `verdict "${word}" is shown`)
  }
  assert.equal(screen.queryByRole('article'), null)
  assert.equal(screen.queryByText(rawKey), null)
}

test('a technical failure says the check failed and is not a rating, from its failure code', async () => {
  renderResult(examples['CheckResult.failure'] as CheckResult)
  assert.ok(await screen.findByText(pl.status.technical_failure))
  assert.ok(screen.getByText(pl.failure_code.web_search_unavailable))
  assert.equal(screen.queryByText(examples['CheckResult.failure'].message), null)
  assertNoVerdict()
})

test('a technical failure without a code shows the general failure line', async () => {
  renderResult(result('technical_failure'))
  assert.ok(await screen.findByText(pl.status.technical_failure))
  assert.ok(screen.getByText(pl.status_hint.technical_failure))
  assertNoVerdict()
})

test('out of scope says what we check instead, not a verdict', async () => {
  renderResult(result('out_of_scope', { message: 'Obrazów nie obsługujemy.' }))
  assert.ok(await screen.findByText(pl.status.out_of_scope))
  assert.ok(screen.getByText(pl.status_hint.out_of_scope))
  assert.equal(screen.queryByText('Obrazów nie obsługujemy.'), null)
  assertNoVerdict()
})

test('"czy to prawda?" asks to write the claim to check', async () => {
  renderResult(result('needs_clarification', { message: 'czy to prawda?' }))
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
