/**
 * The evaluation page at /panel/eval on a fake API: the runs with their metrics, a new run on
 * the golden set, an uploaded case file and who may see what.
 *
 * @feature US-OBS-06, US-OBS-05, F-28
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import pl from '@/copy/pl.json'
import { requestPath } from '../fetch-request'
import {
  type Answer,
  analyst,
  calls,
  fakeApi,
  jury,
  newer,
  older,
  openEval,
  running,
  runsRoute,
} from './eval-api'

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
