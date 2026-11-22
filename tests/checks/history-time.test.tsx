/**
 * The times in the conversation are when a check was created, never when the page showed it
 * (meritum-frontend#127): the account's `received_at`, the time this tab sent it, and no time
 * at all when neither is known.
 *
 * @feature US-SPR-09, US-SPR-10, F-01, F-31
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { render, screen, within } from '@testing-library/react'
import {
  apiAudioUploader,
  apiCheckSender,
  apiHandoff,
  apiImageUploader,
  apiResultReader,
  apiSessionEraser,
} from '@/api'
import {
  CheckPage,
  type CitizenAccount,
  type ProgressSource,
  saveCheck,
  savedChecks,
} from '@/checks'
import examples from '@/contracts/examples.json'
import type { CheckResult } from '@/contracts/meritum'
import pl from '@/copy/pl.json'

const quietProgress: ProgressSource = { watch: () => () => undefined }
const noop = () => undefined
const clock = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' })

const created = '2026-11-22T05:10:00Z'
const shown = '2026-11-22T06:32:00Z'
const result = { ...(examples['CheckResult.done'] as CheckResult), check_id: 'c_phone' }

function signedIn(): CitizenAccount {
  const eraser = { erase: () => Promise.resolve(true) }
  return {
    session: () => Promise.resolve({ email: 'ola@example.com', isDemo: false }),
    history: () =>
      Promise.resolve([{ checkId: 'c_phone', at: created, question: 'Pytanie z telefonu' }]),
    loginUrl: () => '/login',
    signOut: () => Promise.resolve(true),
    historyEraser: eraser,
    accountEraser: eraser,
  }
}

function renderPage(account?: CitizenAccount) {
  render(
    <CheckPage
      sender={apiCheckSender}
      uploader={apiAudioUploader}
      imageUploader={apiImageUploader}
      eraser={apiSessionEraser}
      reader={apiResultReader}
      progress={quietProgress}
      handoff={apiHandoff}
      onAccepted={noop}
      {...(account ? { account } : {})}
    />,
  )
}

/** The tab already showed the account's check once, at 06:32. */
function keptAt(at: string) {
  sessionStorage.setItem('meritum.history', JSON.stringify([{ at, result }]))
}

const noApi = (t: TestContext) =>
  t.mock.method(globalThis, 'fetch', () => Promise.resolve(new Response('{}', { status: 404 })))

test('godzina wpisu z konta to czas utworzenia sprawdzenia, także po ponownym otwarciu', async (t) => {
  noApi(t)
  keptAt(shown)
  renderPage(signedIn())
  assert.ok(await screen.findByText('Pytanie z telefonu'))
  const thread = screen.getByRole('list', { name: pl.conversation.label })
  const times = within(thread).queryAllByText(clock.format(new Date(created)))
  assert.ok(times.length > 0)
  assert.equal(within(thread).queryByText(clock.format(new Date(shown))) === null, true)
})

test('wpis bez znanego czasu utworzenia nie pokazuje godziny wyświetlenia', async (t) => {
  noApi(t)
  keptAt(shown)
  renderPage()
  const thread = await screen.findByRole('list', { name: pl.conversation.label })
  assert.ok(within(thread).getAllByText(pl.verdict.false).length > 0)
  // a DOM node in a failed assert makes node:test print the whole tree; compare booleans
  assert.equal(within(thread).queryByText(clock.format(new Date(shown))) === null, true)
})

test('saveCheck keeps the time of the first save when the same check is saved again', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(created) })
  saveCheck(result)
  t.mock.timers.setTime(new Date(shown).getTime())
  saveCheck(result)
  assert.equal(savedChecks()[0]?.at, new Date(created).toISOString())
})
