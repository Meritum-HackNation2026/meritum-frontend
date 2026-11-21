/**
 * Checking a recording through the public API of `src/checks`: the microphone button of the
 * message field, with a fake API behind `fetch` (POST /api/v1/audio, then POST /api/v1/checks).
 *
 * @feature US-SPR-11, F-08
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import {
  apiAudioUploader,
  apiCheckSender,
  apiHandoff,
  apiProgressSource,
  apiResultReader,
  apiSessionEraser,
} from '@/api'
import { CheckPage } from '@/checks'
import pl from '@/copy/pl.json'
import { requestPath, sentRequest } from '../fetch-request'

type Answer = { status: number; body: unknown }

const accepted: Answer = { status: 201, body: { audio_id: 'a_01' } }
const started: Answer = { status: 202, body: { check_id: 'c_01' } }

function rejected(status: number, key: string): Answer {
  const body = { status: 'out_of_scope', message_key: key, max_mb: 20, max_minutes: 10 }
  return { status, body }
}

function fakeApi(t: TestContext, ...answers: Answer[]) {
  let call = 0
  return t.mock.method(globalThis, 'fetch', () => {
    const answer = answers[Math.min(call++, answers.length - 1)] ?? accepted
    return Promise.resolve(new Response(JSON.stringify(answer.body), { status: answer.status }))
  })
}

function renderPage(): string[] {
  const opened: string[] = []
  const onAccepted = opened.push.bind(opened)
  render(
    <CheckPage
      sender={apiCheckSender}
      uploader={apiAudioUploader}
      eraser={apiSessionEraser}
      reader={apiResultReader}
      progress={apiProgressSource}
      handoff={apiHandoff}
      onAccepted={onAccepted}
    />,
  )
  return opened
}

function audioForm(): HTMLElement {
  return screen.getByRole('form', { name: pl.form.title })
}

function choose(file: File) {
  fireEvent.change(screen.getByLabelText(pl.conversation.attach_audio), {
    target: { files: [file] },
  })
}

function chooseAndCheck(file: File) {
  choose(file)
  fireEvent.click(within(audioForm()).getByRole('button', { name: pl.form.submit }))
}

const recording = () => new File(['ID3 nagranie'], 'wywiad.mp3', { type: 'audio/mpeg' })

test('a chosen recording says who transcribes it, where, the cost, retention and limits', () => {
  renderPage()
  choose(recording())
  const text = audioForm().textContent ?? ''
  assert.ok(text.includes(pl.form.audio_note))
  assert.ok(text.includes(pl.form.audio_transcription_warning))
  assert.ok(text.includes('Plik do 20 MB i 10 min nagrania. Formaty: OGG, MP3, M4A, WAV.'))
  assert.ok(
    text.includes('Transkrypcję robi Google Speech-to-Text v2 (Chirp 3) (GCP, multi-region eu).'),
  )
  assert.ok(text.includes(pl.form.audio_cost))
  assert.ok(text.includes('najpóźniej po 30 dniach.'))
})

test('a chosen recording takes the place of the text field until it is removed', () => {
  renderPage()
  choose(recording())
  assert.equal(screen.queryByLabelText(pl.form.input_label), null)
  assert.ok(within(audioForm()).getByText('wywiad.mp3'))
  fireEvent.click(screen.getByRole('button', { name: pl.conversation.remove_audio }))
  assert.ok(screen.getByLabelText(pl.form.input_label))
})

test('a chosen recording goes to POST /api/v1/audio, then its id to POST /api/v1/checks', async (t) => {
  const fetch = fakeApi(t, accepted, started)
  const opened = renderPage()
  const file = recording()
  chooseAndCheck(file)
  await waitFor(() => assert.deepEqual(opened, ['c_01']))
  const upload = sentRequest(fetch.mock.calls[0]?.arguments[0])
  assert.equal(requestPath(upload), '/api/v1/audio')
  assert.equal(upload.method, 'POST')
  assert.equal(upload.headers.get('Content-Type'), 'audio/mpeg')
  assert.equal(await upload.text(), 'ID3 nagranie')
  const check = sentRequest(fetch.mock.calls[1]?.arguments[0])
  assert.equal(requestPath(check), '/api/v1/checks')
  assert.deepEqual(await check.json(), { channel: 'web', audio_id: 'a_01' })
})

test('a file over 20 MB shows the size message and sends nothing', async (t) => {
  const fetch = fakeApi(t)
  renderPage()
  const big = new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'dlugie.wav', { type: 'audio/wav' })
  chooseAndCheck(big)
  const alert = await within(audioForm()).findByRole('alert')
  assert.equal(alert.textContent, 'Plik jest za duży. Wyślij nagranie do 20 MB albo je przytnij.')
  assert.equal(fetch.mock.callCount(), 0)
})

test('a recording the API finds too long shows the length message and starts no check', async (t) => {
  const fetch = fakeApi(t, rejected(422, 'errors.audio_too_long'))
  const opened = renderPage()
  chooseAndCheck(recording())
  const alert = await within(audioForm()).findByRole('alert')
  assert.equal(
    alert.textContent,
    'Nagranie jest za długie. Wyślij najwyżej 10 min albo je przytnij.',
  )
  assert.equal(fetch.mock.callCount(), 1)
  assert.deepEqual(opened, [])
})

test('an unsupported format ends as out of scope, saying what can be sent', async (t) => {
  fakeApi(t, rejected(415, 'status_hint.out_of_scope_audio_format'))
  const opened = renderPage()
  chooseAndCheck(new File(['%PDF'], 'skan.pdf', { type: 'application/pdf' }))
  const card = await screen.findByRole('region', { name: pl.result.label })
  const text = card.textContent ?? ''
  assert.ok(text.includes(pl.status.out_of_scope))
  assert.ok(text.includes(pl.out_of_scope_code.audio))
  assert.ok(text.includes('Formaty: OGG, MP3, M4A, WAV.'))
  assert.deepEqual(opened, [])
})

test('the daily recording limit shows its own message', async (t) => {
  fakeApi(t, rejected(429, 'errors.rate_limited_daily'))
  renderPage()
  chooseAndCheck(recording())
  const alert = await within(audioForm()).findByRole('alert')
  assert.equal(alert.textContent, pl.errors.rate_limited_daily)
})

test('a network failure during the upload shows the offline message', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.reject(new TypeError('Failed to fetch')))
  renderPage()
  chooseAndCheck(recording())
  const alert = await within(audioForm()).findByRole('alert')
  assert.equal(alert.textContent, pl.errors.offline)
})

test('a 422 without the length key is not reported as a too long recording', async (t) => {
  fakeApi(t, { status: 422, body: { detail: 'invalid body' } })
  renderPage()
  chooseAndCheck(recording())
  const alert = await within(audioForm()).findByRole('alert')
  assert.equal(alert.textContent, pl.errors.busy)
})

test('the file cannot be changed while the recording is sent', async (t) => {
  let answer: (value: Response) => void = () => undefined
  t.mock.method(globalThis, 'fetch', () => new Promise<Response>((resolve) => (answer = resolve)))
  renderPage()
  chooseAndCheck(recording())
  const input = screen.getByLabelText(pl.conversation.attach_audio)
  await waitFor(() => assert.equal((input as HTMLInputElement).disabled, true))
  answer(new Response(JSON.stringify({ detail: 'x' }), { status: 500 }))
  await waitFor(() => assert.equal((input as HTMLInputElement).disabled, false))
})

test('a recording the API finds too large shows the size message', async (t) => {
  fakeApi(t, rejected(413, 'errors.audio_too_large'))
  renderPage()
  chooseAndCheck(recording())
  const alert = await within(audioForm()).findByRole('alert')
  assert.equal(alert.textContent, 'Plik jest za duży. Wyślij nagranie do 20 MB albo je przytnij.')
})
