import assert from 'node:assert/strict'
import { test } from 'node:test'
import { render, screen } from '@testing-library/react'
import { MeritumLabel } from '@/components/meritum/meritum-mark'
import { Button } from '@/components/ui/button'
import pl from '@/copy/pl.json'

test('the Meritum label shows its name as text and hides the mark from screen readers', () => {
  render(<MeritumLabel />)
  const mark = screen.getByText(pl.brand.name).querySelector('svg')
  assert.equal(mark?.getAttribute('aria-hidden'), 'true')
})

test('a button holding the Meritum label is named by the label text', () => {
  render(
    <Button>
      <MeritumLabel />
    </Button>,
  )
  assert.equal(screen.getAllByRole('button', { name: pl.brand.name }).length, 1)
})
