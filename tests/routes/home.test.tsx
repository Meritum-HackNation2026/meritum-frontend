/**
 * The home page: the AI notice stands above the check form's field and nothing asks for a
 * sign-in (US-BEZ-07, AI Act art. 50).
 *
 * @feature US-SPR-01, US-BEZ-07, F-21
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'

test('the AI notice stands above the field and the only button is "Sprawdź"', async () => {
  const history = createMemoryHistory({ initialEntries: ['/'] })
  render(<RouterProvider router={createRouter({ routeTree, history })} />)
  const main = await screen.findByRole('main')
  const notice = await within(main).findByText(pl.ai_notice.first_contact, { exact: false })
  const field = within(main).getByLabelText(pl.form.input_label)
  const isAbove = Boolean(notice.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING)
  assert.equal(isAbove, true)
  const buttons = screen.queryAllByRole('button').map((button) => button.textContent)
  assert.deepEqual(buttons, [pl.form.submit])
})
