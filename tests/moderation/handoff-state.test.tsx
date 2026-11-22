/**
 * What the hand-off buttons offer and show while working: a recommendation the API did not send
 * for a verdict that asks for a moderator, spinners while a request is out, and the report
 * form scrolling clear of the docked message field (meritum-frontend#76).
 *
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fireEvent, render, screen } from '@testing-library/react'
import examples from '@/contracts/examples.json'
import type { CheckResult } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { CheckResultCard } from '@/evidence'
import type { Handoff } from '@/moderation'
import { fakeHandoff } from './fake-handoff'

const abstain = examples['CheckResult.abstain'] as CheckResult
const recommended: CheckResult = { ...abstain, escalation: { state: 'recommended' } }
const passed = pl.escalation.created.replace('{case}', '#S-12')

const { escalation: _ignored, ...abstainBase } = abstain

test('a claim without enough evidence offers „Przekaż moderatorom” even when the API sent no escalation', async () => {
  const { handoff, calls } = fakeHandoff({ caseId: '#S-12' })
  render(<CheckResultCard result={abstainBase} handoff={handoff} />)
  assert.ok(screen.getByText(pl.escalation.recommended))
  fireEvent.click(screen.getByRole('button', { name: pl.result.escalate }))
  await screen.findByText(passed)
  assert.deepEqual(calls, [{ kind: 'escalate', checkId: abstain.check_id, claimIndex: 0 }])
})

test('a claim that cannot be verified offers „Przekaż moderatorom” without an API escalation', () => {
  const result: CheckResult = {
    ...abstainBase,
    claims: (abstain.claims ?? []).map((claim) => ({ ...claim, verdict: 'not_verifiable' })),
  }
  render(<CheckResultCard result={result} handoff={fakeHandoff().handoff} />)
  assert.ok(screen.getByRole('button', { name: pl.result.escalate }))
})

test('a decisive verdict without escalation still shows no hand-off', () => {
  const result: CheckResult = {
    ...abstainBase,
    claims: (abstain.claims ?? []).map((claim) => ({ ...claim, verdict: 'confirmed' })),
  }
  render(<CheckResultCard result={result} handoff={fakeHandoff().handoff} />)
  assert.equal(screen.queryAllByRole('button', { name: pl.result.escalate }).length, 0)
})

test('while a hand-off is out its button shows a spinner', () => {
  const pending: Handoff = {
    escalate: () => new Promise(() => undefined),
    dispute: () => new Promise(() => undefined),
  }
  render(<CheckResultCard result={recommended} handoff={pending} />)
  const button = screen.getByRole('button', { name: pl.result.escalate })
  assert.equal(button.querySelector('.animate-spin'), null)
  fireEvent.click(button)
  assert.ok(button.querySelector('.animate-spin'))
})

test('while a report is out „Wyślij zgłoszenie” shows a spinner and the form scrolls clear of the field', () => {
  const pending: Handoff = {
    escalate: () => new Promise(() => undefined),
    dispute: () => new Promise(() => undefined),
  }
  const scrolled: Element[] = []
  const original = Element.prototype.scrollIntoView
  Element.prototype.scrollIntoView = function (this: Element) {
    scrolled.push(this)
  }
  try {
    render(<CheckResultCard result={abstain} handoff={pending} />)
    fireEvent.click(screen.getByRole('button', { name: pl.result.report_error }))
    const send = screen.getByRole('button', { name: pl.result.report_error_send })
    assert.ok(
      scrolled.some((el) => el.contains(send)),
      'the form is scrolled into view',
    )
    assert.equal(send.querySelector('.animate-spin'), null)
    fireEvent.click(send)
    assert.ok(send.querySelector('.animate-spin'))
  } finally {
    Element.prototype.scrollIntoView = original
  }
})
