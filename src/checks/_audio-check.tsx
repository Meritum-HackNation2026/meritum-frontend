import { Mic } from 'lucide-react'
import { type ChangeEvent, useCallback, useState } from 'react'
import { Attachment, fill, t } from '@/components/meritum'
import privacy from '@/copy/privacy.json'
import type { ErrorKey } from './_request'
import { ResultState } from './_result-state'
import {
  AUDIO_ACCEPT,
  AUDIO_FORMATS,
  MAX_AUDIO_BYTES,
  MAX_AUDIO_MB,
  MAX_AUDIO_MINUTES,
  RETENTION_DAYS,
  TRANSCRIBER_ID,
} from './constants'
import type { AudioUploader, CheckSender, UploadOutcome } from './ports'

/** A refusal shown with the recording: an `errors` key or the out-of-scope format. */
type Refusal = ErrorKey | 'unsupported_format'

const limits = { max_mb: MAX_AUDIO_MB, max_minutes: MAX_AUDIO_MINUTES }
const limitsLine = fill(t.form.audio_limits, { ...limits, formats: AUDIO_FORMATS.join(', ') })
const transcriber = privacy.processors.items.find((p) => p.id === TRANSCRIBER_ID)
const aboutLines = [
  t.form.audio_note,
  limitsLine,
  transcriber ? fill(t.form.audio_provider, transcriber) : '',
  t.form.audio_cost,
  fill(t.form.audio_retention, { days: RETENTION_DAYS }),
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
 * A recording attached to the message field (ADR-30): the chosen file, sending it (upload, then
 * a check of its `audio_id`) and the first refusal. A file over `MAX_AUDIO_MB` is refused before
 * it is sent. An accepted check is handed on with its id and the thread's line for the file.
 *
 * @param uploader - Uploads the recording (the `src/api` adapter in the app).
 * @param sender - Starts the check of the uploaded recording.
 * @param onAccepted - Called with the id of an accepted check and its question line.
 * @returns The file, its state and the actions on it.
 * @feature US-SPR-11, F-08
 */
export function useRecording(
  uploader: AudioUploader,
  sender: CheckSender,
  onAccepted: (checkId: string, question: string) => void,
) {
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [refusal, setRefusal] = useState<Refusal | null>(null)
  const send = useCallback(async () => {
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
        onAccepted(outcome.checkId, fill(t.conversation.audio_question, { name: file.name }))
      }
    } finally {
      setPending(false)
    }
  }, [file, pending, uploader, sender, onAccepted])
  const pick = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null)
    setRefusal(null)
  }, [])
  const remove = useCallback(() => {
    setFile(null)
    setRefusal(null)
  }, [])
  return { file, pending, refusal, send, pick, remove }
}

type Recording = ReturnType<typeof useRecording>

/**
 * The microphone button of the message field: a file field named „Dodaj nagranie” behind the
 * icon, disabled while a recording is sent.
 *
 * @param props.recording - The recording state from `useRecording`.
 * @returns The button.
 * @feature US-SPR-11, F-08
 */
export function RecordingButton({ recording }: { recording: Recording }) {
  return (
    <label className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-pill text-muted-foreground transition-colors ease-out-meritum hover:bg-secondary hover:text-foreground has-disabled:cursor-not-allowed has-disabled:opacity-50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring">
      <input
        type="file"
        accept={AUDIO_ACCEPT}
        aria-label={t.conversation.attach_audio}
        disabled={recording.pending}
        onChange={recording.pick}
        className="sr-only"
      />
      <Mic aria-hidden="true" className="size-5" />
    </label>
  )
}

/**
 * The chosen recording in place of the text field: its name, „Usuń nagranie”, who transcribes
 * it and where, the cost, how long it is kept, the limits and the AI warning, all from copy and
 * shown before it is sent; a size, length or rate-limit refusal shows under them.
 *
 * @param props.recording - The recording state from `useRecording`.
 * @returns The attachment, or nothing without a file.
 * @feature US-SPR-11, F-08
 */
export function RecordingAttachment({ recording }: { recording: Recording }) {
  const { file, refusal, pending, remove } = recording
  if (!file) {
    return null
  }
  const fieldError = refusal === 'unsupported_format' ? null : refusal
  return (
    <Attachment name={file.name} onRemove={remove} disabled={pending}>
      {aboutLines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {fieldError && (
        <p role="alert" className="text-meta text-scam-foreground">
          {fill(t.errors[fieldError], limits)}
        </p>
      )}
    </Attachment>
  )
}

/**
 * A file that is not a supported recording, as an out-of-scope card saying what can be sent,
 * never as a verdict.
 *
 * @param props.recording - The recording state from `useRecording`.
 * @returns The card, or nothing.
 * @feature US-SPR-11, F-08
 */
export function RecordingRefusal({ recording }: { recording: Recording }) {
  return recording.refusal === 'unsupported_format' ? (
    <ResultState
      status="out_of_scope"
      hint={`${t.out_of_scope_code.audio} ${limitsLine}`}
    />
  ) : null
}
