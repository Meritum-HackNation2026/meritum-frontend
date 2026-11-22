/**
 * Icon motion in clickable elements (frontend#141, DESIGN_SYSTEM.md 9), read from the rules in
 * src/index.css because happy-dom runs no transitions: an icon grows a little on hover and keyboard
 * focus, arrows and chevrons move the way they lead, a pressed icon dips; only transform and
 * opacity, at most 200 ms on the Meritum curve, hover only where the device can hover, and nothing
 * moves under reduced motion.
 *
 * @feature US-DST-01, F-01
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { render } from '@testing-library/react'
import { ArrowRightIcon, ChevronDownIcon, ChevronRightIcon, ChevronUpIcon } from 'lucide-react'

const css = readFileSync('src/index.css', 'utf8')

/** The body of the first block whose header is exactly `header` (braces matched). */
function block(source: string, header: string) {
  const start = source.indexOf(`${header} {`)
  assert.ok(start >= 0, `no block ${header}`)
  let depth = 0
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++
    if (source[i] === '}' && --depth === 0) return source.slice(source.indexOf('{', start) + 1, i)
  }
  assert.fail(`unclosed block ${header}`)
}

const motion = block(css, '@media (prefers-reduced-motion: no-preference)')
const hover = block(motion, '@media (hover: hover) and (pointer: fine)')
const outsideMotion = css.replace(motion, '')
const movement = /^\s*(transform|scale|rotate|translate)\s*:/m
const hoverSelector = /:hover/
const transitionProps = /transition-property:\s*([^;]+);/g
const durations = /transition-duration:\s*(\d+)ms/g
const curve = /transition-timing-function:\s*var\(--ease-out-meritum\)/
const enlarge = /:hover svg \{\s*transform: scale\(1\.0\d\);/
const focusEnlarge = /:focus-visible svg \{\s*transform: scale\(1\.0\d\);/
const press = /:active svg \{\s*transform: scale\(0\.82\);/
const forward =
  /:hover :is\(\.lucide-arrow-right, \.lucide-chevron-right\) \{\s*transform: translateX\(3px\);/
const down = /:hover \.lucide-chevron-down \{\s*transform: translateY\(2px\);/
const up = /:hover \.lucide-chevron-up \{\s*transform: translateY\(-2px\);/
const reduce = block(css, '@media (prefers-reduced-motion: reduce)')
const noFade = /transition:\s*none/

test('every icon movement sits inside prefers-reduced-motion: no-preference', () => {
  assert.doesNotMatch(outsideMotion, movement, 'a transform outside the motion block')
  assert.match(reduce, noFade, 'under reduced motion the colour changes at once')
})

test('hover moves icons only on devices that can hover, so a tap leaves nothing behind', () => {
  assert.doesNotMatch(motion.replace(hover, ''), hoverSelector)
  assert.doesNotMatch(outsideMotion, hoverSelector)
  assert.match(hover, enlarge)
})

test('icons grow on hover and focus, arrows and chevrons move the way they lead, a press dips', () => {
  assert.match(motion, focusEnlarge)
  assert.match(motion, press)
  assert.match(hover, forward)
  assert.match(hover, down)
  assert.match(hover, up)
})

test('only transform and opacity, at most 200 ms, on --ease-out-meritum', () => {
  for (const [, props] of motion.matchAll(transitionProps)) {
    for (const prop of (props ?? '').split(',')) {
      assert.ok(['transform', 'scale', 'opacity'].includes(prop.trim()), `transitions ${prop}`)
    }
  }
  const values = [...motion.matchAll(durations)].map(([, ms]) => Number(ms))
  assert.ok(values.length > 0)
  assert.ok(
    values.every((ms) => ms <= 200),
    `durations ${values.join(', ')}`,
  )
  assert.match(motion, curve)
})

test('lucide names the directional icons the way the rules expect', () => {
  const { container } = render(
    <>
      <ArrowRightIcon />
      <ChevronRightIcon />
      <ChevronDownIcon />
      <ChevronUpIcon />
    </>,
  )
  const classes = [...container.querySelectorAll('svg')].map((svg) => svg.getAttribute('class'))
  for (const [i, name] of [
    'arrow-right',
    'chevron-right',
    'chevron-down',
    'chevron-up',
  ].entries()) {
    assert.match(classes[i] ?? '', new RegExp(`\\blucide-${name}\\b`))
  }
})
