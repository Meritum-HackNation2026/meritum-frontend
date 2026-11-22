/**
 * A fake hand-off port for tests of the result card and page: records each call and answers
 * every one with the same outcome.
 *
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
 */
import type { Handoff, HandoffOutcome } from '@/moderation'

type HandoffCall = {
  kind: 'escalate' | 'dispute'
  checkId: string
  claimIndex: number
  text?: string
}

/**
 * A hand-off port that answers every call with `outcome`.
 *
 * @param outcome - What every hand-off gives; `not_saved` when the test never hands anything off.
 * @returns The port and the list of calls it received.
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
 */
export function fakeHandoff(outcome: HandoffOutcome = 'not_saved') {
  const calls: HandoffCall[] = []
  const handoff: Handoff = {
    escalate(checkId, claimIndex) {
      calls.push({ kind: 'escalate', checkId, claimIndex })
      return Promise.resolve(outcome)
    },
    dispute(checkId, claimIndex, text) {
      calls.push({ kind: 'dispute', checkId, claimIndex, text })
      return Promise.resolve(outcome)
    },
  }
  return { handoff, calls }
}
