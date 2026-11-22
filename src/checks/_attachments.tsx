import { type ReactNode, useCallback } from 'react'
import {
  RecordingAttachment,
  RecordingButton,
  RecordingRefusal,
  useRecording,
} from './_audio-check'
import { ImageAttachment, ImageButton, useImageCheck } from './_image-check'
import { useMicrophone } from './_microphone'
import { MicrophoneMessage } from './_recorder'
import type { AudioUploader, CheckSender, ImageUploader } from './ports'

/**
 * The attachments of the message field: a recording (microphone button) or a screenshot or photo
 * (image button), one at a time. A chosen image takes a recording's place and the other way
 * round.
 *
 * @param uploaders - The adapters that upload a recording and an image.
 * @param sender - Starts the check of an uploaded file.
 * @param onAccepted - Called with the id of an accepted check and its question line.
 * @returns What the composer shows: `busy`, its `tools`, the chosen `attachment` with its
 * `onSend`, and the `messages` that belong above the field.
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
  const { remove: removeImage } = image
  const attachRecorded = useCallback(
    (file: File) => {
      removeImage()
      attachRecording(file)
    },
    [removeImage, attachRecording],
  )
  const mic = useMicrophone(attachRecorded)
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
      </>
    ),
  }
}
