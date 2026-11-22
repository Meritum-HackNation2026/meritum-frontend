/**
 * The moderator's answer form in the case detail (public API of `src/moderation`), with a fake
 * answer port: a sent answer is shown and the case is „z odpowiedzią”; a citation the API
 * rejects is named and nothing the moderator typed is lost.
 *
 * @feature US-MOD-07, F-39, ADR-06
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
import { TooltipProvider } from '@/components/ui/tooltip'
import examples from '@/contracts/examples.json'
import type { ModeratorCase } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { CaseDetail, Panel } from '@/moderation'
import { fakeAnswers, sources } from './fake-answers'

const a = pl.moderation.answer
const fragmentText = /gotówka jest prawnym środkiem/
const noChannel = /discord|sms|\+48/i
const noop = () => undefined
const failIfSent = () => assert.fail('sent')
const open = examples.ModeratorCase as ModeratorCase

// the case detail links to checks, so it needs a router around it
async function show(ui: ReactElement) {
  const router = createRouter({
    routeTree: createRootRoute({ component: () => ui }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  render(<RouterProvider router={router} />)
  await act(() => router.load())
}

async function fillForm(): Promise<void> {
  fireEvent.change(await screen.findByLabelText(a.text_label), {
    target: { value: 'Gotówka nadal działa.' },
  })
  await screen.findByRole('option', { name: new RegExp(sources[0]?.title ?? '') })
  fireEvent.change(screen.getByLabelText(a.source_label), { target: { value: 'src-1' } })
  fireEvent.change(screen.getByLabelText(a.fragment_label), {
    target: { value: 'gotówka jest prawnym środkiem' },
  })
}

test('a sent answer is shown with its citation and the case becomes answered', async () => {
  const { api, calls } = fakeAnswers()
  const states: string[] = []
  const record = (id: string) => states.push(id)
  await show(<CaseDetail moderatorCase={open} answers={api} onAnswered={record} />)
  await fillForm()
  fireEvent.click(screen.getByRole('button', { name: a.send }))
  assert.ok(await screen.findByText(a.sent_title))
  assert.ok(screen.getByText('Gotówka nadal działa.'))
  assert.ok(screen.getByText(fragmentText))
  assert.deepEqual(calls, [
    {
      caseId: open.id,
      draft: {
        text: 'Gotówka nadal działa.',
        citations: [{ source_id: 'src-1', fragment: 'gotówka jest prawnym środkiem' }],
      },
    },
  ])
  assert.deepEqual(states, [open.id])
  assert.equal(screen.queryByRole('button', { name: a.send }), null)
})

test('a citation the API rejects is named, the answer is not sent and the form keeps its data', async () => {
  const { api } = fakeAnswers({ rejected: [0] })
  await show(<CaseDetail moderatorCase={open} answers={api} onAnswered={failIfSent} />)
  await fillForm()
  fireEvent.click(screen.getByRole('button', { name: a.send }))
  assert.ok(await screen.findByText(a.citation_not_verbatim.replace('{n}', '1')))
  assert.equal(
    (screen.getByLabelText(a.text_label) as HTMLTextAreaElement).value,
    'Gotówka nadal działa.',
  )
  assert.equal(
    (screen.getByLabelText(a.fragment_label) as HTMLTextAreaElement).value,
    'gotówka jest prawnym środkiem',
  )
  assert.equal(screen.queryByText(a.sent_title), null)
})

test('an answer without text or citation is not sent and says what is missing', async () => {
  const { api, calls } = fakeAnswers()
  await show(<CaseDetail moderatorCase={open} answers={api} onAnswered={noop} />)
  fireEvent.click(await screen.findByRole('button', { name: a.send }))
  assert.ok(await screen.findByText(a.text_required))
  assert.deepEqual(calls, [])
})

test('the case detail never shows who asked or a channel id', async () => {
  await show(<CaseDetail moderatorCase={open} answers={fakeAnswers().api} onAnswered={noop} />)
  await screen.findByLabelText(a.text_label)
  assert.doesNotMatch(document.body.textContent ?? '', noChannel)
})

test('a case that already has an answer shows no form', async () => {
  await show(
    <CaseDetail
      moderatorCase={{ ...open, state: 'answered' }}
      answers={fakeAnswers().api}
      onAnswered={noop}
    />,
  )
  assert.equal(screen.queryByLabelText(a.text_label), null)
})

test('the panel marks the answered case „z odpowiedzią” in the queue', async () => {
  const { api } = fakeAnswers()
  const staff = {
    loginUrl: () => '',
    session: () => Promise.resolve({ kind: 'failed' as const }),
    cases: () => Promise.resolve([]),
    signOut: () => Promise.resolve(),
  }
  await show(
    <TooltipProvider>
      <Panel
        api={staff}
        answers={api}
        data={{
          session: { kind: 'member', email: null, role: 'moderator', readOnly: false },
          cases: [open],
        }}
        rail={(content) => content}
      />
    </TooltipProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(open.summary) }))
  await fillForm()
  fireEvent.click(screen.getByRole('button', { name: a.send }))
  await screen.findByText(a.sent_title)
  assert.ok(screen.getAllByText(pl.moderation.state.answered).length >= 2)
})
