/**
 * The home page: the AI notice stands above the message field and nothing asks for a
 * sign-in (US-BEZ-07, AI Act art. 50); besides the example claims and „Sprawdź” the only
 * button deletes the session's checks (US-BEZ-05).
 *
 * @feature US-SPR-01, US-BEZ-05, US-BEZ-07, F-20, F-21
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'

test('the AI notice stands above the field and no button asks for a sign-in', async () => {
  const history = createMemoryHistory({ initialEntries: ['/'] })
  render(<RouterProvider router={createRouter({ routeTree, history })} />)
  const main = await screen.findByRole('main')
  const notice = await within(main).findByText(pl.ai_notice.first_contact, { exact: false })
  const field = within(main).getByLabelText(pl.form.input_label)
  const isAbove = Boolean(notice.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING)
  assert.equal(isAbove, true)
  const buttons = within(main)
    .queryAllByRole('button')
    .map((button) => button.textContent)
  const examples = pl.conversation.examples.map((claim) => `„${claim}”`)
  assert.deepEqual(buttons, [...examples, pl.form.delete_session, '', '', pl.form.submit])
})
