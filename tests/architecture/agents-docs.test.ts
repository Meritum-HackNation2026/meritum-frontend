import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const agents = readFileSync('AGENTS.md', 'utf8')
const importLine = /^@AGENTS\.md$/m

test('CLAUDE.md imports AGENTS.md', () => {
  assert.match(readFileSync('CLAUDE.md', 'utf8'), importLine)
})

test('AGENTS.md keeps the rule groups issue #52 asks for', () => {
  const required = [
    'meritum-monorepo',
    'meritum-ui',
    'shadcnblocks',
    'src/copy/pl.json',
    'UI tasks go to Claude',
    'frontend-design',
    'design-taste-frontend',
    'emil-design-eng',
    'animate',
    'review-animations',
    'impeccable',
    'npx skills add',
    'List every mandatory',
  ]
  assert.deepEqual(
    required.filter((rule) => !agents.includes(rule)),
    [],
  )
})
