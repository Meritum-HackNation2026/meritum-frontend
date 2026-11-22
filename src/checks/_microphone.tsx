import { useCallback, useEffect, useRef, useState } from 'react'
import { t } from '@/components/meritum'
import { toWav } from './_wav'
import { NATIVE_RECORDING_TYPES, RECORDING_LIMIT_SECONDS, RECORDING_TICK_MS } from './constants'

/**
 * Why the microphone control shows a message instead of recording.
 *
 * @feature US-SPR-11, F-08
 */
export type MicrophoneError = 'denied' | 'unsupported' | 'failed' | 'limit'

type Native = (typeof NATIVE_RECORDING_TYPES)[number]

const canRecord = () =>
  typeof MediaRecorder !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'

/** The first type the API reads that this browser records, if any. */
function nativeType(): Native | undefined {
  return NATIVE_RECORDING_TYPES.find((type) => MediaRecorder.isTypeSupported(type.mime))
}

/** The recorded chunks as a file the API accepts: as recorded, or converted to WAV. */
async function toFile(chunks: Blob[], native: Native | undefined): Promise<File> {
  const name = t.recording.file_name
  if (native) {
    return new File(chunks, `${name}.${native.extension}`, {
      type: native.mime.split(';')[0] ?? '',
    })
  }
  const wav = await toWav(new Blob(chunks))
  return new File([wav], `${name}.wav`, { type: 'audio/wav' })
}

/** The loudness of the stream between 0 and 1, read on every tick; 0 where Web Audio is missing. */
function levelReader(stream: MediaStream): { read: () => number; close: () => void } {
  if (typeof AudioContext === 'undefined') {
    return { read: () => 0, close: () => undefined }
  }
  const context = new AudioContext()
  const analyser = context.createAnalyser()
  context.createMediaStreamSource(stream).connect(analyser)
  const data = new Uint8Array(analyser.fftSize)
  return {
    read: () => {
      analyser.getByteTimeDomainData(data)
      const peak = data.reduce((max, value) => Math.max(max, Math.abs(value - 128)), 0)
      return Math.min(1, peak / 64)
    },
    close: () => {
      context.close().catch(() => undefined)
    },
  }
}

/**
 * Records the microphone (MediaRecorder) and hands the finished recording on as a file the API
 * reads: OGG or M4A as the browser records them, otherwise WAV. It stops by itself at
 * `RECORDING_LIMIT_SECONDS`. A refused microphone, a missing recorder or a failed conversion is
 * an error key, never a throw.
 *
 * @param onRecorded - Called with the finished recording.
 * @returns Whether it records, the seconds and level so far, the error and start and stop.
 * @feature US-SPR-11, F-08
 */
export function useMicrophone(onRecorded: (file: File) => void) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState<MicrophoneError | null>(null)
  const stopRef = useRef<(() => void) | null>(null)
  useEffect(() => () => stopRef.current?.(), [])

  const start = useCallback(async () => {
    setError(null)
    if (!canRecord()) {
      return setError('unsupported')
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return setError('denied')
    }
    const native = nativeType()
    const recorder = new MediaRecorder(stream, native ? { mimeType: native.mime } : undefined)
    const chunks: Blob[] = []
    const meter = levelReader(stream)
    const startedAt = Date.now()
    let reachedLimit = false
    const tick = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000
      setSeconds(Math.floor(elapsed))
      setLevel(meter.read())
      if (elapsed >= RECORDING_LIMIT_SECONDS) {
        reachedLimit = true
        recorder.stop()
      }
    }, RECORDING_TICK_MS)
    recorder.ondataavailable = (event) => chunks.push(event.data)
    recorder.onstop = async () => {
      clearInterval(tick)
      meter.close()
      for (const track of stream.getTracks()) {
        track.stop()
      }
      stopRef.current = null
      setRecording(false)
      setLevel(0)
      try {
        onRecorded(await toFile(chunks, native))
        setError(reachedLimit ? 'limit' : null)
      } catch {
        setError('failed')
      }
    }
    stopRef.current = () => recorder.state !== 'inactive' && recorder.stop()
    recorder.start()
    setSeconds(0)
    setRecording(true)
  }, [onRecorded])

  const stop = useCallback(() => stopRef.current?.(), [])
  return { recording, seconds, level, error, start, stop }
}
