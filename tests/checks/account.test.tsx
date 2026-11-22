/**
 * The check page with a citizen account (a fake port): both history modes, deleting the history
 * and the account, and a check without signing in.
 *
 * @feature US-SPR-10, US-BEZ-05, F-31
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import {
  apiAudioUploader,
  apiCheckSender,
  apiHandoff,
  apiImageUploader,
  apiResultReader,
  apiSessionEraser,
} from '@/api'
import { CheckPage, type CitizenAccount, type ProgressSource, type SessionEraser } from '@/checks'
import pl from '@/copy/pl.json'

// the page reads the history's results over SSE; this fake stream never speaks
const quietProgress: ProgressSource = { watch: () => () => undefined }

const noop = () => undefined
const googleLogin = /^\/login\/google/

const delay = () => new Promise((resolve) => setTimeout(resolve, 0))

function fakeAccount(signedIn: boolean, deleted: string[] = [], isDemo = false): CitizenAccount {
  const eraser = (name: string): SessionEraser => ({
    erase: () => {
      deleted.push(name)
      return Promise.resolve(true)
    },
  })
  return {
    session: () =>
      Promise.resolve(signedIn ? { email: isDemo ? null : 'ola@example.com', isDemo } : null),
    history: () =>
      Promise.resolve([
        { checkId: 'c_phone', at: '2026-11-22T10:00:00Z', question: 'Pytanie z telefonu' },
      ]),
    loginUrl: (provider, returnTo) => `/login/${provider}?return_to=${returnTo}`,
    signOut: () => {
      deleted.push('signOut')
      return Promise.resolve(true)
    },
    historyEraser: eraser('history'),
    accountEraser: eraser('account'),
  }
}

function renderPage(account: CitizenAccount) {
  render(
    <CheckPage
      sender={apiCheckSender}
      uploader={apiAudioUploader}
      imageUploader={apiImageUploader}
      eraser={apiSessionEraser}
      reader={apiResultReader}
      progress={quietProgress}
      handoff={apiHandoff}
      account={account}
      onAccepted={noop}
    />,
  )
}

test('signed out: both sign-in links lead to the provider, no history from the server', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.resolve(new Response('{}', { status: 404 })))
  renderPage(fakeAccount(false))
  const google = await screen.findByRole('link', { name: pl.account.sign_in_google })
  assert.match(google.getAttribute('href') ?? '', googleLogin)
  assert.ok(screen.getByRole('link', { name: pl.account.sign_in_microsoft }))
  assert.equal(screen.queryByText('Pytanie z telefonu'), null)
  assert.ok(screen.getByText(pl.history.session_note))
})

test('signed in: the server history shows the question from another device', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.resolve(new Response('{}', { status: 404 })))
  renderPage(fakeAccount(true))
  assert.ok(await screen.findByText('Pytanie z telefonu'))
  assert.ok(screen.getByText(pl.history.account_note))
  assert.ok(screen.getByText(pl.account.signed_in_as.replace('{email}', 'ola@example.com')))
  assert.equal(screen.queryByRole('link', { name: pl.account.sign_in_google }), null)
})

test('signed in: „Usuń moją historię” asks first, then deletes the account history', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.resolve(new Response('{}', { status: 404 })))
  const deleted: string[] = []
  renderPage(fakeAccount(true, deleted))
  await screen.findByText('Pytanie z telefonu')
  fireEvent.click(screen.getByRole('button', { name: pl.history.delete }))
  assert.deepEqual(deleted, [])
  fireEvent.click(screen.getByRole('button', { name: pl.form.delete_session_yes }))
  await waitFor(() => assert.deepEqual(deleted, ['history']))
  await waitFor(() => assert.equal(screen.queryByText('Pytanie z telefonu'), null))
})

test('signed in: „Usuń konto i historię” deletes the account and signs the page out', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.resolve(new Response('{}', { status: 404 })))
  const deleted: string[] = []
  renderPage(fakeAccount(true, deleted))
  await screen.findByText('Pytanie z telefonu')
  fireEvent.click(screen.getByRole('button', { name: pl.account.delete_account }))
  const dialog = await screen.findByRole('alertdialog', { name: pl.account.delete_account_title })
  assert.ok(within(dialog).getByText(pl.account.delete_account_text))
  fireEvent.click(within(dialog).getByRole('button', { name: pl.account.delete_account_yes }))
  await waitFor(() => assert.deepEqual(deleted, ['account']))
  assert.ok(await screen.findByRole('link', { name: pl.account.sign_in_google }))
})

test('signed in: „Wyloguj się” signs out and keeps the history on the account', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.resolve(new Response('{}', { status: 404 })))
  const deleted: string[] = []
  renderPage(fakeAccount(true, deleted))
  await screen.findByText('Pytanie z telefonu')
  fireEvent.click(screen.getByRole('button', { name: pl.account.sign_out }))
  await waitFor(() => assert.deepEqual(deleted, ['signOut']))
  assert.ok(await screen.findByRole('link', { name: pl.account.sign_in_google }))
  assert.ok(screen.getByText(pl.account.signed_out))
  await delay()
})

test('without an account port the page works as before, with no sign-in', () => {
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
    />,
  )
  assert.equal(screen.queryByRole('link', { name: pl.account.sign_in_google }), null)
})

test('a demo account sees its own note, not the one about Google and Microsoft data', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.resolve(new Response('{}', { status: 404 })))
  renderPage(fakeAccount(true, [], true))
  assert.ok(await screen.findByText(pl.account.stored_demo))
  assert.equal(screen.queryByText(pl.account.stored), null)
})

test('a signed-in citizen keeps the note about the data from the provider', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.resolve(new Response('{}', { status: 404 })))
  renderPage(fakeAccount(true))
  assert.ok(await screen.findByText(pl.account.stored))
})
