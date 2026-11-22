import {
  WAV_BYTES_PER_SAMPLE as BYTES_PER_SAMPLE,
  WAV_HEADER_BYTES as HEADER_BYTES,
  WAV_INT16_MAX as INT16_MAX,
  WAV_INT16_MIN as INT16_MIN,
  WAV_PCM_FORMAT as PCM_FORMAT,
  WAV_BITS,
  WAV_SAMPLE_RATE,
} from './constants'

function writeText(view: DataView, at: number, text: string) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(at + i, text.charCodeAt(i))
  }
}

/**
 * Packs mono samples into a 16-bit PCM WAV file, a format the API reads from the bytes.
 *
 * @param samples - Mono samples between -1 and 1.
 * @param sampleRate - Samples per second.
 * @returns The WAV file as a blob.
 * @feature US-SPR-11, F-08
 */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const size = samples.length * BYTES_PER_SAMPLE
  const view = new DataView(new ArrayBuffer(HEADER_BYTES + size))
  writeText(view, 0, 'RIFF')
  view.setUint32(4, 36 + size, true)
  writeText(view, 8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, PCM_FORMAT, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true)
  view.setUint16(32, BYTES_PER_SAMPLE, true)
  view.setUint16(34, WAV_BITS, true)
  writeText(view, 36, 'data')
  view.setUint32(40, size, true)
  samples.forEach((sample, i) => {
    const clipped = Math.max(-1, Math.min(1, sample))
    view.setInt16(
      HEADER_BYTES + i * BYTES_PER_SAMPLE,
      clipped < 0 ? clipped * INT16_MIN : clipped * INT16_MAX,
      true,
    )
  })
  return new Blob([view], { type: 'audio/wav' })
}

/**
 * Decodes a recording the browser made (WebM in Chrome) and re-encodes it as 16 kHz mono WAV.
 *
 * @param recorded - What `MediaRecorder` produced.
 * @returns The WAV file as a blob.
 * @throws When the browser cannot decode the recording.
 * @feature US-SPR-11, F-08
 */
export async function toWav(recorded: Blob): Promise<Blob> {
  const context = new AudioContext()
  try {
    const decoded = await context.decodeAudioData(await recorded.arrayBuffer())
    const offline = new OfflineAudioContext(
      1,
      Math.ceil(decoded.duration * WAV_SAMPLE_RATE),
      WAV_SAMPLE_RATE,
    )
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start()
    const rendered = await offline.startRendering()
    return encodeWav(rendered.getChannelData(0), WAV_SAMPLE_RATE)
  } finally {
    await context.close()
  }
}
