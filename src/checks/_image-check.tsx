import { ImagePlus } from 'lucide-react'
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Attachment, fill, t } from '@/components/meritum'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ErrorKey } from './_request'
import {
  IMAGE_ACCEPT,
  IMAGE_FORMATS,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_MB,
  RETENTION_DAYS,
} from './constants'
import type { CheckSender, ImageOutcome, ImageUploader } from './ports'

const limits = { max_mb: MAX_IMAGE_MB, formats: IMAGE_FORMATS.join(', ') }
const aboutLines = [
  t.form.image_note,
  fill(t.form.image_limits, limits),
  t.form.image_cost,
  fill(t.form.image_retention, { days: RETENTION_DAYS }),
]

/** Uploads the file, then starts a check of its `image_id`; the first refusal ends it. */
async function checkImage(
  file: File,
  uploader: ImageUploader,
  sender: CheckSender,
): Promise<{ checkId: string } | ErrorKey> {
  if (file.size > MAX_IMAGE_BYTES) {
    return 'image_too_large'
  }
  const uploaded: ImageOutcome = await uploader.upload(file)
  if (typeof uploaded === 'string') {
    return uploaded
  }
  return sender.send({ channel: 'web', image_id: uploaded.imageId })
}

/**
 * A screenshot or photo attached to the message field (ADR-30): the chosen file, sending it
 * (upload, then a check of its `image_id`) and the first refusal. A file over `MAX_IMAGE_MB` is
 * refused before it is sent. An accepted check is handed on with its id and the thread's line
 * for the file.
 *
 * @param uploader - Uploads the image (the `src/api` adapter in the app).
 * @param sender - Starts the check of the uploaded image.
 * @param onAccepted - Called with the id of an accepted check and its question line.
 * @param onPicked - Called when a file is chosen, so another attachment can step aside.
 * @returns The file, its state and the actions on it.
 * @feature US-SPR-08, F-33
 */
export function useImageCheck(
  uploader: ImageUploader,
  sender: CheckSender,
  onAccepted: (checkId: string, question: string) => void,
  onPicked: () => void,
) {
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [refusal, setRefusal] = useState<ErrorKey | null>(null)
  // a second click before React re-renders must not send the file twice
  const sendingRef = useRef(false)
  const send = useCallback(async () => {
    if (!file || sendingRef.current) {
      return
    }
    sendingRef.current = true
    setPending(true)
    setRefusal(null)
    try {
      const outcome = await checkImage(file, uploader, sender)
      if (typeof outcome === 'string') {
        setRefusal(outcome)
      } else {
        onAccepted(outcome.checkId, fill(t.conversation.image_question, { name: file.name }))
      }
    } finally {
      sendingRef.current = false
      setPending(false)
    }
  }, [file, uploader, sender, onAccepted])
  const pick = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const chosen = event.target.files?.[0] ?? null
      setFile(chosen)
      setRefusal(null)
      if (chosen) {
        onPicked()
      }
    },
    [onPicked],
  )
  const remove = useCallback(() => {
    setFile(null)
    setRefusal(null)
  }, [])
  return { file, pending, refusal, send, pick, remove }
}

type ImageCheck = ReturnType<typeof useImageCheck>

/**
 * The image button of the message field. It opens a note first, so the scope (the text is read
 * in the EU and checked like a pasted one) and the limits are read before the file dialog; the
 * file field sits in that note and it closes once a file is chosen. Disabled while an image is
 * sent.
 *
 * @param props.image - The image state from `useImageCheck`.
 * @returns The button with its note.
 * @feature US-SPR-08, F-33
 */
export function ImageButton({ image }: { image: ImageCheck }) {
  const [open, setOpen] = useState(false)
  const { pick: pickFile } = image
  const pick = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      pickFile(event)
      setOpen(false)
    },
    [pickFile],
  )
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t.conversation.attach_image}
          disabled={image.pending}
          className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-pill text-muted-foreground transition-colors ease-out-meritum hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ImagePlus aria-hidden="true" className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-80 max-w-full gap-2 p-3 text-small font-sans"
      >
        <p className="font-semibold">{t.form.image_label}</p>
        {aboutLines.map((line) => (
          <p key={line} className="text-pretty">
            {line}
          </p>
        ))}
        <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-pill border border-border px-4 font-semibold hover:bg-secondary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring">
          {t.conversation.attach_image}
          <input type="file" accept={IMAGE_ACCEPT} onChange={pick} className="sr-only" />
        </label>
      </PopoverContent>
    </Popover>
  )
}

/** A small preview of the chosen file; it is only read in the browser until „Sprawdź”. */
function Thumbnail({ file }: { file: File }) {
  // created in the effect, so StrictMode's second run does not keep a revoked URL
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const created = URL.createObjectURL(file)
    setUrl(created)
    return () => URL.revokeObjectURL(created)
  }, [file])
  if (!url) {
    return null
  }
  return (
    // biome-ignore lint/performance/noImgElement: a blob preview of the chosen file, nothing to optimise
    <img
      src={url}
      alt={fill(t.conversation.image_question, { name: file.name })}
      className="size-10 shrink-0 rounded-md border border-border object-cover"
    />
  )
}

/**
 * The chosen image in place of the text field, in the design system's `Attachment`: its preview
 * and name, „Usuń obraz”, the scope note, limits, cost and retention, shown before it is sent; a size, format or rate-limit refusal shows
 * under them.
 *
 * @param props.image - The image state from `useImageCheck`.
 * @returns The attachment, or nothing without a file.
 * @feature US-SPR-08, F-33
 */
export function ImageAttachment({ image }: { image: ImageCheck }) {
  const { file, refusal, pending, remove } = image
  if (!file) {
    return null
  }
  return (
    <Attachment
      kind="image"
      name={file.name}
      onRemove={remove}
      disabled={pending}
      preview={<Thumbnail file={file} />}
    >
      <div className="grid max-h-28 gap-1 overflow-y-auto sm:max-h-none">
        {aboutLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      {refusal && (
        <p role="alert" className="text-meta text-scam-foreground">
          {fill(t.errors[refusal], limits)}
        </p>
      )}
    </Attachment>
  )
}
