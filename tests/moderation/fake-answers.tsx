/**
 * A fake moderator-answer port for tests of the case detail: records each send and answers
 * with a chosen outcome.
 *
 * @feature US-MOD-07, F-39, ADR-06
 */
import type { AnswerApi, AnswerDraft, AnswerOutcome, AnswerSource } from '@/moderation'

/**
 * The catalogue sources the fake offers.
 *
 * @feature US-MOD-07, F-39, ADR-06
 */
export const sources: AnswerSource[] = [
  { id: 'src-1', title: 'Rozporządzenie w sprawie płatności', publisher: 'Ministerstwo Finansów' },
  { id: 'src-2', title: 'Komunikat o gotówce', publisher: 'NBP' },
]

/**
 * @param outcome - What every send gives.
 * @param catalogue - What the source list gives; null means it could not be read.
 * @returns The port and the sends it received.
 * @feature US-MOD-07, F-39, ADR-06
 */
export function fakeAnswers(
  outcome: AnswerOutcome = 'sent',
  catalogue: AnswerSource[] | null = sources,
) {
  const calls: { caseId: string; draft: AnswerDraft }[] = []
  const api: AnswerApi = {
    sources: () => Promise.resolve(catalogue),
    send(caseId, draft) {
      calls.push({ caseId, draft })
      return Promise.resolve(outcome)
    },
  }
  return { api, calls }
}
