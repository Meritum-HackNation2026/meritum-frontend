/**
 * The page where an asker reads the moderator's answer: text and cited sources, a notice that it
 * is not public, and own texts for no answer and a failed read.
 *
 * @feature US-MOD-07, US-POW-02, F-39
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import pl from '@/copy/pl.json'
import { AskerAnswer, type AskerAnswerReader } from '@/moderation'

const copy = pl.moderation.asker_answer
const found: AskerAnswerReader = {
  read: () =>
    Promise.resolve({
      answer: {
        text: 'Tak, to prawda.',
        citations: [{ fragment: 'tekst', source: 'Ustawa, Sejm' }],
      },
    }),
}

test('shows the answer, each cited fragment with its source, and that it is not public', async () => {
  render(<AskerAnswer caseId="#S-12" reader={found} />)
  assert.ok(await screen.findByRole('heading', { name: copy.title }))
  assert.ok(screen.getByText('Tak, to prawda.'))
  assert.ok(screen.getByText('tekst'))
  assert.ok(screen.getByText('Ustawa, Sejm'))
  assert.ok(screen.getByText(copy.note))
})

test('an unknown answer has its own text and no retry', async () => {
  render(<AskerAnswer caseId="#S-12" reader={{ read: () => Promise.resolve('not_found') }} />)
  assert.ok(await screen.findByText(copy.not_found))
  assert.equal(screen.queryByRole('button', { name: copy.retry }), null)
})

test('a failed read says so and the retry reads again', async () => {
  let calls = 0
  const reader: AskerAnswerReader = {
    read: () => (++calls === 1 ? Promise.resolve('failed') : found.read('#S-12')),
  }
  render(<AskerAnswer caseId="#S-12" reader={reader} />)
  assert.ok(await screen.findByText(copy.error))
  fireEvent.click(screen.getByRole('button', { name: copy.retry }))
  await waitFor(() => assert.ok(screen.getByText('Tak, to prawda.')))
})
