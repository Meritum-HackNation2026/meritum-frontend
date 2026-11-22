/**
 * The home page (frontend#123): it explains the product and has no field. The headline, the
 * lead, „Sprawdź informację” to /sprawdz and „Jak działa Meritum”; beside them an inert example
 * result from contracts/examples.json; below three principles and the five verdicts.
 *
 * @feature US-SPR-01, US-DST-01, F-01
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import examples from '@/contracts/examples.json'
import type { CheckResult } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'

const done = examples['CheckResult.done'] as CheckResult

function quietApi(t: TestContext) {
  t.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(Response.json({ detail: 'Not signed in' }, { status: 401 })),
  )
}

async function openHome() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  render(<RouterProvider router={router} />)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
  return { router, main: await screen.findByRole('main') }
}

test('strona główna nie ma pola: headline, lead, both buttons and no text field', async (t) => {
  quietApi(t)
  const { main } = await openHome()
  assert.ok(within(main).getByRole('heading', { level: 1, name: pl.brand.taglines[0] ?? '' }))
  assert.ok(within(main).getByText(pl.form.lead))
  const check = within(main).getByRole('link', { name: pl.form.title })
  assert.equal(check.getAttribute('href'), '/sprawdz')
  const how = within(main).getByRole('link', { name: pl.result.how_it_works })
  assert.equal(how.getAttribute('href'), '/jak-dziala')
  assert.ok(within(main).getByText(pl.account.optional))
  assert.equal(within(main).queryByRole('textbox'), null)
})

test('the example result is inert, with the first claim whole and the next one faded', async (t) => {
  quietApi(t)
  const { main } = await openHome()
  const sample = within(main).getByRole('figure', { name: pl.check_page.sample })
  const [first, second] = done.claims ?? []
  const shown = within(sample).getByText(`„${first?.claim}”`)
  assert.ok(shown.closest('[inert]'), 'the example does not react to clicks')
  assert.equal(shown.closest('[data-faded]'), null, 'the first claim is fully legible')
  const faded = within(sample).getByText(`„${second?.claim}”`)
  assert.ok(faded.closest('[data-faded]'), 'the next claim is only a faded start')
})

test('below: three principles with icons and the legend of the five verdicts', async (t) => {
  quietApi(t)
  const { main } = await openHome()
  for (const title of [
    pl.method.sources.title,
    pl.method.verdict.title,
    pl.method.corrections.title,
  ]) {
    const heading = within(main).getByRole('heading', { level: 2, name: title })
    assert.ok(heading.querySelector('svg'), `${title} has an icon`)
  }
  const title = within(main).getByRole('heading', { level: 2, name: pl.brand.taglines[1] ?? '' })
  const legend = title.nextElementSibling as HTMLElement
  for (const hint of Object.values(pl.verdict_hint)) {
    assert.ok(within(legend).getByText(hint))
  }
})

test('przycisk prowadzi do nowego sprawdzenia: „Sprawdź informację” opens /sprawdz', async (t) => {
  quietApi(t)
  const { router, main } = await openHome()
  fireEvent.click(within(main).getByRole('link', { name: pl.form.title }))
  await waitFor(() => assert.equal(router.state.location.pathname, '/sprawdz'))
  assert.ok(await screen.findByLabelText(pl.form.input_label))
})
