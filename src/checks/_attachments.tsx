import { type ReactNode, useCallback, useState } from 'react'
import { fill, t } from '@/components/meritum'
import {
  RecordingAttachment,
  RecordingButton,
  RecordingRefusal,
  useRecording,
} from './_audio-check'
import { accepts } from './_file-drop'
import { ImageAttachment, ImageButton, useImageCheck } from './_image-check'
import { useMicrophone } from './_microphone'
import { MicrophoneMessage } from './_recorder'
import { AUDIO_ACCEPT, AUDIO_FORMATS, IMAGE_ACCEPT, IMAGE_FORMATS } from './constants'
import type { AudioUploader, CheckSender, ImageUploader } from './ports'

const formats = {
  formats: IMAGE_FORMATS.join(', '),
  image_formats: IMAGE_FORMATS.join(', '),
  audio_formats: AUDIO_FORMATS.join(', '),
}

/**
 * The attachments of the message field: a recording (microphone button) or a screenshot or photo
 * (image button), one at a time. A chosen image takes a recording's place and the other way
 * round. A pasted or dropped file (`drop`) is attached by its kind; an image in another format,
 * any other file (a PDF) and a second file get a notice above the field instead.
 *
 * @param uploaders - The adapters that upload a recording and an image.
 * @param sender - Starts the check of an uploaded file.
 * @param onAccepted - Called with the id of an accepted check and its question line.
 * @returns What the composer shows: `busy`, its `tools`, the chosen `attachment` with its
 * `onSend`, the `messages` that belong above the field and `drop` for `FileDrop`.
 * @feature US-SPR-08, US-SPR-11, F-08, F-33
 */
export function useAttachments(
  uploaders: { audio: AudioUploader; image: ImageUploader },
  sender: CheckSender,
  onAccepted: (checkId: string, question: string) => void,
) {
  const recording = useRecording(uploaders.audio, sender, onAccepted)
  const { remove: removeRecording, attach: attachRecording } = recording
  const image = useImageCheck(uploaders.image, sender, onAccepted, removeRecording)
  const { remove: removeImage, attach: attachImage } = image
  const attachRecorded = useCallback(
    (file: File) => {
      removeImage()
      attachRecording(file)
    },
    [removeImage, attachRecording],
  )
  const mic = useMicrophone(attachRecorded)
  const [notice, setNotice] = useState<string | null>(null)
  const onFiles = useCallback(
    (files: File[]) => {
      const isImage = (file: File) => accepts(file, IMAGE_ACCEPT)
      const isAudio = (file: File) => accepts(file, AUDIO_ACCEPT)
      const file = files.find((one) => isImage(one) || isAudio(one))
      if (file) {
        const attach = isImage(file) ? attachImage : attachRecorded
        attach(file)
        setNotice(files.length > 1 ? fill(t.errors.one_file, { name: file.name }) : null)
      } else if (files[0]?.type.startsWith('image/')) {
        setNotice(fill(t.errors.image_format_unsupported, formats))
      } else {
        setNotice(fill(t.errors.file_unsupported, formats))
      }
    },
    [attachImage, attachRecorded],
  )
  const onEdit = useCallback(() => setNotice(null), [])
  let attachment: ReactNode
  if (image.file) {
    attachment = <ImageAttachment image={image} />
  } else if (recording.file) {
    attachment = <RecordingAttachment recording={recording} />
  }
  return {
    busy: recording.pending || image.pending,
    tools: (
      <>
        <RecordingButton recording={recording} mic={mic} />
        <ImageButton image={image} />
      </>
    ),
    attachment,
    onSend: image.file ? image.send : recording.send,
    messages: (
      <>
        <RecordingRefusal recording={recording} />
        <MicrophoneMessage mic={mic} />
        {notice && (
          <p role="alert" className="text-small text-foreground">
            {notice}
          </p>
        )}
      </>
    ),
    drop: { onFiles, onEdit },
  }
}
