import type { CheckRequest } from '@/contracts/meritum'

/**
 * What the API said about a sent check: accepted, or the `errors` key of copy/pl.json to show.
 *
 * @feature US-SPR-01, F-01
 */
export type SendOutcome = 'accepted' | 'rate_limited' | 'busy' | 'offline'

/**
 * Sends a validated check to the verification API.
 *
 * @feature US-SPR-01, F-01, F-21
 */
export interface CheckSender {
  /**
   * Sends one check; never throws, a failure is an outcome.
   *
   * @param request - The validated check request.
   * @returns The outcome to show next to the form.
   */
  send(request: CheckRequest): Promise<SendOutcome>
}
