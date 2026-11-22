import { askedChecks, savedChecks } from './_history'
import type { AccountCheck } from './ports'

/** One check of this tab: its id, when it was asked and, if this tab sent it, its question. */
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
