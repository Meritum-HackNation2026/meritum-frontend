/**
 * The evaluation page at /panel/eval on a fake API: comparing two runs and reading a running
 * run again until it ends.
 *
 * @feature US-OBS-06, F-28
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fireEvent, screen, within } from '@testing-library/react'
import pl from '@/copy/pl.json'
import {
  analyst,
  calls,
  comparison,
  fakeApi,
  jury,
  newer,
  older,
  openEval,
  running,
  runsRoute,
} from './eval-api'

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
test('a running run is read again until it ends and shows its metrics', async (t) => {
  let finished = false
  fakeApi(t, {
    'GET /api/v1/staff/me': [200, analyst],
    [runsRoute]: () => [200, [finished ? { ...newer, id: 'run_03' } : running]],
  })
  // catch only the page's 5 s poll; the router and waitFor keep their own intervals
  const realSetInterval = globalThis.setInterval
  let poll: (() => void) | undefined
  t.mock.method(globalThis, 'setInterval', ((callback: () => void, ms?: number) => {
    if (ms === 5000) {
      poll = callback
      return 0
    }
    return realSetInterval(callback, ms)
  }) as typeof setInterval)
  await openEval()
  const runs = await screen.findByRole('region', { name: pl.evaluation.runs })
  assert.ok(within(runs).getByText(pl.evaluation.status.running))
  finished = true
  poll?.()
  assert.ok(await within(runs).findByText(pl.evaluation.status.done))
  assert.ok(within(runs).getByText(pl.method.metrics.names.macro_f1))
})
test('the jury compares two runs; a new pick drops the old comparison', async (t) => {
  fakeApi(t, {
    'GET /api/v1/staff/me': [200, jury],
    [runsRoute]: [200, [newer, older, { ...older, id: 'run_00' }]],
    'GET /api/v1/eval/runs/compare?a=run_01&b=run_02': [200, comparison],
  })
  await openEval()
  const compare = await screen.findByRole('button', { name: pl.evaluation.compare })
  const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
  fireEvent.click(boxes[0] as HTMLElement)
  fireEvent.click(boxes[1] as HTMLElement)
  fireEvent.click(compare)
  assert.ok(await screen.findByRole('region', { name: pl.evaluation.compare }))
  fireEvent.click(boxes[2] as HTMLElement)
  assert.deepEqual(
    boxes.map((box) => box.checked),
    [false, true, true],
  )
  assert.equal(screen.queryAllByRole('region', { name: pl.evaluation.compare }).length, 0)
})
