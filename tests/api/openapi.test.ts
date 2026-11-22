/**
 * The API types come from the saved meritum-backend schema, without a running backend: CI
 * fails when src/api/_openapi.gen.ts was edited by hand or not regenerated after
 * src/api/openapi.json changed (`pnpm openapi --types-only`).
 *
 * @feature none (infrastructure)
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

test('the generated API types match the saved OpenAPI schema', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'openapi-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const output = join(dir, 'openapi.gen.ts')
  // The CLI through node, not `pnpm exec`: on Windows pnpm is a .cmd that spawnSync cannot
  // start without a shell (meritum-frontend#88).
  const cli = 'node_modules/openapi-typescript/bin/cli.js'
  const run = spawnSync(process.execPath, [cli, 'src/api/openapi.json', '-o', output], {
    encoding: 'utf8',
  })
  assert.equal(run.status, 0, run.stderr)
  const message = 'src/api/_openapi.gen.ts is stale: run pnpm openapi --types-only'
  assert.equal(
    readFileSync('src/api/_openapi.gen.ts', 'utf8'),
    readFileSync(output, 'utf8'),
    message,
  )
})
