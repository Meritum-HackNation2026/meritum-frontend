/**
 * Every channel has its privacy policy at a fixed address: /prywatnosc (website),
 * /prywatnosc/discord, /prywatnosc/wtyczka and /prywatnosc/sms. Texts come from
 * copy/privacy.json.
 *
 * @feature US-BEZ-06, US-BEZ-05, F-20
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import { AiNotice } from '@/components/ai-notice'
import pl from '@/copy/pl.json'
import privacy from '@/copy/privacy.json'
import { routeTree } from '@/routeTree.gen'

const { policies, processors } = privacy
// Wording the issue's Gherkin scenarios require on the page.
const hashedForThirtyDays = /skrót z solą przez 30 dni/
const discordCommand = /\/usun-moje-dane/
const smsKeyword = /słowem USUN/

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
    const [active, planned] = screen.getAllByRole('table')
    assert.ok(active && planned)
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
  assert.ok(screen.getByText(policies.discord.moderators))
  assert.ok(screen.getByText(hashedForThirtyDays))
  assert.ok(screen.getByText(discordCommand))
  assert.ok(screen.getByRole('rowheader', { name: processorName('discord') }))
})

test('the SMS policy deletes with USUN and states the operator fees', async () => {
  await openPage('/prywatnosc/sms', policies.sms.title)
  assert.ok(screen.getByText(smsKeyword))
  assert.ok(screen.getByText(policies.sms.fees))
  assert.ok(screen.getByText(policies.sms.moderators))
})

test('the footer of every page links to the policies of all channels', async () => {
  await openPage('/prywatnosc/sms', policies.sms.title)
  const footer = screen.getByRole('contentinfo')
  for (const [path, policy] of pages) {
    const link = within(footer).getByRole('link', { name: policy.title })
    assert.equal(link.getAttribute('href'), path)
  }
})

test('the AI notice links to the website privacy policy', async () => {
  const history = createMemoryHistory({ initialEntries: ['/'] })
  const notice = createRootRoute({ component: AiNotice })
  render(<RouterProvider router={createRouter({ routeTree: notice, history })} />)
  await screen.findByRole('link', { name: policies.web.title })
  assert.ok(screen.getByText(pl.ai_notice.first_contact, { exact: false }))
  const link = screen.getByRole('link', { name: policies.web.title })
  assert.equal(link.getAttribute('href'), '/prywatnosc')
})
