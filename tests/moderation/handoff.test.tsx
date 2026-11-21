/**
 * „Przekaż moderatorom” and „Zgłoś błąd” on the result card (public API of `src/evidence`),
 * with a fake hand-off port: a case number shows only after the API saved the case.
 *
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fireEvent, render, screen, within } from '@testing-library/react'
import examples from '@/contracts/examples.json'
import type { CheckResult } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { CheckResultCard } from '@/evidence'
import { fakeHandoff } from './fake-handoff'

const done = examples['CheckResult.done'] as CheckResult
const abstain = examples['CheckResult.abstain'] as CheckResult
const recommended: CheckResult = { ...abstain, escalation: { state: 'recommended' } }
const passed = pl.escalation.created.replace('{case}', '#S-12')
const reported = pl.result.report_error_done.replace('{case}', '#S-12')

function hasText(text: string): boolean {
  return document.body.textContent?.includes(text) ?? false
}

test('a recommendation shows the hint and the button, never a case number', () => {
  render(<CheckResultCard result={recommended} handoff={fakeHandoff().handoff} />)
  assert.ok(screen.getByText(pl.escalation.recommended))
  assert.ok(screen.getByRole('button', { name: pl.result.escalate }))
  assert.equal(hasText('#S-'), false)
})

test('clicking „Przekaż moderatorom” shows the case number the API saved', async () => {
  const { handoff, calls } = fakeHandoff({ caseId: '#S-12' })
  render(<CheckResultCard result={recommended} handoff={handoff} />)
  fireEvent.click(screen.getByRole('button', { name: pl.result.escalate }))
  assert.ok(await screen.findByText(passed))
  assert.deepEqual(calls, [{ kind: 'escalate', checkId: recommended.check_id, claimIndex: 0 }])
  assert.equal(screen.queryAllByRole('button', { name: pl.result.escalate }).length, 0)
})

test('„Przekaż moderatorom” hands off the claim without enough evidence, not the first claim', async () => {
  const { handoff, calls } = fakeHandoff({ caseId: '#S-12' })
  const result: CheckResult = {
    ...recommended,
    claims: [...(done.claims ?? []).slice(0, 1), ...(abstain.claims ?? [])],
  }
  render(<CheckResultCard result={result} handoff={handoff} />)
  fireEvent.click(screen.getByRole('button', { name: pl.result.escalate }))
  await screen.findByText(passed)
  assert.deepEqual(calls, [{ kind: 'escalate', checkId: result.check_id, claimIndex: 1 }])
})

test('a saved report ends the recommendation, so the card never says both', async () => {
  render(
    <CheckResultCard result={recommended} handoff={fakeHandoff({ caseId: '#S-12' }).handoff} />,
  )
  const claim = within(screen.getByRole('article'))
  fireEvent.click(claim.getByRole('button', { name: pl.result.report_error }))
  fireEvent.click(claim.getByRole('button', { name: pl.result.report_error_send }))
  assert.ok(await screen.findByText(reported))
  assert.ok(screen.getByText(passed))
  assert.equal(hasText(pl.escalation.recommended), false)
  assert.equal(screen.queryAllByRole('button', { name: pl.result.escalate }).length, 0)
})

test('a recommendation without claims shows the hint but no button to press', () => {
  render(
    <CheckResultCard result={{ ...recommended, claims: [] }} handoff={fakeHandoff().handoff} />,
  )
  assert.ok(screen.getByText(pl.escalation.recommended))
  assert.equal(screen.queryAllByRole('button', { name: pl.result.escalate }).length, 0)
})

test('a failed save shows neither a number nor that the case was passed on', async () => {
  render(<CheckResultCard result={recommended} handoff={fakeHandoff().handoff} />)
  fireEvent.click(screen.getByRole('button', { name: pl.result.escalate }))
  assert.equal((await screen.findByRole('alert')).textContent, pl.errors.busy)
  assert.equal(hasText('#S-'), false)
  assert.ok(screen.getByText(pl.escalation.recommended))
  assert.ok(screen.getByRole('button', { name: pl.result.escalate }))
})

test('a created and a joined case read the same, so nobody learns who else asked', () => {
  for (const state of ['created', 'updated'] as const) {
    const result = { ...abstain, escalation: { state, case_id: '#S-12' } }
    const { unmount } = render(<CheckResultCard result={result} handoff={fakeHandoff().handoff} />)
    assert.ok(screen.getByText(passed))
    unmount()
  }
})

test('a saved case whose number is missing shows neither a number nor the button', () => {
  const result: CheckResult = { ...abstain, escalation: { state: 'created' } }
  render(<CheckResultCard result={result} handoff={fakeHandoff().handoff} />)
  assert.equal(hasText(pl.escalation.recommended), false)
  assert.equal(screen.queryAllByRole('button', { name: pl.result.escalate }).length, 0)
})

test('a second click while the hand-off is out sends nothing more', async () => {
  const { handoff, calls } = fakeHandoff({ caseId: '#S-12' })
  render(<CheckResultCard result={recommended} handoff={handoff} />)
  const button = screen.getByRole('button', { name: pl.result.escalate })
  fireEvent.click(button)
  fireEvent.click(button)
  await screen.findByText(passed)
  assert.equal(calls.length, 1)
})

test('a result without escalation shows no hand-off line', () => {
  render(<CheckResultCard result={done} handoff={fakeHandoff().handoff} />)
  assert.equal(hasText(pl.escalation.recommended), false)
  assert.equal(screen.queryAllByRole('button', { name: pl.result.escalate }).length, 0)
})

test('every claim has its own „Zgłoś błąd” button', () => {
  render(<CheckResultCard result={done} handoff={fakeHandoff().handoff} />)
  for (const claim of screen.getAllByRole('article')) {
    assert.ok(within(claim).getByRole('button', { name: pl.result.report_error }))
  }
})

test('a report with a justification gives the case number and the notification promise', async () => {
  const { handoff, calls } = fakeHandoff({ caseId: '#S-12' })
  render(<CheckResultCard result={done} handoff={handoff} />)
  const second = within(screen.getAllByRole('article')[1] as HTMLElement)
  fireEvent.click(second.getByRole('button', { name: pl.result.report_error }))
  fireEvent.change(second.getByLabelText(pl.result.report_error_reason), {
    target: { value: 'Zła data' },
  })
  fireEvent.click(second.getByRole('button', { name: pl.result.report_error_send }))
  assert.ok(await second.findByText(reported))
  assert.deepEqual(calls, [
    { kind: 'dispute', checkId: done.check_id, claimIndex: 1, text: 'Zła data' },
  ])
})

test('the justification is optional and limited to what the API accepts', () => {
  render(<CheckResultCard result={done} handoff={fakeHandoff().handoff} />)
  const first = within(screen.getAllByRole('article')[0] as HTMLElement)
  fireEvent.click(first.getByRole('button', { name: pl.result.report_error }))
  const field = first.getByLabelText(pl.result.report_error_reason)
  assert.equal(field.hasAttribute('required'), false)
  assert.equal(field.getAttribute('maxlength'), '4000')
})

test('the open report form sends with its own button, not a second „Zgłoś błąd”', () => {
  render(<CheckResultCard result={done} handoff={fakeHandoff().handoff} />)
  const first = within(screen.getAllByRole('article')[0] as HTMLElement)
  fireEvent.click(first.getByRole('button', { name: pl.result.report_error }))
  assert.ok(first.getByRole('button', { name: pl.result.report_error_send }))
  assert.equal(first.getAllByRole('button', { name: pl.result.report_error }).length, 1)
})

for (const refusal of ['rate_limited_handoff', 'handoff_not_found', 'handoff_rejected'] as const) {
  test(`a report refused with ${refusal} shows its own text and no case number`, async () => {
    render(<CheckResultCard result={done} handoff={fakeHandoff(refusal).handoff} />)
    const first = within(screen.getAllByRole('article')[0] as HTMLElement)
    fireEvent.click(first.getByRole('button', { name: pl.result.report_error }))
    fireEvent.click(first.getByRole('button', { name: pl.result.report_error_send }))
    assert.equal((await first.findByRole('alert')).textContent, pl.errors[refusal])
    assert.equal(hasText('#S-'), false)
  })

  test(`a hand-off refused with ${refusal} shows its own text`, async () => {
    render(<CheckResultCard result={recommended} handoff={fakeHandoff(refusal).handoff} />)
    fireEvent.click(screen.getByRole('button', { name: pl.result.escalate }))
    assert.equal((await screen.findByRole('alert')).textContent, pl.errors[refusal])
  })
}

test('Escape closes the report form and returns focus to its button', () => {
  render(<CheckResultCard result={done} handoff={fakeHandoff().handoff} />)
  const first = within(screen.getAllByRole('article')[0] as HTMLElement)
  const toggle = first.getByRole('button', { name: pl.result.report_error })
  fireEvent.click(toggle)
  fireEvent.keyDown(first.getByLabelText(pl.result.report_error_reason), { key: 'Escape' })
  assert.equal(first.queryAllByLabelText(pl.result.report_error_reason).length, 0)
  assert.equal(document.activeElement === toggle, true)
})
