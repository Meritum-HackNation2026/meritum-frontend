/**
 * Checking a screenshot through the public API of `src/checks`: the image button of the message
 * field and the OCR text on the result page, with a fake API behind `fetch`
 * (POST /api/v1/images, then POST /api/v1/checks).
 *
 * @feature US-SPR-08, F-33
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
import { CheckPage, type ProgressSource, ResultPage } from '@/checks'
import examples from '@/contracts/examples.json'
import type { AnalysisStatus, CheckResult } from '@/contracts/meritum'
import pl from '@/copy/pl.json'
import { requestPath, sentRequest } from '../fetch-request'
import { fakeHandoff } from '../moderation/fake-handoff'

type Answer = { status: number; body: unknown }

const accepted: Answer = { status: 201, body: { image_id: 'i_01' } }
const started: Answer = { status: 202, body: { check_id: 'c_01' } }

function rejected(status: number): Answer {
  const body = {
    status: 'out_of_scope',
    message_key: 'out_of_scope_code.image',
    formats: ['PNG', 'JPEG', 'WebP'],
    max_mb: 10,
  }
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
      imageUploader={apiImageUploader}
      eraser={apiSessionEraser}
      reader={apiResultReader}
      progress={apiProgressSource}
      handoff={apiHandoff}
      onAccepted={onAccepted}
    />,
  )
  return opened
}

const form = () => screen.getByRole('form', { name: pl.form.title })
const screenshot = () => new File(['PNG bajty'], 'post.png', { type: 'image/png' })

function choose(file: File) {
  fireEvent.click(screen.getByRole('button', { name: pl.conversation.attach_image }))
  const input = document.querySelector('input[accept*="image"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

function chooseAndCheck(file: File) {
  choose(file)
  fireEvent.click(within(form()).getByRole('button', { name: pl.form.submit }))
}

test('a chosen image shows its name, the limits, the OCR note, cost and retention before it is sent', () => {
  renderPage()
  choose(screenshot())
  const text = form().textContent ?? ''
  assert.ok(within(form()).getByText('post.png'))
  assert.ok(text.includes(pl.form.image_note))
  assert.ok(text.includes('Plik do 10 MB. Formaty: PNG, JPEG, WebP.'))
  assert.ok(text.includes(pl.form.image_cost))
  assert.ok(text.includes(pl.form.image_retention.replace('{days}', '30')))
  fireEvent.click(screen.getByRole('button', { name: pl.conversation.remove_image }))
  assert.ok(screen.getByLabelText(pl.form.input_label))
})

test('a chosen image goes to POST /api/v1/images, then its id to POST /api/v1/checks', async (t) => {
  const fetch = fakeApi(t, accepted, started)
  const opened = renderPage()
  chooseAndCheck(screenshot())
  await waitFor(() => assert.deepEqual(opened, ['c_01']))
  const upload = sentRequest(fetch.mock.calls[0]?.arguments[0])
  assert.equal(requestPath(upload), '/api/v1/images')
  assert.equal(upload.headers.get('Content-Type'), 'image/png')
  assert.equal(await upload.text(), 'PNG bajty')
  const check = sentRequest(fetch.mock.calls[1]?.arguments[0])
  assert.deepEqual(await check.json(), { channel: 'web', image_id: 'i_01' })
})

test('a file over 10 MB shows the size message and sends nothing', async (t) => {
  const fetch = fakeApi(t)
  renderPage()
  const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'duzy.png', { type: 'image/png' })
  chooseAndCheck(big)
  const alert = await within(form()).findByRole('alert')
  assert.equal(
    alert.textContent,
    'Obraz jest za duży. Wyślij plik do 10 MB albo przytnij zrzut ekranu.',
  )
  assert.equal(fetch.mock.callCount(), 0)
})

test('an unsupported file shows the format message and starts no check', async (t) => {
  fakeApi(t, rejected(415))
  const opened = renderPage()
  chooseAndCheck(new File(['GIF89a'], 'ruchomy.gif', { type: 'image/gif' }))
  const alert = await within(form()).findByRole('alert')
  assert.equal(
    alert.textContent,
    'Nie umiemy odczytać tego pliku. Wyślij obraz w formacie PNG, JPEG, WebP.',
  )
  assert.deepEqual(opened, [])
})

test('a network failure during the upload shows the offline message', async (t) => {
  t.mock.method(globalThis, 'fetch', () => Promise.reject(new TypeError('Failed to fetch')))
  renderPage()
  chooseAndCheck(screenshot())
  const alert = await within(form()).findByRole('alert')
  assert.equal(alert.textContent, pl.errors.offline)
})

const idle: ProgressSource = { watch: () => () => undefined }
const done = examples['CheckResult.done'] as CheckResult

function fakeResult(t: TestContext, result: CheckResult) {
  const status: AnalysisStatus = {
    check_id: 'c_01',
    steps: [{ code: 'receive', status: 'done' }],
    result,
  }
  t.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify(status), { status: 200 })),
  )
}

function renderResult() {
  const { handoff } = fakeHandoff()
  render(<ResultPage handoff={handoff} checkId="c_01" reader={apiResultReader} progress={idle} />)
}

test('a checked image shows the text read from it, apart from the verdicts, with the date hint', async (t) => {
  const image_text = 'Rząd zakazuje gotówki od stycznia. Opublikowano 3 maja 2019.'
  fakeResult(t, { ...done, image_text })
  renderResult()
  const section = await screen.findByRole('region', { name: pl.result.image_text })
  const text = section.textContent ?? ''
  assert.ok(text.includes(image_text))
  assert.ok(text.includes(pl.result.image_text_hint))
  assert.ok(text.includes(pl.result.image_date_hint))
  assert.ok(await screen.findByText(pl.verdict.false))
  assert.equal(document.querySelector('[aria-live="polite"]')?.contains(section), false)
})

test('a result of text has no image section', async (t) => {
  fakeResult(t, done)
  renderResult()
  assert.ok(await screen.findByText(pl.verdict.false))
  assert.equal(screen.queryAllByRole('region', { name: pl.result.image_text }).length, 0)
})

test('a failed OCR is a technical failure with no verdict and no image section', async (t) => {
  fakeResult(t, { ...done, status: 'technical_failure', claims: [], image_text: null })
  renderResult()
  assert.ok(await screen.findByText(pl.status.technical_failure))
  assert.equal(screen.queryByText(pl.verdict.false), null)
  assert.equal(screen.queryAllByRole('region', { name: pl.result.image_text }).length, 0)
})
