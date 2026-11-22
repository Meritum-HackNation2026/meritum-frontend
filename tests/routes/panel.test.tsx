/**
 * The moderator panel at /panel on a fake API: staff sign-in, views by role and the case queue.
 *
 * @feature US-MOD-05, US-MOD-02, F-25
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'
import { requestPath, sentRequest } from '../fetch-request'

/** Answers each API path with a status and body; unknown paths get an empty list (the inbox). */
function fakeApi(t: TestContext, routes: Record<string, [number, unknown]>) {
  return t.mock.method(globalThis, 'fetch', (input: unknown) => {
    const [status, body] = routes[requestPath(input)] ?? [200, []]
    return Promise.resolve(Response.json(body, { status }))
  })
}

async function openPanel() {
  const history = createMemoryHistory({ initialEntries: ['/panel'] })
  const router = createRouter({ routeTree, history })
  render(<RouterProvider router={router} />)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
  return router
}

const paths = (fetch: ReturnType<typeof fakeApi>) =>
  fetch.mock.calls.map((call) => requestPath(call.arguments[0]))

test('a person without a staff session sees the sign-in page, not the cases', async (t) => {
  const fetch = fakeApi(t, { '/api/v1/staff/me': [401, { detail: 'Not signed in' }] })
  await openPanel()
  assert.ok(await screen.findByRole('heading', { name: pl.staff.sign_in.title }))
  const google = screen.getByRole('link', { name: pl.account.sign_in_google })
  assert.equal(google.getAttribute('href'), '/api/v1/auth/login/google?return_to=%2Fpanel')
  const microsoft = screen.getByRole('link', { name: pl.account.sign_in_microsoft })
  assert.equal(microsoft.getAttribute('href'), '/api/v1/auth/login/microsoft?return_to=%2Fpanel')
  assert.equal(paths(fetch).includes('/api/v1/moderation/cases'), false)
})

const moderator = { email: 'moderator@example.org', role: 'moderator' }

const dieselCase = {
  id: '#S-12',
  state: 'open',
  reasons: ['insufficient_evidence', 'high_risk'],
  high_risk_topic: 'Transport w mieście',
  high_risk_classified_by: 'keywords',
  summary: 'Zakaz wjazdu diesli do centrum Pcimia',
  claims: [
    {
      claim: 'Czy od przyszłego tygodnia diesle nie będą mogły wjechać do centrum Pcimia?',
      check_ids: ['c_01'],
    },
    { claim: 'Od poniedziałku diesle mają zakaz wjazdu do centrum Pcimia.', check_ids: ['c_02'] },
  ],
  distinct_askers: 2,
  first_seen: '2026-11-20T10:00:00Z',
  last_seen: '2026-11-21T10:00:00Z',
  assignee_role: 'moderator',
  // fields the contract does not have must never reach the screen
  discord_user_id: 'dc_user_4815',
  channel_user_hash: 'h_9f2c7a1e',
}

const dieselCaseButton = new RegExp(dieselCase.summary)

const quietCase = {
  id: '#S-7',
  state: 'open',
  reasons: ['user_dispute'],
  summary: 'Nowe stawki opłat za śmieci',
  // more questions than #S-12 but fewer distinct askers, so only a sort by askers puts it second
  claims: [
    { claim: 'Opłata za śmieci rośnie od stycznia o połowę.', check_ids: ['c_09', 'c_10', 'c_11'] },
  ],
  distinct_askers: 1,
  first_seen: '2026-11-21T11:00:00Z',
  last_seen: '2026-11-21T11:00:00Z',
}

test('a moderator sees the cases by distinct askers, without channel ids', async (t) => {
  fakeApi(t, {
    '/api/v1/staff/me': [200, moderator],
    // the API answers latest first; the quieter case is newer
    '/api/v1/moderation/cases': [200, [quietCase, dieselCase]],
  })
  await openPanel()
  const queue = await screen.findByRole('region', { name: pl.moderation.queue_title })
  const rows = queue.querySelectorAll('tbody tr')
  assert.deepEqual(
    [...rows].map((row) => row.querySelector('.font-mono')?.textContent),
    ['#S-12', '#S-7'],
  )
  assert.ok(screen.getByText('Transport w mieście'))
  assert.equal(document.body.textContent?.includes('dc_user_4815'), false)
  assert.equal(document.body.textContent?.includes('h_9f2c7a1e'), false)
})

test('a case with a paraphrase counts 2 questions and shows both claims (scenario H)', async (t) => {
  fakeApi(t, {
    '/api/v1/staff/me': [200, moderator],
    '/api/v1/moderation/cases': [200, [dieselCase]],
  })
  await openPanel()
  const open = await screen.findByRole('button', { name: dieselCaseButton })
  // the queue's "Pytania" column; its "podobnych pytań" label is meritum-design-system#65
  const headers = [...screen.getAllByRole('columnheader')].map((th) => th.textContent)
  const cell = open.closest('tr')?.querySelectorAll('td')[headers.indexOf('Pytania')]
  // on a phone the count carries its own „Pytania:” label (design-system#134)
  assert.equal(cell?.childNodes[1]?.textContent, '2')
  fireEvent.click(open)
  const detail = screen.getByRole('article', { name: dieselCase.summary })
  const text = detail.textContent ?? ''
  for (const { claim } of dieselCase.claims) {
    assert.ok(text.includes(claim))
  }
  // Polish plural from moderation.askers (meritum-design-system#65): 2 takes the „few” form
  assert.ok(text.includes('2 różne osoby pytające'))
  assert.ok(text.includes('Temat rozpoznany po słowach kluczowych'))
  assert.equal(
    within(detail).getByRole('link', { name: 'c_02' }).getAttribute('href'),
    '/sprawdzenie/c_02',
  )
  assert.equal(text.includes('dc_user_4815'), false)
})

test('an analyst sees evaluation in the navigation and never asks for cases', async (t) => {
  const fetch = fakeApi(t, {
    '/api/v1/staff/me': [200, { email: 'analityk@example.org', role: 'analyst' }],
  })
  await openPanel()
  const nav = await within(await screen.findByRole('main')).findByRole('navigation')
  assert.deepEqual(
    within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent),
    [pl.evaluation.title, pl.export.title],
  )
  assert.ok(screen.getByText('analityk@example.org, rola: analityk'))
  assert.equal(paths(fetch).includes('/api/v1/moderation/cases'), false)
})

test('an administrator sees the cases, evaluation and administration', async (t) => {
  fakeApi(t, {
    '/api/v1/staff/me': [200, { email: 'admin@example.org', role: 'admin' }],
    '/api/v1/moderation/cases': [200, [quietCase]],
  })
  await openPanel()
  const nav = await within(await screen.findByRole('main')).findByRole('navigation')
  assert.deepEqual(
    within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent),
    [pl.moderation.queue_title, pl.evaluation.title, pl.export.title, pl.staff.admin.title],
  )
  assert.ok(screen.getByText(quietCase.summary))
})

test('a signed-in account without a role is told to ask the administrator', async (t) => {
  const fetch = fakeApi(t, { '/api/v1/staff/me': [403, { detail: 'No role' }] })
  await openPanel()
  assert.ok(await screen.findByText(pl.staff.sign_in.no_access))
  assert.equal(paths(fetch).includes('/api/v1/moderation/cases'), false)
})

test('signing out sends the CSRF token and goes to the home page', async (t) => {
  let isSignedIn = true
  const fetch = t.mock.method(globalThis, 'fetch', (input: unknown) => {
    const path = requestPath(input)
    if (path === '/api/v1/auth/logout') {
      isSignedIn = false
      return Promise.resolve(new Response(null, { status: 204 }))
    }
    const answers: Record<string, Response> = {
      '/api/v1/staff/me': isSignedIn
        ? Response.json(moderator)
        : Response.json({}, { status: 401 }),
      '/api/v1/auth/me': Response.json({ csrf_token: 'tok_1' }),
      '/api/v1/moderation/cases': Response.json([]),
    }
    return Promise.resolve(answers[path] ?? Response.json([]))
  })
  const router = await openPanel()
  fireEvent.click(await screen.findByRole('button', { name: pl.account.sign_out }))
  await waitFor(() => assert.equal(router.state.location.pathname, '/'))
  const logout = fetch.mock.calls
    .map((call) => call.arguments[0])
    .find((input) => requestPath(input) === '/api/v1/auth/logout')
  assert.equal(sentRequest(logout).headers.get('X-CSRF-Token'), 'tok_1')
})

test('a session that ended before the cases loaded shows the sign-in page, not the cases', async (t) => {
  fakeApi(t, {
    '/api/v1/staff/me': [200, moderator],
    '/api/v1/moderation/cases': [401, { detail: 'Not signed in' }],
  })
  await openPanel()
  assert.ok(await screen.findByText(pl.staff.sign_in.session_expired))
  assert.ok(screen.getByRole('link', { name: pl.account.sign_in_google }))
})

test('a moderator whose role was taken away meanwhile is told to ask the administrator', async (t) => {
  fakeApi(t, {
    '/api/v1/staff/me': [200, moderator],
    '/api/v1/moderation/cases': [403, { detail: 'No role' }],
  })
  await openPanel()
  assert.ok(await screen.findByText(pl.staff.sign_in.no_access))
})
