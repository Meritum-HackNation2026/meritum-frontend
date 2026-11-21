import assert from 'node:assert/strict'
import { test } from 'node:test'
import { render, screen } from '@testing-library/react'
import { MeritumLabel } from '@/components/meritum/meritum-mark'

test('the Meritum label names itself in text; the mark stays out of the accessibility tree', () => {
  render(<MeritumLabel />)
  assert.ok(screen.getByText('Meritum'))
  assert.equal(screen.queryAllByRole('img').length, 0)
})
