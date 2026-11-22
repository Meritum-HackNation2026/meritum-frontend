/**
 * Every channel has its privacy policy at a fixed address: /prywatnosc (website),
 * /prywatnosc/discord, /prywatnosc/wtyczka and /prywatnosc/sms. Texts come from
 * copy/privacy.json.
 *
 * @feature US-BEZ-06, US-BEZ-05, F-20
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import pl from '@/copy/pl.json'
import privacy from '@/copy/privacy.json'
import { routeTree } from '@/routeTree.gen'

const { policies, processors } = privacy
// Wording the issue's Gherkin scenarios require on the page.
const hashedForThirtyDays = /skrót z solą przez 30 dni/
const discordCommand = /\/usun-moje-dane/
const smsKeyword = /słowem USUN/
const thirtyDays = /30 dni/
const countsRepetitions = /powtórze/
const popupDelete = /„Usuń moje sprawdzenia” w okienku wtyczki/
const discordNeverToModerators = /nazwa i identyfikator nigdy nie trafiają do moderatorów/
const smsNeverToModerators = /numer telefonu nigdy nie trafia do moderatorów/

async function openPage(path: string, title: string) {
  const history = createMemoryHistory({ initialEntries: [path] })
  render(<RouterProvider router={createRouter({ routeTree, history })} />)
  await screen.findByRole('heading', { level: 1, name: title })
}

function processorName(id: string): string {
  const item = [...processors.items, ...processors.planned_items].find((p) => p.id === id)
  assert.ok(item, `unknown processor ${id}`)
  return item.name
}

const pages = [
  ['/prywatnosc', policies.web],
  ['/prywatnosc/discord', policies.discord],
  ['/prywatnosc/wtyczka', policies.extension],
  ['/prywatnosc/sms', policies.sms],
] as const

for (const [path, policy] of pages) {
  test(`${path} shows its policy: retention, deletion, purpose, telemetry, IP and processors`, async () => {
    await openPage(path, policy.title)
    for (const text of [
      policy.data,
      policy.purpose,
      policy.retention,
      policy.deletion,
      policy.telemetry,
      policy.ip_addresses,
      privacy.controller.name,
      privacy.external_mcp_clients.text,
    ]) {
      assert.ok(screen.getByText(text))
    }
    assert.match(screen.getByText(policy.retention).textContent ?? '', thirtyDays)
    assert.match(screen.getByText(policy.purpose).textContent ?? '', countsRepetitions)
    const active = screen.getByRole('table', { name: policy.processors_lead })
    const planned = screen.getByRole('table', { name: policy.planned_processors_lead })
    // the scroll region around each table is named and reachable by keyboard
    const region = screen.getByRole('region', { name: policy.processors_lead })
    assert.equal(region.getAttribute('tabindex'), '0')
    for (const id of policy.processors) {
      assert.ok(within(active).getByRole('rowheader', { name: processorName(id) }))
    }
    for (const id of policy.planned_processors) {
      assert.ok(within(planned).getByRole('rowheader', { name: processorName(id) }))
    }
  })
}

test('the Discord policy keeps names away from moderators and deletes with /usun-moje-dane', async () => {
  await openPage('/prywatnosc/discord', policies.discord.title)
  assert.ok(screen.getByText(discordNeverToModerators))
  assert.ok(screen.getByText(hashedForThirtyDays))
  assert.ok(screen.getByText(discordCommand))
  assert.ok(screen.getByRole('rowheader', { name: processorName('discord') }))
})

test('the SMS policy deletes with USUN and states the operator fees', async () => {
  await openPage('/prywatnosc/sms', policies.sms.title)
  assert.ok(screen.getByText(smsKeyword))
  assert.ok(screen.getByText(policies.sms.fees))
  assert.ok(screen.getByText(smsNeverToModerators))
})

test('the footer of every page links to the policies of all channels', async () => {
  await openPage('/prywatnosc/sms', policies.sms.title)
  const footer = screen.getByRole('contentinfo')
  for (const [path, policy] of pages) {
    const link = within(footer).getByRole('link', { name: policy.title })
    assert.equal(link.getAttribute('href'), path)
  }
})

test('the extension policy deletes checks from the popup', async () => {
  await openPage('/prywatnosc/wtyczka', policies.extension.title)
  assert.ok(screen.getByText(popupDelete))
})

test('the website policy describes Google or Microsoft sign-in and its OAuth scopes', async () => {
  await openPage('/prywatnosc', policies.web.title)
  const { sign_in: signIn } = policies.web
  assert.ok(screen.getByRole('heading', { level: 2, name: signIn.title }))
  for (const text of [signIn.scopes, signIn.purpose, signIn.retention]) {
    assert.ok(screen.getByText(text))
  }
})

test('the home page shows the AI notice with the privacy link', async () => {
  const history = createMemoryHistory({ initialEntries: ['/'] })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={createRouter({ routeTree, history })} />
    </QueryClientProvider>,
  )
  const main = await screen.findByRole('main')
  assert.ok(await within(main).findByText(pl.ai_notice.first_contact, { exact: false }))
  assert.ok(within(main).getByRole('link', { name: policies.web.title }))
  // design-system#108: the AI notice stands once on the screen
  assert.equal(within(main).getAllByText(pl.ai_notice.first_contact, { exact: false }).length, 1)
})
