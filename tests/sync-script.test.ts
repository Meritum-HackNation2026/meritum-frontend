/**
 * scripts/sync.sh run offline against a fake `gh`: it keeps file names with spaces
 * whole, copies the core catalogue once it exists, and leaves the copies untouched
 * when a call fails.
 *
 * @feature F-30, ADR-33
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'

const sha = 'a'.repeat(40)
const sumLine = /^[0-9a-f]{64} {2}(.+)$/
const ds = 'repos/Meritum-HackNation2026/meritum-design-system/contents'
// Answers the gh calls of sync.sh; FAKE_CATALOG (ok | 404 | 500) and FAKE_LIST (fail)
// pick the outcome of the catalogue download and the component listing.
const fakeGh = `#!/usr/bin/env bash
case "$*" in
  *commits/*) echo ${sha} ;;
  *"components/meritum?ref="*)
    [ "\${FAKE_LIST:-}" = fail ] && { echo 'gh: HTTP 401' >&2; exit 1; }
    printf 'index.ts\\nwith space.tsx\\n' ;;
  *catalog/catalog.json*)
    [ "\${FAKE_CATALOG:-404}" = ok ] && { echo '{}'; exit 0; }
    echo "gh: Not Found (HTTP \${FAKE_CATALOG:-404})" >&2; exit 1 ;;
  *) printf 'copy of %s\\n' "\${@: -1}" ;;
esac
`
const dirs: string[] = []
after(() => {
  for (const dir of dirs) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function runSync(env: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'meritum-sync-'))
  dirs.push(dir)
  mkdirSync(join(dir, 'scripts'))
  mkdirSync(join(dir, 'bin'))
  mkdirSync(join(dir, 'src/copy'), { recursive: true })
  writeFileSync(join(dir, 'src/copy/pl.json'), 'old\n')
  copyFileSync('scripts/sync.sh', join(dir, 'scripts/sync.sh'))
  writeFileSync(join(dir, 'bin/gh'), fakeGh)
  chmodSync(join(dir, 'bin/gh'), 0o755)
  const path = `${join(dir, 'bin')}:${process.env['PATH']}`
  const run = spawnSync('bash', [join(dir, 'scripts/sync.sh')], {
    env: { ...process.env, ...env, PATH: path },
  })
  const read = (file: string) => readFileSync(join(dir, file), 'utf8')
  const summed = () =>
    read('SHA256SUMS')
      .trim()
      .split('\n')
      .map((line) => sumLine.exec(line)?.[1])
  return { status: run.status, read, summed, has: (file: string) => existsSync(join(dir, file)) }
}

test('pnpm sync keeps names with spaces whole and sums every copy', () => {
  const sync = runSync()
  assert.equal(sync.status, 0)
  assert.ok(sync.summed().includes('src/components/meritum/with space.tsx'))
  assert.equal(
    sync.read('src/components/meritum/with space.tsx'),
    `copy of ${ds}/components/meritum/with%20space.tsx?ref=${sha}\n`,
  )
  assert.equal(sync.read('src/copy/pl.json'), `copy of ${ds}/copy/pl.json?ref=${sha}\n`)
  assert.equal(sync.read('SOURCE'), `meritum-design-system ${sha}\n`)
  assert.equal(sync.has('src/contracts/catalog.json'), false)
})

test('pnpm sync writes SHA256SUMS lines in text mode on every platform', () => {
  const sync = runSync()
  assert.equal(sync.status, 0)
  const lines = sync.read('SHA256SUMS').trim().split('\n')
  assert.ok(lines.length > 0)
  for (const line of lines) {
    assert.match(line, sumLine)
  }
})

test('pnpm sync copies the core catalogue once it exists and names the core commit', () => {
  const sync = runSync({ FAKE_CATALOG: 'ok' })
  assert.equal(sync.status, 0)
  assert.ok(sync.summed().includes('src/contracts/catalog.json'))
  assert.equal(sync.read('SOURCE'), `meritum-design-system ${sha}\nmeritum-core ${sha}\n`)
})

test('a failed gh call stops pnpm sync and leaves the copies untouched', () => {
  for (const env of [{ FAKE_LIST: 'fail' }, { FAKE_CATALOG: '500' }]) {
    const sync = runSync(env)
    assert.notEqual(sync.status, 0)
    assert.equal(sync.read('src/copy/pl.json'), 'old\n')
    assert.equal(sync.has('SHA256SUMS'), false)
  }
})
