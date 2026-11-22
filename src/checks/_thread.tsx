import { useEffect, useRef } from 'react'
import { Question, Reply, t } from '@/components/meritum'
import type { Handoff } from '@/moderation'
import { askedChecks, savedChecks } from './_history'
import { PageArchive } from './_page-archive'
import { ResultPage } from './_result-page'
import { LINK_QUESTION } from './archive/constants'
import type { PageArchives } from './archive/ports'
import type { AccountCheck, ProgressSource, ResultReader } from './ports'

/** One turn of the conversation: a check, when it was asked and, if this tab sent it, its question. */
type Turn = { checkId: string; at: string; question?: string; answeredAt?: string | undefined }

/**
 * This tab's checks as turns, oldest first: the sent ones with their questions and the time
 * their answer arrived, results kept without a question (opened by link) sorted by the time
 * they were kept but shown without a time, since that is when the page showed them, not when
 * the check was made (issue 127), and the check of the address last when the tab
 * has neither.
 *
 * @param activeCheckId - The check of the result address, if any.
 * @returns The turns to show.
 * @feature US-SPR-01, US-SPR-09, F-01
 */
export function conversationTurns(activeCheckId?: string): Turn[] {
  const saved = savedChecks()
  const answeredAt = new Map(saved.map(({ at, result }) => [result.check_id, at]))
  const asked = askedChecks()
  const askedIds = new Set(asked.map(({ checkId }) => checkId))
  const unasked = saved
    .filter(({ result }) => !askedIds.has(result.check_id))
    .map(({ at, result }) => ({ checkId: result.check_id, at }))
  const turns: Turn[] = [
    ...asked.map((turn) => ({ ...turn, answeredAt: answeredAt.get(turn.checkId) })),
    ...unasked,
  ].sort((a, b) => a.at.localeCompare(b.at))
  const isActiveMissing = activeCheckId && !turns.some(({ checkId }) => checkId === activeCheckId)
  return isActiveMissing ? [...turns, { checkId: activeCheckId, at: '' }] : turns
}

/**
 * This tab's turns with the signed-in account's checks from other devices, oldest first; a
 * check both know keeps the tab's own question and answer time, and one this tab did not send
 * takes the account's question and creation time (`received_at`).
 *
 * @param turns - This tab's turns.
 * @param remote - The account's checks from the server.
 * @returns The turns to show.
 * @feature US-SPR-10, F-31
 */
export function withAccountTurns(turns: Turn[], remote: AccountCheck[]): Turn[] {
  const fromAccount = new Map(remote.map((check) => [check.checkId, check]))
  const own = turns.map((turn) => {
    const check = turn.question === undefined ? fromAccount.get(turn.checkId) : undefined
    return check ? { ...turn, at: check.at, question: check.question } : turn
  })
  const known = new Set(turns.map(({ checkId }) => checkId))
  const others = remote
    .filter(({ checkId }) => !known.has(checkId))
    .map(({ checkId, at, question }) => ({ checkId, at, question }))
  // a turn with no time (the opened address, not yet kept) stays last
  const timeless = (turn: Turn) => (turn.at ? 0 : 1)
  return [...others, ...own].sort((a, b) => timeless(a) - timeless(b) || a.at.localeCompare(b.at))
}

/**
 * The conversation (DESIGN_SYSTEM.md 6.8): each turn is the citizen's question, then Meritum's
 * signed reply with the live steps or the kept card (`ResultPage`). On mount the check of the
 * address scrolls into view, otherwise the newest turn, without animation.
 *
 * @param props.turns - The turns, oldest first.
 * @param props.activeCheckId - The check of the result address, if any.
 * @param props.reader - Reads a check from the API (the `src/api` adapter in the app).
 * @param props.progress - Streams a check's steps (the `src/api` SSE adapter in the app).
 * @param props.handoff - Hands claims to the moderators (the `src/api` adapter in the app).
 * @param props.archives - Archives a checked link; no action without it.
 * @returns The thread.
 * @feature US-SPR-01, US-SPR-04, US-SPR-09, F-01, F-17
 */
export function Thread({
  turns,
  activeCheckId,
  reader,
  progress,
  handoff,
  archives,
}: {
  turns: Turn[]
  activeCheckId?: string | undefined
  reader: ResultReader
  progress: ProgressSource
  handoff: Handoff
  archives?: PageArchives | undefined
}) {
  const activeRef = useRef<HTMLLIElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const active = activeRef.current
    // happy-dom and old browsers have no scrollIntoView
    active?.scrollIntoView?.({ block: 'start' })
    if (!active) {
      endRef.current?.scrollIntoView?.({ block: 'end' })
    }
  }, [])
  return (
    <div className="min-w-0">
      <ol aria-label={t.conversation.label} className="grid min-w-0 gap-12">
        {turns.map(({ checkId, at, question, answeredAt }) => (
          <li
            key={checkId}
            ref={checkId === activeCheckId ? activeRef : undefined}
            className="grid min-w-0 scroll-mt-6 gap-4"
          >
            {question && (
              <Question at={at} isNew={checkId === activeCheckId}>
                {question}
              </Question>
            )}
            {archives && question && LINK_QUESTION.test(question.trim()) && (
              <PageArchive url={question.trim()} archives={archives} />
            )}
            <Reply at={answeredAt}>
              <ResultPage
                checkId={checkId}
                reader={reader}
                progress={progress}
                handoff={handoff}
                focusOnAnswer={checkId === activeCheckId}
              />
            </Reply>
          </li>
        ))}
      </ol>
      <div ref={endRef} />
    </div>
  )
}
