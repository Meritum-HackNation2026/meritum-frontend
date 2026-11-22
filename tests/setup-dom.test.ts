/**
 * tests/setup-dom.ts keeps the DOM until React's queued work has run: a file whose last test
 * ends inside a commit made outside `act` must still pass (meritum-frontend#49).
 *
 * @feature none (infrastructure)
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

const lateDomError = /window is not defined/
const childTimeoutMs = 30_000

test('a commit outside act at the end of a file does not outlive the DOM', () => {
  // Without this the child reports to this runner instead of exiting with its own status.
  const { NODE_TEST_CONTEXT: _parent, ...env } = process.env
  const run = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--import',
      './tests/setup-dom.ts',
      '--test',
      'tests/fixtures/late-commit.fixture.tsx',
    ],
    {
      encoding: 'utf8',
      env: { ...env, TSX_TSCONFIG_PATH: 'tsconfig.test.json' },
      timeout: childTimeoutMs,
    },
  )
  assert.doesNotMatch(run.stdout, lateDomError)
  assert.equal(run.status, 0, run.stdout + run.stderr)
})
