/**
 * The evaluation page at /panel/eval on a fake API: the runs with their metrics, a new run on
 * the golden set, an uploaded case file, the comparison of two runs and who may see what.
 *
 * @feature US-OBS-06, US-OBS-05, F-28
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import pl from '@/copy/pl.json'
import { routeTree } from '@/routeTree.gen'
import { requestPath } from '../fetch-request'

type Answer = [number, unknown]

/** Answers `METHOD /path` with a status and body; an unknown call gets an empty list. */
function fakeApi(t: TestContext, routes: Record<string, Answer | (() => Answer)>) {
  return t.mock.method(globalThis, 'fetch', (input: unknown, init?: RequestInit) => {
    const method = input instanceof Request ? input.method : (init?.method ?? 'GET')
    const answer = routes[`${method} ${requestPath(input)}`]
    const [status, body] = typeof answer === 'function' ? answer() : (answer ?? [200, []])
    return Promise.resolve(Response.json(body, { status }))
  })
}

const calls = (fetch: ReturnType<typeof fakeApi>) =>
  fetch.mock.calls.map(({ arguments: [input, init] }) => {
    const method = input instanceof Request ? input.method : (init?.method ?? 'GET')
    return `${method} ${requestPath(input)}`
  })

async function openEval() {
  const history = createMemoryHistory({ initialEntries: ['/panel/eval'] })
  const router = createRouter({ routeTree, history })
  render(<RouterProvider router={router} />)
  await waitFor(() => assert.equal(router.state.status, 'idle'))
  return router
}

const analyst = { email: 'analityk@example.org', role: 'analyst', read_only: false }
const jury = { email: null, role: 'analyst', read_only: true }

const older = {
  id: 'run_01',
  status: 'done',
  dataset: 'golden',
  started_at: '2026-11-19T10:00:00Z',
  finished_at: '2026-11-19T10:40:00Z',
  metrics: { macro_f1: 0.68, citation_coverage: 0.9, latency_median_s: 14.2 },
}
const newer = {
  id: 'run_02',
  status: 'done',
  dataset: 'golden',
  started_at: '2026-11-20T10:00:00Z',
  finished_at: '2026-11-20T10:35:00Z',
  metrics: { macro_f1: 0.71, citation_coverage: 0.92, latency_median_s: 12.4 },
}

const runsRoute = 'GET /api/v1/eval/runs'

test('an analyst sees each run with its status, dataset and metrics in Azeret Mono', async (t) => {
  fakeApi(t, { 'GET /api/v1/staff/me': [200, analyst], [runsRoute]: [200, [newer, older]] })
  await openEval()
  const runs = await screen.findByRole('region', { name: pl.evaluation.runs })
  const items = within(runs).getAllByRole('listitem')
  assert.equal(items.length, 2)
  const first = within(items[0] as HTMLElement)
  assert.ok(first.getByText(pl.evaluation.status.done))
  assert.ok(first.getByText(pl.evaluation.golden_set))
  const f1 = first.getByText(pl.method.metrics.names.macro_f1).nextElementSibling
  assert.equal(f1?.textContent, '0,71')
  assert.equal(f1?.classList.contains('font-mono'), true)
})

const running = { ...newer, id: 'run_03', status: 'running', finished_at: null, metrics: {} }
const csrf: Record<string, Answer> = {
  'GET /api/v1/auth/me': [200, { email: analyst.email, csrf_token: 'tok_1' }],
}

test('„Uruchom na golden secie” starts a run that shows up as running', async (t) => {
  let started = false
  const fetch = fakeApi(t, {
    ...csrf,
    'GET /api/v1/staff/me': [200, analyst],
    [runsRoute]: () => [200, started ? [running, newer] : [newer]],
    'POST /api/v1/eval/runs': () => {
      started = true
      return [202, { id: 'run_03' }]
    },
  })
  await openEval()
  fireEvent.click(await screen.findByRole('button', { name: pl.evaluation.new_run }))
  const runs = screen.getByRole('region', { name: pl.evaluation.runs })
  await waitFor(() => assert.equal(within(runs).getAllByRole('listitem').length, 2))
  assert.ok(within(runs).getByText(pl.evaluation.status.running))
  const post = fetch.mock.calls.find((call) => call.arguments[1]?.method === 'POST')
  assert.equal(post?.arguments[1]?.body, JSON.stringify({ dataset: 'golden' }))
  assert.equal(new Headers(post?.arguments[1]?.headers).get('X-CSRF-Token'), 'tok_1')
})

test('an uploaded CSV with 30 cases is saved and a run starts on it', async (t) => {
  const fetch = fakeApi(t, {
    ...csrf,
    'GET /api/v1/staff/me': [200, analyst],
    [runsRoute]: [200, [newer]],
    'POST /api/v1/eval/datasets': [201, { id: 'ds_30' }],
    'POST /api/v1/eval/runs': [202, { id: 'run_04' }],
  })
  await openEval()
  const csv = ['case_id,input,expected_verdict']
  for (let i = 1; i <= 30; i += 1) {
    csv.push(`c${i},Twierdzenie ${i},confirmed`)
  }
  const file = new File([csv.join('\n')], 'jury.csv', { type: 'text/csv' })
  fireEvent.change(await screen.findByLabelText(pl.evaluation.upload), {
    target: { files: [file] },
  })
  await waitFor(() => assert.ok(calls(fetch).includes('POST /api/v1/eval/runs')))
  const upload = fetch.mock.calls.find(
    (call) => requestPath(call.arguments[0]) === '/api/v1/eval/datasets',
  )
  const sent = upload?.arguments[1]?.body
  assert.ok(sent instanceof FormData)
  assert.equal((sent.get('file') as File).name, 'jury.csv')
  const run = fetch.mock.calls.find(
    (call) =>
      call.arguments[1]?.method === 'POST' &&
      requestPath(call.arguments[0]) === '/api/v1/eval/runs',
  )
  assert.equal(run?.arguments[1]?.body, JSON.stringify({ dataset: 'ds_30' }))
})

test('a refused upload says so and starts nothing', async (t) => {
  const fetch = fakeApi(t, {
    ...csrf,
    'GET /api/v1/staff/me': [200, analyst],
    [runsRoute]: [200, []],
    'POST /api/v1/eval/datasets': [422, { detail: 'too few cases' }],
  })
  await openEval()
  assert.ok(screen.getByText(pl.method.metrics.no_run))
  const file = new File(['{}'], 'zestaw.json', { type: 'application/json' })
  fireEvent.change(screen.getByLabelText(pl.evaluation.upload), { target: { files: [file] } })
  assert.equal((await screen.findByRole('status')).textContent, pl.errors.offline)
  assert.equal(calls(fetch).includes('POST /api/v1/eval/runs'), false)
})

test('opening a run shows its case results', async (t) => {
  fakeApi(t, {
    'GET /api/v1/staff/me': [200, analyst],
    [runsRoute]: [200, [newer]],
    'GET /api/v1/eval/runs/run_02/cases': [
      200,
      [
        { case_id: 'g_017', verdict: 'false' },
        { case_id: 'g_018', verdict: null },
      ],
    ],
  })
  await openEval()
  const toggle = await screen.findByRole('button', {
    name: (name) => name.includes(pl.evaluation.golden_set),
  })
  assert.equal(toggle.getAttribute('aria-expanded'), 'false')
  fireEvent.click(toggle)
  assert.ok(await screen.findByText('g_017'))
  assert.equal(toggle.getAttribute('aria-expanded'), 'true')
  assert.ok(screen.getByText(pl.verdict.false))
  assert.ok(screen.getByText(pl.status.technical_failure))
})

const comparison = {
  metrics: { macro_f1: { a: 0.68, b: 0.71 }, latency_median_s: { a: 14.2, b: 12.4 } },
  changed_cases: [{ case_id: 'g_042', a: 'insufficient_evidence', b: 'confirmed' }],
}

test('two finished runs compare earlier to later, with the cases that changed', async (t) => {
  const fetch = fakeApi(t, {
    'GET /api/v1/staff/me': [200, analyst],
    [runsRoute]: [200, [newer, older, running]],
    'GET /api/v1/eval/runs/compare?a=run_01&b=run_02': [200, comparison],
  })
  await openEval()
  const compare = await screen.findByRole('button', { name: pl.evaluation.compare })
  const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
  assert.deepEqual(
    boxes.map((box) => box.disabled),
    [false, false, true],
  )
  assert.equal((compare as HTMLButtonElement).disabled, true)
  fireEvent.click(boxes[0] as HTMLElement)
  fireEvent.click(boxes[1] as HTMLElement)
  fireEvent.click(compare)
  const result = await screen.findByRole('region', { name: pl.evaluation.compare })
  const f1 = within(result).getByText(pl.method.metrics.names.macro_f1).nextElementSibling
  assert.equal(f1?.textContent, '0,680,71(+0,03)')
  const latency = within(result).getByText(pl.method.metrics.names.latency_median_s)
  assert.ok(latency.nextElementSibling?.textContent?.endsWith('(−1,8)'))
  assert.ok(within(result).getByRole('heading', { name: pl.evaluation.changed_cases }))
  assert.ok(within(result).getByText('g_042'))
  assert.ok(within(result).getByText(pl.verdict.confirmed))
  assert.ok(calls(fetch).includes('GET /api/v1/eval/runs/compare?a=run_01&b=run_02'))
})

test('a moderator sees neither runs nor the run button, and runs are never read', async (t) => {
  const fetch = fakeApi(t, {
    'GET /api/v1/staff/me': [200, { email: 'moderator@example.org', role: 'moderator' }],
  })
  await openEval()
  assert.ok(await screen.findByRole('navigation'))
  assert.equal(screen.queryAllByRole('region', { name: pl.evaluation.runs }).length, 0)
  assert.equal(screen.queryAllByRole('button', { name: pl.evaluation.new_run }).length, 0)
  assert.equal(calls(fetch).includes(runsRoute), false)
})

test('the read-only jury sees runs and comparison but cannot run or upload', async (t) => {
  fakeApi(t, { 'GET /api/v1/staff/me': [200, jury], [runsRoute]: [200, [newer, older]] })
  await openEval()
  assert.ok(await screen.findByRole('region', { name: pl.evaluation.runs }))
  assert.ok(screen.getByText(pl.jury.read_only))
  assert.ok(screen.getByRole('button', { name: pl.evaluation.compare }))
  assert.equal(screen.queryAllByRole('button', { name: pl.evaluation.new_run }).length, 0)
  assert.equal(screen.queryAllByLabelText(pl.evaluation.upload).length, 0)
})

test('a session that ended shows the sign-in page instead of runs', async (t) => {
  fakeApi(t, { 'GET /api/v1/staff/me': [200, analyst], [runsRoute]: [401, {}] })
  await openEval()
  assert.ok(await screen.findByText(pl.staff.sign_in.session_expired))
  assert.equal(screen.queryAllByRole('region', { name: pl.evaluation.runs }).length, 0)
})
