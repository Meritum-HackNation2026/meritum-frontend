/**
 * Design tokens only (meritum-ui rule 1): app code under src/ uses colours, radii and
 * spacing from the design-system tokens, never hex values or arbitrary Tailwind values.
 * The token file and the copies synced from the design system are excluded.
 *
 * @feature F-01
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { read, sourceFiles } from './architecture/source.ts'

const hexColour = /#[0-9a-fA-F]{3,8}\b/
const arbitraryValue = /(?<![\w-])[a-z][\w:-]*-\[[^\]\s]+\](?!:)/
const inApp = (file: string) => file.startsWith('src/')

test('app code has no hex colours or arbitrary Tailwind values', () => {
  const problems = sourceFiles()
    .filter(inApp)
    .flatMap((file) =>
      read(file)
        .split('\n')
        .flatMap((line, i) => {
          const found = line.match(hexColour) ?? line.match(arbitraryValue)
          return found ? [`${file}:${i + 1}: ${found[0]} is not a design token`] : []
        }),
    )
  assert.deepEqual(problems, [])
})
