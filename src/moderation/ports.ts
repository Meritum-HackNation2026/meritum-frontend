/**
 * What a hand-off to the moderators gave: the number of the saved case (created or joined,
 * shown the same), or the `errors` key of copy/pl.json when no case was saved.
 *
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
 */
export type HandoffOutcome = { caseId: string } | 'rate_limited' | 'busy' | 'offline'

/**
 * Hands one claim of a finished check to the moderators.
 *
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
 */
export interface Handoff {
  /**
   * „Przekaż moderatorom”: turns a recommendation into a saved case; never throws.
   *
   * @param checkId - The finished check.
   * @param claimIndex - The claim's position in the check's result.
   * @returns The saved case, or why there is none.
   */
  escalate(checkId: string, claimIndex: number): Promise<HandoffOutcome>
  /**
   * „Zgłoś błąd”: opens or joins a case with reason `user_dispute`; never throws.
   *
   * @param checkId - The finished check.
   * @param claimIndex - The claim's position in the check's result.
   * @param justification - What the person thinks is wrong; blank means none.
   * @returns The saved case, or why there is none.
   */
  dispute(checkId: string, claimIndex: number, justification: string): Promise<HandoffOutcome>
}
