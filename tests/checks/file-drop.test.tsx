/**
 * Files pasted or dropped onto the message field, through the public API of `src/checks`: they
 * are attached like the ones chosen with the buttons, with a fake API behind `fetch`.
 *
 * @feature US-SPR-08, US-SPR-11, F-08, F-33
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import {
  apiAudioUploader,
  apiCheckSender,
  apiHandoff,
  apiImageUploader,
  apiProgressSource,
  apiResultReader,
  apiSessionEraser,
} from '@/api'
import { CheckPage, NewCheckPage } from '@/checks'
import pl from '@/copy/pl.json'
import { requestPath, sentRequest } from '../fetch-request'
import { finishedCheck } from './finished-check'

function fakeApi(t: TestContext) {
  const answers = [
    { status: 201, body: { image_id: 'i_01' } },
    { status: 202, body: { check_id: 'c_01' } },
  ]
  let call = 0
  return t.mock.method(globalThis, 'fetch', () => {
    const answer = answers[Math.min(call++, 1)]
    return Promise.resolve(new Response(JSON.stringify(answer?.body), { status: answer?.status }))
  })
}

function renderPage(): string[] {
  const opened: string[] = []
  render(
    <CheckPage
      sender={apiCheckSender}
      uploader={apiAudioUploader}
      imageUploader={apiImageUploader}
      eraser={apiSessionEraser}
      reader={apiResultReader}
      progress={apiProgressSource}
      handoff={apiHandoff}
      onAccepted={opened.push.bind(opened)}
      {...finishedCheck()}
    />,
  )
  return opened
}

const form = () => screen.getByRole('form', { name: pl.form.title })
const field = () => screen.getByLabelText(pl.form.input_label)
const png = (name = 'zrzut.png') => new File(['PNG bajty'], name, { type: 'image/png' })
const mp3 = () => new File(['ID3'], 'glos.mp3', { type: 'audio/mpeg' })
const dragged = (...files: File[]) => ({ dataTransfer: { types: ['Files'], files } })

function drop(...files: File[]) {
  fireEvent.dragEnter(form(), dragged(...files))
  fireEvent.drop(form(), dragged(...files))
}

function paste(files: File[], text = '') {
  return fireEvent.paste(field(), { clipboardData: { files, getData: () => text } })
}

test('a pasted screenshot is attached and checked like one chosen with the button', async (t) => {
  const fetch = fakeApi(t)
  const opened = renderPage()
  paste([png()])
  assert.ok(within(form()).getByText('zrzut.png'))
  fireEvent.click(within(form()).getByRole('button', { name: pl.form.submit }))
  await waitFor(() => assert.deepEqual(opened, ['c_01']))
  assert.equal(requestPath(sentRequest(fetch.mock.calls[0]?.arguments[0])), '/api/v1/images')
})

test('text pasted with a picture of it stays text, a file pasted with its name is a file', () => {
  renderPage()
  const untouched = paste([png('image.png')], 'Płaca minimalna wynosi 4806 zł.')
  assert.equal(untouched, true)
  assert.equal(within(form()).queryByText('image.png'), null)
  paste([png()], 'zrzut.png')
  assert.ok(within(form()).getByText('zrzut.png'))
})

test('a dragged file shows the drop zone and a dropped recording is attached', () => {
  renderPage()
  fireEvent.dragEnter(form(), dragged(mp3()))
  assert.ok(screen.getByText(pl.conversation.drop_hint))
  fireEvent.drop(form(), dragged(mp3()))
  assert.equal(screen.queryByText(pl.conversation.drop_hint), null)
  assert.ok(within(form()).getByRole('button', { name: pl.conversation.remove_audio }))
})

test('dragged text shows no drop zone', () => {
  renderPage()
  fireEvent.dragEnter(form(), { dataTransfer: { types: ['text/plain'], files: [] } })
  assert.equal(screen.queryByText(pl.conversation.drop_hint), null)
})

test('a dropped PDF is not attached and says which files work, until the field changes', () => {
  renderPage()
  drop(new File(['%PDF'], 'ustawa.pdf', { type: 'application/pdf' }))
  assert.equal(
    screen.getByRole('alert').textContent,
    'Takich plików jeszcze nie sprawdzamy. Wyślij obraz (PNG, JPEG, WebP) albo nagranie (OGG, MP3, M4A, WAV), albo wklej tekst lub link.',
  )
  assert.equal(within(form()).queryByText('ustawa.pdf'), null)
  fireEvent.change(field(), { target: { value: 'tekst' } })
  assert.equal(screen.queryByRole('alert'), null)
})

test('a dropped GIF gets the image format message', () => {
  renderPage()
  drop(new File(['GIF89a'], 'ruchomy.gif', { type: 'image/gif' }))
  assert.equal(
    screen.getByRole('alert').textContent,
    'Nie umiemy odczytać tego pliku. Wyślij obraz w formacie PNG, JPEG, WebP.',
  )
})

test('a dropped image over 10 MB shows the size message at once', () => {
  renderPage()
  drop(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'duzy.png', { type: 'image/png' }))
  assert.equal(
    within(form()).getByRole('alert').textContent,
    'Obraz jest za duży. Wyślij plik do 10 MB albo przytnij zrzut ekranu.',
  )
})

test('of several dropped files the first supported one is attached, with a note', () => {
  renderPage()
  drop(new File(['%PDF'], 'ustawa.pdf', { type: 'application/pdf' }), png(), mp3())
  assert.ok(within(form()).getByText('zrzut.png'))
  assert.equal(
    screen.getByText(/Sprawdzamy jeden plik naraz/).textContent,
    'Sprawdzamy jeden plik naraz. Dodaliśmy pierwszy: zrzut.png.',
  )
})

test('the new check page takes a pasted image too', () => {
  render(
    <NewCheckPage
      sender={apiCheckSender}
      uploader={apiAudioUploader}
      imageUploader={apiImageUploader}
      onAccepted={() => undefined}
    />,
  )
  paste([png()])
  assert.ok(within(form()).getByRole('button', { name: pl.conversation.remove_image }))
})
