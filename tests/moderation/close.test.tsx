/**
 * Closing a case without an answer in the case detail (public API of `src/moderation`), with a
 * fake answer port: the reason goes to the API, nobody is answered, the form gives way to a note;
 * an empty reason or a refused close keeps the case open and what was typed.
 *
 * @feature US-MOD-01, US-MOD-07, F-25, F-39
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import examples from '@/contracts/examples.json'
import type { ModeratorCase } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { CaseDetail } from '@/moderation'
import { fakeAnswers, sources } from './fake-answers'

const c = pl.moderation.close
const open = examples.ModeratorCase as ModeratorCase
const noop = () => undefined

async function show(ui: ReactElement) {
  const router = createRouter({
    routeTree: createRootRoute({ component: () => ui }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  render(<RouterProvider router={router} />)
  await act(() => router.load())
}

test('a closed case sends the reason, answers nobody and shows the note', async () => {
  const { api, calls, closes } = fakeAnswers()
  const closed: string[] = []
  const record = (id: string) => closed.push(id)
  await show(<CaseDetail moderatorCase={open} answers={api} onAnswered={noop} onClosed={record} />)
  fireEvent.change(await screen.findByLabelText(c.reason_label), {
    target: { value: 'sprawa testowa' },
  })
  fireEvent.click(screen.getByRole('button', { name: c.button }))
  assert.ok(await screen.findByText(c.closed_note))
  assert.deepEqual(closes, [{ caseId: open.id, reason: 'sprawa testowa' }])
  assert.deepEqual(calls, [])
  assert.deepEqual(closed, [open.id])
  assert.equal(screen.queryByRole('button', { name: pl.moderation.answer.send }), null)
  assert.equal(screen.queryByRole('button', { name: c.button }), null)
})

test('a close without a reason is not sent and says what is missing', async () => {
  const { api, closes } = fakeAnswers()
  await show(<CaseDetail moderatorCase={open} answers={api} onAnswered={noop} onClosed={noop} />)
  fireEvent.click(await screen.findByRole('button', { name: c.button }))
  assert.ok(await screen.findByText(c.reason_required))
  assert.deepEqual(closes, [])
})

test('a refused close keeps the case open and the reason typed', async () => {
  const { api } = fakeAnswers('sent', sources, 'failed')
  const failIfClosed = () => assert.fail('closed')
  await show(
    <CaseDetail moderatorCase={open} answers={api} onAnswered={noop} onClosed={failIfClosed} />,
  )
  const reason = await screen.findByLabelText(c.reason_label)
  fireEvent.change(reason, { target: { value: 'bezzasadna' } })
  fireEvent.click(screen.getByRole('button', { name: c.button }))
  assert.ok(await screen.findByText(c.not_closed))
  assert.equal((reason as HTMLTextAreaElement).value, 'bezzasadna')
  assert.ok(screen.getByRole('button', { name: pl.moderation.answer.send }))
})

test('a case that is not open has no close action', async () => {
  await show(
    <CaseDetail
      moderatorCase={{ ...open, state: 'closed' }}
      answers={fakeAnswers().api}
      onAnswered={noop}
      onClosed={noop}
    />,
  )
  assert.equal(screen.queryByRole('button', { name: c.button }), null)
})
