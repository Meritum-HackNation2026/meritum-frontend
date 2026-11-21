/**
 * The notifications adapter of `src/api` behind a fake `EventSource` and mocked timers: a stream
 * that keeps failing (no worker, a 404 or 502 behind a proxy) is retried with a growing pause
 * and then left closed, instead of a reconnect every few seconds forever.
 *
 * @feature US-POW-01, F-26
 */
import assert from 'node:assert/strict'
import { afterEach, beforeEach, type TestContext, test } from 'node:test'
import { apiNotifications } from '@/api'

/** Stands in for the browser EventSource; `fail` is what the browser does on a lost stream. */
class FakeEventSource {
  static opened: FakeEventSource[] = []
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: (() => void) | null = null
  closed = false
  constructor() {
    FakeEventSource.opened.push(this)
  }
  close() {
    this.closed = true
  }
  fail() {
    this.onerror?.()
  }
  emit(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }))
  }
}

const last = () => FakeEventSource.opened.at(-1) as FakeEventSource

beforeEach(() => {
  FakeEventSource.opened = []
  Object.assign(globalThis, { EventSource: FakeEventSource })
})

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'EventSource')
})

function failAndWait(t: TestContext, ms: number) {
  last().fail()
  t.mock.timers.tick(ms)
}

test('a failed stream is closed at once and opened again only after a pause that doubles', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  apiNotifications.subscribe(() => undefined)
  last().fail()
  assert.equal(last().closed, true)
  t.mock.timers.tick(999)
  assert.equal(FakeEventSource.opened.length, 1)
  t.mock.timers.tick(1)
  assert.equal(FakeEventSource.opened.length, 2)
  failAndWait(t, 1999)
  assert.equal(FakeEventSource.opened.length, 2)
  t.mock.timers.tick(1)
  assert.equal(FakeEventSource.opened.length, 3)
})

test('after five failures in a row the stream stays closed', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  apiNotifications.subscribe(() => undefined)
  for (const pause of [1000, 2000, 4000, 8000, 16_000]) {
    failAndWait(t, pause)
  }
  assert.equal(FakeEventSource.opened.length, 5)
  t.mock.timers.tick(60 * 60 * 1000)
  assert.equal(FakeEventSource.opened.length, 5)
  assert.equal(last().closed, true)
})

test('a delivered event starts the count again', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const events: unknown[] = []
  apiNotifications.subscribe((value: unknown) => events.push(value))
  failAndWait(t, 1000)
  failAndWait(t, 2000)
  last().emit({ id: 'n_1' })
  failAndWait(t, 1000)
  assert.equal(FakeEventSource.opened.length, 4)
  assert.deepEqual(events, [{ id: 'n_1' }])
})

test('closing the subscription cancels a planned reconnect', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const close = apiNotifications.subscribe(() => undefined)
  last().fail()
  close()
  t.mock.timers.tick(60_000)
  assert.equal(FakeEventSource.opened.length, 1)
})
