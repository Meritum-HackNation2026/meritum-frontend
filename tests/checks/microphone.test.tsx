/**
 * Live recording in the message field through `CheckPage`, with a fake MediaRecorder and
 * microphone: start, stop, listen, discard, refusal and the automatic stop.
 *
 * @feature US-SPR-11, F-08
 */
import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  apiAudioUploader,
  apiCheckSender,
  apiHandoff,
  apiImageUploader,
  apiProgressSource,
  apiResultReader,
  apiSessionEraser,
} from '@/api'
import { CheckPage } from '@/checks'
import pl from '@/copy/pl.json'
import { finishedCheck } from './finished-check'

class FakeRecorder {
  static native = true
  static types = ['audio/ogg;codecs=opus']
  static last: FakeRecorder | null = null
  state = 'inactive'
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  options: { mimeType: string } | undefined
  constructor(_stream: unknown, options?: { mimeType: string }) {
    this.options = options
    FakeRecorder.last = this
  }
  static isTypeSupported = (mime: string) =>
    FakeRecorder.native && FakeRecorder.types.includes(mime)
  start() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['OggS'], { type: 'audio/ogg' }) })
    this.onstop?.()
  }
}

const track = { stop: () => undefined }
let getUserMedia: () => Promise<unknown>

beforeEach(() => {
  FakeRecorder.native = true
  FakeRecorder.types = ['audio/ogg;codecs=opus']
  getUserMedia = () => Promise.resolve({ getTracks: () => [track] })
  Object.assign(globalThis, { MediaRecorder: FakeRecorder })
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: () => getUserMedia() },
  })
  URL.createObjectURL = () => 'blob:fake'
  URL.revokeObjectURL = () => undefined
})
afterEach(() => {
  Reflect.deleteProperty(globalThis, 'MediaRecorder')
})

const limitText = /Nagrywanie zakończyło się samo po 10 min/
const noop = () => undefined

function renderPage() {
  render(
    <CheckPage
      sender={apiCheckSender}
      uploader={apiAudioUploader}
      imageUploader={apiImageUploader}
      eraser={apiSessionEraser}
      reader={apiResultReader}
      progress={apiProgressSource}
      handoff={apiHandoff}
      onAccepted={noop}
      {...finishedCheck()}
    />,
  )
}

const open = () =>
  fireEvent.click(screen.getByRole('button', { name: pl.conversation.attach_audio }))
const start = () => {
  open()
  fireEvent.click(screen.getByRole('button', { name: pl.recording.start }))
}

test('Nagraj, then Zatrzymaj, attaches the recording with a player and a discard button', async () => {
  renderPage()
  start()
  const stop = await screen.findByRole('button', { name: pl.recording.stop })
  assert.ok(screen.getByRole('timer', { name: pl.recording.elapsed }))
  assert.equal(FakeRecorder.last?.options?.mimeType, 'audio/ogg;codecs=opus')
  fireEvent.click(stop)
  await screen.findByText(`${pl.recording.file_name}.ogg`)
  assert.ok(document.querySelector('audio'))
  fireEvent.click(screen.getByRole('button', { name: pl.conversation.remove_audio }))
  assert.ok(screen.getByLabelText(pl.form.input_label))
})

// Chrome 157 records plain audio/mp4 as Opus in MP4, which Speech-to-Text v2 refuses (#139).
const chromeTypes = ['audio/mp4', 'audio/mp4;codecs=opus', 'audio/mp4;codecs=mp4a.40.2']

test('Chrome records M4A with AAC, not plain audio/mp4', async () => {
  FakeRecorder.types = chromeTypes
  renderPage()
  start()
  fireEvent.click(await screen.findByRole('button', { name: pl.recording.stop }))
  assert.equal(FakeRecorder.last?.options?.mimeType, 'audio/mp4;codecs=mp4a.40.2')
  await screen.findByText(`${pl.recording.file_name}.m4a`)
})

test('a browser with only Opus in MP4 does not record audio/mp4', async () => {
  FakeRecorder.types = chromeTypes.filter((type) => !type.includes('mp4a'))
  renderPage()
  start()
  await screen.findByRole('button', { name: pl.recording.stop })
  assert.equal(FakeRecorder.last?.options, undefined)
})

test('a refused microphone says so and still allows a file', async () => {
  getUserMedia = () => Promise.reject(new Error('NotAllowedError'))
  renderPage()
  start()
  const alert = await screen.findByRole('alert')
  assert.equal(alert.textContent, pl.recording.denied)
  open()
  assert.ok(document.querySelector('input[type="file"]'))
})

test('a browser without MediaRecorder says it cannot record', async () => {
  Reflect.deleteProperty(globalThis, 'MediaRecorder')
  renderPage()
  start()
  assert.equal((await screen.findByRole('alert')).textContent, pl.recording.unsupported)
})

test('a recording stops by itself at the limit and says so', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'] })
  renderPage()
  start()
  await act(async () => {
    await Promise.resolve()
  })
  act(() => {
    t.mock.timers.tick(596_000)
  })
  await waitFor(() => assert.ok(screen.getByText(limitText)))
  assert.ok(screen.getByText(`${pl.recording.file_name}.ogg`))
})
