/**
 * The copies from meritum-design-system and meritum-core match SHA256SUMS, so a hand
 * edit fails CI with the file name. Refresh the copies with `pnpm sync`, never by hand.
 *
 * @feature F-30, ADR-02, ADR-33
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

const sumLine = /^([0-9a-f]{64}) {2}(.+)$/
const sourceLine = /^meritum-(design-system|core) [0-9a-f]{40}$/
const fix = 'run pnpm sync instead of editing it'
// Folders that hold only synced files; anything else added there is a hand edit.
const syncedDirs = ['src/contracts/', 'src/copy/', 'src/components/meritum/', 'src/styles/']

const sums = readFileSync('SHA256SUMS', 'utf8')
  .trim()
  .split('\n')
  .map((line) => {
    const [, sum, file] = sumLine.exec(line) ?? []
    assert.ok(sum && file, `bad SHA256SUMS line: ${line}`)
    return { sum, file }
  })

test('every synced copy matches its SHA256SUMS line', () => {
  const changed = sums.flatMap(({ sum, file }) => {
    if (!existsSync(file)) {
      return [`${file}: missing; ${fix}`]
    }
    const actual = createHash('sha256').update(readFileSync(file)).digest('hex')
    return actual === sum ? [] : [`${file}: ${fix}`]
  })
  assert.deepEqual(changed, [])
})

test('synced folders hold no files outside SHA256SUMS', () => {
  const listed = new Set(sums.map(({ file }) => file))
  const extra = syncedDirs
    .flatMap((dir) => readdirSync(dir).map((name) => `${dir}${name}`))
    .filter((file) => !listed.has(file))
  assert.deepEqual(
    extra.map((file) => `${file}: not a synced file; add it to the design system, then ${fix}`),
    [],
  )
})

test('SOURCE names the source commits of the copies', () => {
  const lines = readFileSync('SOURCE', 'utf8').trim().split('\n')
  assert.deepEqual(
    lines.filter((line) => !sourceLine.test(line)),
    [],
  )
  assert.ok(lines.some((line) => line.startsWith('meritum-design-system ')))
})
