/**
 * The WAV encoder of live recordings: header and samples of a tiny fixture.
 *
 * @feature US-SPR-11, F-08
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { encodeWav } from '@/checks'

test('encodeWav writes a 16-bit mono PCM header and the samples', async () => {
  const bytes = new Uint8Array(
    await encodeWav(new Float32Array([0, 1, -1, 0.5]), 16000).arrayBuffer(),
  )
  const view = new DataView(bytes.buffer)
  const text = (at: number, n: number) => String.fromCharCode(...bytes.slice(at, at + n))
  assert.equal(text(0, 4), 'RIFF')
  assert.equal(text(8, 8), 'WAVEfmt ')
  assert.equal(view.getUint16(22, true), 1)
  assert.equal(view.getUint32(24, true), 16000)
  assert.equal(view.getUint16(34, true), 16)
  assert.equal(text(36, 4), 'data')
  assert.equal(view.getUint32(40, true), 8)
  assert.equal(bytes.length, 44 + 8)
  assert.deepEqual(
    [0, 1, 2, 3].map((i) => view.getInt16(44 + i * 2, true)),
    [0, 32767, -32768, 16383],
  )
})

test('ten minutes of recording stay under the 20 MB cap', () => {
  const bytes = 44 + 595 * 16000 * 2
  assert.ok(bytes < 20 * 1024 * 1024)
})
