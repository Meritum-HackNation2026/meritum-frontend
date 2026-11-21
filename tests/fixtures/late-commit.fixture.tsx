/**
 * Run only by tests/setup-dom.test.ts in a child `node --test`: its last test ends inside a
 * React commit that happened outside `act`, so React still has a passive-effects task queued
 * when the file's teardown unregisters happy-dom.
 *
 * @feature none (infrastructure)
 */
import { test } from 'node:test'
import { render } from '@testing-library/react'
import { useEffect, useLayoutEffect, useState } from 'react'

let committed: () => void = () => undefined
const done = new Promise<void>((resolve) => {
  committed = resolve
})

function Late() {
  const [text, setText] = useState('waiting')
  useEffect(() => {
    setTimeout(() => setText('done'), 0)
  }, [])
  useLayoutEffect(() => {
    if (text === 'done') committed()
  }, [text])
  return <p>{text}</p>
}

test('a state update outside act commits as the last thing in the file', async () => {
  render(<Late />)
  await done
})
