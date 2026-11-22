import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const agents = readFileSync('AGENTS.md', 'utf8')
const importLine = /^@AGENTS\.md$/m
const otherRegistry = /@reui|@originui/

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

test('AGENTS.md lists the component sources in order', () => {
  const order = ['src/components/meritum/', 'shadcn/ui', '@shadcnblocks/']
  const line = agents.split('\n').find((l) => l.includes('Kolejność źródeł komponentów')) ?? ''
  const at = order.map((s) => line.indexOf(s))
  assert.ok(
    at.every((i) => i >= 0),
    `missing source in: ${line}`,
  )
  assert.deepEqual(
    at,
    [...at].sort((a, b) => a - b),
  )
  assert.ok(!otherRegistry.test(line), `other registries in: ${line}`)
})

test('components.json names only the shadcnblocks registry', () => {
  const config = JSON.parse(readFileSync('components.json', 'utf8'))
  assert.deepEqual(Object.keys(config.registries), ['@shadcnblocks'])
})
