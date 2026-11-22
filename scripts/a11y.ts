/**
 * Local accessibility audit (meritum-frontend#34), never run in CI: opens every page in
 * headless Chromium in light and dark mode, runs axe for WCAG 2.0-2.2 A and AA and exits
 * non-zero on any violation. The result page gets a stubbed check from the contract
 * examples, so it needs no running worker.
 *
 * Usage: pnpm a11y [base-url]   (default http://localhost:5173, e.g. after `pnpm dev`)
 *
 * @feature F-01
 */
import AxeBuilder from '@axe-core/playwright'
import { type BrowserContext, chromium } from 'playwright'
import examples from '../src/contracts/examples.json' with { type: 'json' }

const base = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '')
const pages = [
  '/',
  '/jak-dziala',
  '/sprawdzenie/c_01',
  '/panel',
  '/panel/eval',
  '/panel/administracja',
  '/prywatnosc',
  '/prywatnosc/sms',
  '/prywatnosc/discord',
  '/prywatnosc/wtyczka',
]
const status = { ...examples.AnalysisStatus, result: examples['CheckResult.done'] }
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const out = (line: string) => process.stdout.write(`${line}\n`)

/** Runs axe on one page and prints its violations; returns how many there were. */
async function audit(context: BrowserContext, colorScheme: string, path: string) {
  const page = await context.newPage()
  await page.goto(base + path, { waitUntil: 'load' })
  // the app keeps SSE streams open, so wait for the first render instead of network idle
  await page.waitForTimeout(1500)
  const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze()
  for (const v of violations) {
    const targets = v.nodes.map((n) => n.target.join(' ')).slice(0, 3)
    out(`${colorScheme} ${path} [${v.impact}] ${v.id}: ${v.help}\n  ${targets.join('\n  ')}`)
  }
  if (violations.length === 0) {
    out(`${colorScheme} ${path}: ok`)
  }
  await page.close()
  return violations.length
}

const browser = await chromium.launch({ headless: true })
let failures = 0
for (const colorScheme of ['light', 'dark'] as const) {
  // biome-ignore lint/performance/noAwaitInLoops: one browser context at a time keeps the output in order
  const context = await browser.newContext({ colorScheme, locale: 'pl-PL' })
  await context.route('**/api/v1/checks/c_01', (route) => route.fulfill({ json: status }))
  await context.route('**/api/v1/checks/c_01/events', (route) => route.abort())
  for (const path of pages) {
    // biome-ignore lint/performance/noAwaitInLoops: pages are audited one by one on purpose
    failures += await audit(context, colorScheme, path)
  }
  await context.close()
}
await browser.close()
process.exitCode = failures === 0 ? 0 : 1
