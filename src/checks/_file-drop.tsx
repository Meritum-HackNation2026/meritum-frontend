import { Upload } from 'lucide-react'
import { type ClipboardEvent, type DragEvent, type ReactNode, useCallback, useState } from 'react'
import { t } from '@/components/meritum'

/**
 * Whether a file fits an `accept` list of a file field: a full MIME type, a `type/*` group or a
 * file name ending (`.png`); a file without a type is told by its name.
 *
 * @param file - The pasted, dropped or chosen file.
 * @param accept - The comma-separated list, as `IMAGE_ACCEPT`.
 * @returns True when one entry matches.
 * @feature US-SPR-08, US-SPR-11, F-08, F-33
 */
export function accepts(file: File, accept: string): boolean {
  const name = file.name.toLowerCase()
  return accept.split(',').some((entry) => {
    if (entry.startsWith('.')) {
      return name.endsWith(entry)
    }
    return entry.endsWith('/*') ? file.type.startsWith(entry.slice(0, -1)) : file.type === entry
  })
}

const carriesFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files')

type FileDropProps = {
  onFiles: (files: File[]) => void
  onEdit: () => void
  disabled: boolean
  children: ReactNode
}

/**
 * Wraps the message field so it takes files without its buttons: an image or a recording pasted
 * from the clipboard (Ctrl/Cmd+V) or dragged onto the field, which shows a drop zone while a
 * file is over it. Pasted text stays text. The buttons and pasting are the keyboard way in
 * (WCAG 2.5.7), so the drop zone itself is hidden from screen readers.
 *
 * @param props.onFiles - Called with the pasted or dropped files.
 * @param props.onEdit - Called when the field or a file input changes, to clear an old notice.
 * @param props.disabled - True while a check is sent: files are ignored.
 * @param props.children - The message field.
 * @returns The field with paste and drop handling.
 * @feature US-SPR-08, US-SPR-11, F-08, F-33
 */
export function FileDrop({ onFiles, onEdit, disabled, children }: FileDropProps) {
  const [over, setOver] = useState(false)
  const paste = useCallback(
    (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData.files)
      const text = event.clipboardData.getData('text/plain').trim()
      // an editor copies text together with a picture of it: that is a text paste; a file
      // manager copies a file together with its name: that is a file
      const isTextPaste = text !== '' && !files.some((file) => file.name === text)
      if (disabled || files.length === 0 || isTextPaste) {
        return
      }
      event.preventDefault()
      onFiles(files)
    },
    [disabled, onFiles],
  )
  const dragOver = useCallback(
    (event: DragEvent) => {
      if (disabled || !carriesFiles(event)) {
        return
      }
      event.preventDefault()
      setOver(true)
    },
    [disabled],
  )
  const dragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    if (!(next instanceof Node && event.currentTarget.contains(next))) {
      setOver(false)
    }
  }, [])
  const drop = useCallback(
    (event: DragEvent) => {
      if (!over) {
        return
      }
      event.preventDefault()
      setOver(false)
      onFiles(Array.from(event.dataTransfer.files))
    },
    [over, onFiles],
  )
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: it only hears events that bubble up from the field inside; the field and its buttons are the controls
    <div
      className="relative grid min-w-0"
      onPaste={paste}
      onDragEnter={dragOver}
      onDragOver={dragOver}
      onDragLeave={dragLeave}
      onDrop={drop}
      onChange={onEdit}
    >
      {children}
      {over && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ring bg-card px-4 text-center text-body font-semibold"
        >
          <Upload className="size-5 shrink-0" />
          {t.conversation.drop_hint}
        </div>
      )}
    </div>
  )
}
