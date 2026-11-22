import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDate, t } from '@/components/meritum'
import { ARCHIVE_POLL_MS } from './archive/constants'
import type { ArchiveState, PageArchives } from './archive/ports'

type Phase = { kind: 'idle' } | { kind: 'state'; state: ArchiveState } | { kind: 'deleted' }

function save(blob: Blob, name: string) {
  const href = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), { href, download: name })
  link.click()
  URL.revokeObjectURL(href)
}

// The copy's number with a button that puts it on the clipboard and says so.
function ArchiveId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
    } catch {
      // no clipboard (insecure context, denied): the number stays selectable on screen
    }
  }, [id])
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground">{t.archive.id}</dt>
      <dd className="flex flex-wrap items-center gap-x-3">
        <span className="font-mono break-all text-foreground">{id}</span>
        <button
          type="button"
          className="py-2 text-small text-foreground underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          onClick={copy}
        >
          {t.archive.copy_id}
        </button>
        <span role="status" className="text-muted-foreground empty:hidden">
          {copied && t.archive.copied_id}
        </span>
      </dd>
    </div>
  )
}

function Copy({
  id,
  state,
  onDownload,
  onDelete,
}: {
  id: string
  state: Extract<ArchiveState, { status: 'done' }>
  onDownload: () => void
  onDelete: () => void
}) {
  return (
    <div className="grid min-w-0 gap-3 rounded-xl bg-secondary px-4 py-4 text-left text-secondary-foreground">
      <p className="text-body font-semibold">{t.archive.title}</p>
      <dl className="grid min-w-0 gap-2 text-small">
        <ArchiveId id={id} />
        <div className="grid gap-0.5">
          <dt className="text-muted-foreground">{t.archive.sha256}</dt>
          {/* the hash is an identifier, so it is set in Azeret Mono and wraps anywhere */}
          <dd className="font-mono break-all text-foreground">{state.sha256}</dd>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">{t.archive.archived_at}</dt>
            <dd>
              <time dateTime={state.archivedAt}>{formatDate(state.archivedAt)}</time>
            </dd>
          </div>
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">{t.archive.expires_at}</dt>
            <dd>
              <time dateTime={state.expiresAt}>{formatDate(state.expiresAt)}</time>
            </dd>
          </div>
        </div>
      </dl>
      <p className="text-small text-muted-foreground text-pretty">{t.archive.sha256_hint}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <button
          type="button"
          className="rounded-pill bg-primary px-4 py-2.5 text-small font-semibold text-primary-foreground transition-transform duration-150 active:scale-97 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          onClick={onDownload}
        >
          {t.archive.download}
        </button>
        <button
          type="button"
          className="py-3 text-small text-foreground underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          onClick={onDelete}
        >
          {t.archive.delete}
        </button>
      </div>
    </div>
  )
}

function Status({ phase }: { phase: Phase }) {
  if (phase.kind === 'deleted') return <p>{t.archive.deleted}</p>
  if (phase.kind !== 'state') return null
  const { state } = phase
  if (state.status === 'pending') return <p>{t.archive.pending}</p>
  if (state.status === 'refused')
    return <p className="text-pretty">{t.archive.refusal[state.refusal]}</p>
  if (state.status === 'failed') return <p>{t.archive.failed}</p>
  return null
}

/**
 * „Zarchiwizuj stronę” under a checked link (US-KOR-07): asks for a copy, polls it and then
 * shows its SHA-256, dates, download and delete. Changes are announced through `aria-live`.
 *
 * @param props.url - The link the citizen checked.
 * @param props.archives - The archive port (the `src/api` adapter in the app).
 * @param props.pollMs - How often a pending copy is read again.
 * @returns The action and, once asked, the copy's state.
 * @feature US-KOR-07, F-38
 */
export function PageArchive({
  url,
  archives,
  pollMs = ARCHIVE_POLL_MS,
}: {
  url: string
  archives: PageArchives
  pollMs?: number
}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [archiveId, setArchiveId] = useState<string | null>(null)
  const alive = useRef(true)
  useEffect(() => {
    // StrictMode mounts twice, so the flag is set on every mount, not only at creation
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const poll = useCallback(
    async (id: string) => {
      while (true) {
        const state = await archives.read(id)
        if (!alive.current) return
        setPhase({ kind: 'state', state: state ?? { status: 'failed' } })
        if (state?.status !== 'pending') return
        await new Promise((resolve) => setTimeout(resolve, pollMs))
      }
    },
    [archives, pollMs],
  )
  const start = useCallback(async () => {
    setPhase({ kind: 'state', state: { status: 'pending' } })
    const id = await archives.request(url)
    if (!alive.current) return
    if (id === null) {
      setPhase({ kind: 'state', state: { status: 'failed' } })
      return
    }
    setArchiveId(id)
    await poll(id)
  }, [archives, poll, url])
  const download = useCallback(async () => {
    const blob = archiveId === null ? null : await archives.download(archiveId)
    if (blob) save(blob, `archiwum-${archiveId}.txt`)
  }, [archives, archiveId])
  const remove = useCallback(async () => {
    if (archiveId !== null && (await archives.remove(archiveId))) setPhase({ kind: 'deleted' })
  }, [archives, archiveId])

  const done = phase.kind === 'state' && phase.state.status === 'done' ? phase.state : null
  return (
    <div className="ml-10 grid min-w-0 justify-items-end gap-2 font-sans sm:ml-24">
      {phase.kind === 'idle' && (
        <div className="grid justify-items-end">
          <button
            type="button"
            className="py-3 text-small text-foreground underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onClick={start}
          >
            {t.archive.action}
          </button>
          <p className="text-small text-muted-foreground text-pretty text-right">
            {t.archive.action_hint}
          </p>
        </div>
      )}
      {done && archiveId !== null && (
        <Copy id={archiveId} state={done} onDownload={download} onDelete={remove} />
      )}
      <div aria-live="polite" className="text-small text-muted-foreground">
        <Status phase={phase} />
      </div>
    </div>
  )
}
