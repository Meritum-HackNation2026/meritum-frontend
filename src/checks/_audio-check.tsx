import { type ChangeEvent, type FormEvent, useCallback, useId, useState } from 'react'
import { fill, t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import privacy from '@/copy/privacy.json'
import type { ErrorKey } from './_request'
import { ResultState } from './_result-state'
import {
  AUDIO_ACCEPT,
  AUDIO_FORMATS,
  MAX_AUDIO_BYTES,
  MAX_AUDIO_MB,
  MAX_AUDIO_MINUTES,
  RETENTION_SENTENCE_MARKER,
  TRANSCRIBER_ID,
} from './constants'
import type { AudioUploader, CheckSender, UploadOutcome } from './ports'

/** A refusal shown next to the audio field: an `errors` key or the out-of-scope format. */
type Refusal = ErrorKey | 'unsupported_format'

const limits = { max_mb: MAX_AUDIO_MB, max_minutes: MAX_AUDIO_MINUTES }
const limitsLine = fill(t.form.audio_limits, { ...limits, formats: AUDIO_FORMATS.join(', ') })
// shortcut: provider and retention come from copy/privacy.json until copy/pl.json has
// form.audio_provider and form.audio_retention (meritum-design-system#69, meritum-frontend#65)
const transcriber = privacy.processors.items.find((p) => p.id === TRANSCRIBER_ID)
const retention = privacy.policies.web.retention.split(/(?<=\.)\s+/)
const aboutLines = [
  t.form.audio_note,
  limitsLine,
  transcriber ? `${transcriber.name}, ${transcriber.region}` : '',
  retention.find((sentence) => sentence.includes(RETENTION_SENTENCE_MARKER)) ?? '',
  t.form.audio_transcription_warning,
].filter(Boolean)

/** Uploads the file, then starts a check of its `audio_id`; the first refusal ends it. */
async function checkRecording(
  file: File,
  uploader: AudioUploader,
  sender: CheckSender,
): Promise<{ checkId: string } | Refusal> {
  if (file.size > MAX_AUDIO_BYTES) {
    return 'audio_too_large'
  }
  const uploaded: UploadOutcome = await uploader.upload(file)
  if (typeof uploaded === 'string') {
    return uploaded
  }
  return sender.send({ channel: 'web', audio_id: uploaded.audioId })
}

/**
 * „Albo nagranie” under the check form (ADR-30): a file field with who transcribes the
 * recording, where, and the limits of a file, all from copy. The check button shows once a file
 * is chosen. A file over `MAX_AUDIO_MB` is refused before it is sent; the API's size, length and
 * rate-limit refusals show under the field, and a file that is not a supported recording ends as
 * an out-of-scope card saying what can be sent, never as a verdict.
 *
 * @param props.uploader - Uploads the recording (the `src/api` adapter in the app).
 * @param props.sender - Starts the check of the uploaded recording.
 * @param props.onAccepted - Called with the id of an accepted check.
 * @returns The audio form.
 * @feature US-SPR-11, F-08
 */
export function AudioCheck({
  uploader,
  sender,
  onAccepted,
}: {
  uploader: AudioUploader
  sender: CheckSender
  onAccepted: (checkId: string) => void
}) {
  const id = useId()
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [refusal, setRefusal] = useState<Refusal | null>(null)

  const submit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      if (!file || pending) {
        return
      }
      setPending(true)
      setRefusal(null)
      try {
        const outcome = await checkRecording(file, uploader, sender)
        if (typeof outcome === 'string') {
          setRefusal(outcome)
        } else {
          onAccepted(outcome.checkId)
        }
      } finally {
        setPending(false)
      }
    },
    [file, pending, uploader, sender, onAccepted],
  )
  const onFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null)
    setRefusal(null)
  }, [])

  const fieldError = refusal === 'unsupported_format' ? null : refusal
  return (
    <div className="grid min-w-0 gap-4">
      <form
        aria-label={t.form.audio_label}
        onSubmit={submit}
        noValidate
        className="grid gap-2 border-t border-border pt-4 font-sans"
      >
        <label htmlFor={id} className="text-small font-semibold">
          {t.form.audio_label}
        </label>
        <input
          id={id}
          type="file"
          accept={AUDIO_ACCEPT}
          aria-invalid={fieldError !== null}
          disabled={pending}
          aria-describedby={fieldError ? `${id}-error ${id}-about` : `${id}-about`}
          onChange={onFileChange}
          className="min-w-0 text-small text-muted-foreground file:mr-3 file:h-10 file:cursor-pointer file:rounded-pill file:border file:border-border file:bg-card file:px-4 file:font-semibold file:text-foreground"
        />
        {fieldError && (
          <p id={`${id}-error`} role="alert" className="text-meta text-scam-foreground">
            {fill(t.errors[fieldError], limits)}
          </p>
        )}
        <div id={`${id}-about`} className="grid gap-1 text-small text-muted-foreground text-pretty">
          {aboutLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        {file && (
          <div>
            <Button type="submit" disabled={pending} className="h-10 rounded-pill px-6">
              {pending ? t.form.checking : t.form.submit}
            </Button>
          </div>
        )}
      </form>
      <div aria-live="polite" className="min-w-0">
        {refusal === 'unsupported_format' && (
          <ResultState status="out_of_scope" hint={`${t.out_of_scope_code.audio} ${limitsLine}`} />
        )}
      </div>
    </div>
  )
}
