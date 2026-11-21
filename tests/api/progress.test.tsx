/**
 * The SSE progress adapter: GET /api/v1/checks/{id}/events through a fake `EventSource`.
 *
 * @feature US-SPR-02, F-09
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { apiCheckSender, apiProgressSource } from '@/api'
import examples from '@/contracts/examples.json'
import type { AnalysisStatus } from '@/contracts/meritum'

class FakeEventSource {
  static last: FakeEventSource | undefined
  readonly url: string
  closed = false
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: (() => void) | null = null

  constructor(url: string) {
    this.url = url
    FakeEventSource.last = this
  }

  close() {
    this.closed = true
  }
}

function fakeEventSource(t: TestContext): () => FakeEventSource {
  const original = globalThis.EventSource
  globalThis.EventSource = FakeEventSource as unknown as typeof EventSource
  t.after(() => {
    globalThis.EventSource = original
  })
  return () => {
    assert.ok(FakeEventSource.last)
    return FakeEventSource.last
  }
}

function watch(id: string) {
  const statuses: AnalysisStatus[] = []
  let closed = 0
  const stop = apiProgressSource.watch(
    id,
    (status) => statuses.push(status),
    () => {
      closed += 1
    },
  )
  return { statuses, stop, closed: () => closed }
}

test('watching a check opens its events endpoint and passes each AnalysisStatus on', (t) => {
  const source = fakeEventSource(t)
  const { statuses } = watch('c_01')
  assert.equal(source().url, '/api/v1/checks/c_01/events')
  source().onmessage?.(
    new MessageEvent('message', { data: JSON.stringify(examples.AnalysisStatus) }),
  )
  assert.deepEqual(statuses, [examples.AnalysisStatus])
})

test('the check id is escaped in the path', (t) => {
  const source = fakeEventSource(t)
  watch('a/b?c')
  assert.equal(source().url, '/api/v1/checks/a%2Fb%3Fc/events')
})

test('an event that is not an AnalysisStatus is ignored', (t) => {
  const source = fakeEventSource(t)
  const { statuses } = watch('c_01')
  source().onmessage?.(new MessageEvent('message', { data: 'not json' }))
  source().onmessage?.(new MessageEvent('message', { data: '{"steps":"x"}' }))
  for (const step of [{ code: 'hack', status: 'done' }, { code: 'receive', status: 'odd' }, null]) {
    const data = JSON.stringify({ check_id: 'c_01', steps: [step] })
    source().onmessage?.(new MessageEvent('message', { data }))
  }
  assert.deepEqual(statuses, [])
})

test('the end of the stream or a broken connection closes it once, without reconnecting', (t) => {
  const source = fakeEventSource(t)
  const { closed } = watch('c_01')
  source().onerror?.()
  source().onerror?.()
  assert.equal(source().closed, true)
  assert.equal(closed(), 1)
})

test('stopping the watch closes the connection and reports nothing more', (t) => {
  const source = fakeEventSource(t)
  const { statuses, stop, closed } = watch('c_01')
  stop()
  source().onmessage?.(
    new MessageEvent('message', { data: JSON.stringify(examples.AnalysisStatus) }),
  )
  source().onerror?.()
  assert.equal(source().closed, true)
  assert.deepEqual(statuses, [])
  assert.equal(closed(), 0)
})

test('an accepted check returns the id from the 202 answer', async (t) => {
  t.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify({ check_id: 'c_01' }), { status: 202 })),
  )
  assert.deepEqual(await apiCheckSender.send({ channel: 'web', text: 'abc' }), { checkId: 'c_01' })
})

test('a 202 answer without a check id is treated as busy', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.resolve(new Response('{}', { status: 202 })))
  assert.equal(await apiCheckSender.send({ channel: 'web', text: 'abc' }), 'busy')
})
