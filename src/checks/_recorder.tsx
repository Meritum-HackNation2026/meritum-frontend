import { Mic, Square } from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'
import { fill, t } from '@/components/meritum'
import type { MicrophoneError, useMicrophone } from './_microphone'
import { RECORDER_BUTTON as BUTTON, MAX_AUDIO_MINUTES } from './constants'

type Microphone = ReturnType<typeof useMicrophone>

/** `m:ss`, the clock of a recording. */
function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

const messages: Record<MicrophoneError, string> = {
  denied: t.recording.denied,
  unsupported: t.recording.unsupported,
  failed: t.recording.failed,
  limit: fill(t.recording.limit_reached, { max_minutes: MAX_AUDIO_MINUTES }),
}

/**
 * „Nagraj” in the note of the microphone button.
 *
 * @param props.mic - The microphone state from `useMicrophone`.
 * @param props.onStart - Called when recording starts, to close the note.
 * @returns The button.
 * @feature US-SPR-11, F-08
 */
export function MicrophoneStart({ mic, onStart }: { mic: Microphone; onStart: () => void }) {
  const { start: begin } = mic
  const start = useCallback(() => {
    onStart()
    begin().catch(() => undefined)
  }, [begin, onStart])
  return (
    <button
      type="button"
      onClick={start}
      className={`${BUTTON} bg-primary text-primary-foreground hover:bg-primary/90`}
    >
      <Mic aria-hidden="true" className="size-4" />
      {t.recording.start}
    </button>
  )
}

/**
 * While recording: „Zatrzymaj” with the elapsed time and a sound level that moves only when
 * there is sound (a word and a number as well, never colour alone). It replaces the microphone
 * button until the recording is stopped or reaches its limit.
 *
 * @param props.mic - The microphone state from `useMicrophone`.
 * @returns The stop button with the clock and the level.
 * @feature US-SPR-11, F-08
 */
export function RecordingStop({ mic }: { mic: Microphone }) {
  return (
    <div className="flex items-center gap-3 text-small">
      <button
        type="button"
        onClick={mic.stop}
        className={`${BUTTON} border border-border hover:bg-secondary`}
      >
        <Square aria-hidden="true" className="size-4 fill-current" />
        {t.recording.stop}
      </button>
      <span role="timer" aria-label={t.recording.elapsed} className="tabular-nums">
        {clock(mic.seconds)}
      </span>
      {/* biome-ignore lint/a11y/useSemanticElements: <meter> cannot take the bar styling */}
      <span
        role="meter"
        aria-label={t.recording.level}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(mic.level * 100)}
        className="block h-2 w-12 overflow-hidden rounded-pill bg-secondary sm:w-16"
      >
        <span
          className="block h-full origin-left bg-foreground transition-transform duration-150 ease-out-meritum motion-reduce:transition-none"
          style={{ transform: `scaleX(${mic.level})` }}
        />
      </span>
    </div>
  )
}

/**
 * Plays the chosen recording so the citizen can hear it before sending; the file is only read
 * in the browser until „Sprawdź”.
 *
 * @param props.file - The recording or file.
 * @returns The player.
 * @feature US-SPR-11, F-08
 */
export function RecordingPreview({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    // biome-ignore lint/a11y/useMediaCaption: the transcript is shown on the result card
    <audio controls src={url} aria-label={t.recording.listen} className="h-10 w-full" />
  )
}

/**
 * Why the microphone did not record: refused access, no recorder in the browser, a failed save,
 * or the automatic stop at the limit. Adding a file stays possible.
 *
 * @param props.mic - The microphone state from `useMicrophone`.
 * @returns The message, or nothing.
 * @feature US-SPR-11, F-08
 */
export function MicrophoneMessage({ mic }: { mic: Microphone }) {
  return mic.error ? (
    <p role="alert" className="text-small text-foreground">
      {messages[mic.error]}
    </p>
  ) : null
}
