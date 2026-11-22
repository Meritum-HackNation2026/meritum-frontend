import { type ReactNode, useId } from 'react'
import { t } from '@/components/meritum'
import type { AdminOutcome } from './ports-admin'

const refusals: Record<Exclude<AdminOutcome, 'saved' | 'invalid'>, string> = {
  expired: t.staff.sign_in.session_expired,
  no_access: t.staff.sign_in.no_access,
  failed: t.errors.offline,
}

/**
 * The text of a failed administration write.
 *
 * @param outcome - What the API did; never `saved`.
 * @param invalid - The text for an entry the API refused.
 * @returns The message to show under the form.
 * @feature US-MOD-05, F-25
 */
export function refusalText(outcome: Exclude<AdminOutcome, 'saved'>, invalid: string): string {
  return outcome === 'invalid' ? invalid : refusals[outcome]
}

/**
 * What the last action of a section said: a confirmation or an error.
 *
 * @feature US-MOD-05, F-25
 */
export type Notice = { kind: 'done' | 'error'; text: string } | null

/**
 * One block of the administration page: its heading, lead, the list and form, and the last
 * notice in a live region, so a screen reader hears what changed.
 *
 * @param props.title - The heading, which also names the region.
 * @param props.lead - What the block is for.
 * @param props.notice - The last confirmation or error.
 * @param props.children - The list and the form.
 * @returns The section.
 * @feature US-MOD-05, F-25
 */
export function AdminSection(props: {
  title: string
  lead: string
  notice: Notice
  children: ReactNode
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <h2 id={id} className="text-title font-bold text-balance">
        {props.title}
      </h2>
      <p className="max-w-prose text-body text-muted-foreground text-pretty">{props.lead}</p>
      {props.children}
      <p role="status" className="text-body text-pretty empty:hidden">
        {props.notice?.kind === 'done' ? props.notice.text : null}
      </p>
      <p role="alert" className="text-body text-pretty empty:hidden">
        {props.notice?.kind === 'error' ? props.notice.text : null}
      </p>
    </section>
  )
}

/**
 * A form field: the visible label for the control with `id`, and an optional hint under it
 * that the control names with `aria-describedby={hintId}`.
 *
 * @param props.id - The id of the control.
 * @param props.label - The visible label.
 * @param props.hint - The hint, if any.
 * @param props.hintId - The id of the hint.
 * @param props.children - The control.
 * @returns The field.
 * @feature US-MOD-05, F-25
 */
export function Field(props: {
  id: string
  label: string
  hint?: string
  hintId?: string
  children: ReactNode
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={props.id} className="text-small font-semibold">
        {props.label}
      </label>
      {props.children}
      {props.hint && (
        <p id={props.hintId} className="text-small text-muted-foreground text-pretty">
          {props.hint}
        </p>
      )}
    </div>
  )
}

/**
 * Classes of the lists on the administration page, matching the case queue's table.
 *
 * @feature US-MOD-05, F-25
 */
export const tableClass = {
  wrap: 'overflow-x-auto',
  table: 'w-full border-collapse text-small',
  head: 'text-left text-meta text-muted-foreground',
  th: 'py-2 pr-4 font-normal',
  row: 'border-t border-border/70 align-middle',
  td: 'py-2 pr-4',
  empty:
    'rounded-md border border-dashed border-border px-3 py-2.5 text-small text-muted-foreground',
  input: 'h-11 rounded-md text-body',
}
