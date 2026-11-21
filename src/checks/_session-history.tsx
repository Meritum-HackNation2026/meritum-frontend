import { useCallback } from 'react'
import { t, VerdictBadge } from '@/components/meritum'
import type { CheckResult } from '@/contracts/meritum'
import type { SavedCheck } from './_history'

const time = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' })

/** The check as the user will recognise it: its main claim, or the status word without one. */
function labelOf(result: CheckResult): string {
  const claim = result.claims?.[0]?.claim
  if (claim) {
    return claim
  }
  return result.status === 'done' ? result.check_id : t.status[result.status]
}

/** One saved check: its label, the verdict as a word and the time; a click opens it. */
function Entry({ at, result, onOpen }: SavedCheck & { onOpen: (checkId: string) => void }) {
  const open = useCallback(() => onOpen(result.check_id), [onOpen, result.check_id])
  const verdict = result.claims?.[0]?.verdict
  return (
    <li>
      <button
        type="button"
        onClick={open}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-1 py-2.5 text-left transition-colors ease-out-meritum hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="min-w-0 grow basis-48 line-clamp-2 text-small">{labelOf(result)}</span>
        {verdict && <VerdictBadge verdict={verdict} size="sm" />}
        <time
          dateTime={at}
          className="shrink-0 text-right font-mono text-meta text-muted-foreground"
        >
          {time.format(new Date(at))}
        </time>
      </button>
    </li>
  )
}

/**
 * „Twoje sprawdzenia” under the form (DESIGN_SYSTEM.md 6.1, point 5): this tab's results,
 * newest first, each a button that opens its card. The list markup follows the design-system
 * `CheckHistory` without its sign-in block, which belongs to signed-in history (frontend/017).
 *
 * @param props.items - The saved checks, newest first.
 * @param props.onOpen - Opens the result of one check.
 * @returns The history section.
 * @feature US-SPR-09, US-BEZ-05, F-01, F-20
 */
export function SessionHistory({
  items,
  onOpen,
}: {
  items: SavedCheck[]
  onOpen: (checkId: string) => void
}) {
  return (
    <section aria-labelledby="meritum-history" className="grid min-w-0 max-w-180 gap-2">
      <h2 id="meritum-history" className="text-body font-bold">
        {t.history.title}
      </h2>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-2.5 text-small text-muted-foreground">
          {t.history.empty}
        </p>
      ) : (
        <ul aria-labelledby="meritum-history" className="min-w-0 divide-y border-y">
          {items.map(({ at, result }) => (
            <Entry key={result.check_id} at={at} result={result} onOpen={onOpen} />
          ))}
        </ul>
      )}
      <p className="text-meta text-muted-foreground text-pretty">{t.history.session_note}</p>
    </section>
  )
}
