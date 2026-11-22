/**
 * src/index.css loads the design-system tokens in the order tokens/display.css asks for
 * (display.css after meritum.css), sets the interface in self-hosted Schibsted Grotesk and
 * keeps Archivo for the logotype only, with no request to Google Fonts.
 *
 * @feature F-01
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const css = readFileSync('src/index.css', 'utf8')
const schibstedImport = /@import "@fontsource-variable\/schibsted-grotesk[^"]*";/
const archivoImport = /@import "@fontsource-variable\/archivo[^"]*";/
const googleFonts = /fonts\.(googleapis|gstatic)\.com/
const startsWithSchibsted = /^"Schibsted Grotesk Variable"/
const startsWithArchivo = /^"Archivo Variable"/
const archivo = /Archivo/
const fontVar = (name: string) => new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1] ?? ''

test('index.css imports display.css after meritum.css', () => {
  const tokens = css.indexOf('@import "./styles/meritum.css";')
  const display = css.indexOf('@import "./styles/display.css";')
  assert.ok(tokens >= 0, 'meritum.css is not imported')
  assert.ok(display > tokens, 'display.css must be imported after meritum.css')
})

test('the interface is set in Schibsted Grotesk self-hosted through Fontsource', () => {
  assert.match(css, schibstedImport)
  assert.match(fontVar('font-sans'), startsWithSchibsted)
  assert.doesNotMatch(css, googleFonts)
})

test('Archivo is loaded for the logotype only', () => {
  assert.match(css, archivoImport)
  assert.match(fontVar('font-logo'), startsWithArchivo)
  assert.doesNotMatch(fontVar('font-sans'), archivo)
})
