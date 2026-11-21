/**
 * scripts/sync.sh run offline against a fake `gh`: it keeps file names with spaces
 * whole and writes SOURCE and SHA256SUMS for every copy.
 *
 * @feature F-30, ADR-33
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

const sha = 'a'.repeat(40)
// Answers the three gh calls of sync.sh; core has no catalog yet (404).
const fakeGh = `#!/usr/bin/env bash
case "$*" in
  *commits/*) echo ${sha} ;;
  *"--jq .[] | select"*) printf 'index.ts\\nwith space.tsx\\n' ;;
  *catalog/catalog.json*) exit 1 ;;
  *) printf 'copy of %s\\n' "\${@: -1}" ;;
esac
`

function runSync(): string {
  const dir = mkdtempSync(join(tmpdir(), 'meritum-sync-'))
  mkdirSync(join(dir, 'scripts'))
  mkdirSync(join(dir, 'bin'))
  copyFileSync('scripts/sync.sh', join(dir, 'scripts/sync.sh'))
  writeFileSync(join(dir, 'bin/gh'), fakeGh)
  chmodSync(join(dir, 'bin/gh'), 0o755)
  const env = { ...process.env, PATH: `${join(dir, 'bin')}:${process.env['PATH']}` }
  execFileSync('bash', [join(dir, 'scripts/sync.sh')], { env, stdio: 'pipe' })
  return dir
}

test('pnpm sync keeps names with spaces whole and sums every copy', () => {
  const dir = runSync()
  const sums = readFileSync(join(dir, 'SHA256SUMS'), 'utf8')
  const files = sums
    .trim()
    .split('\n')
    .map((line) => line.slice(66))
  assert.ok(files.includes('src/components/meritum/with space.tsx'))
  assert.ok(files.includes('src/copy/pl.json'))
  assert.equal(files.length, 7)
  assert.equal(
    readFileSync(join(dir, 'src/components/meritum/with space.tsx'), 'utf8'),
    `copy of repos/Meritum-HackNation2026/meritum-design-system/contents/components/meritum/with%20space.tsx?ref=${sha}\n`,
  )
  assert.equal(readFileSync(join(dir, 'SOURCE'), 'utf8'), `meritum-design-system ${sha}\n`)
})
