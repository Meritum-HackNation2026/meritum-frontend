import { useState } from 'react'
import { t } from '@/components/meritum'
import type { HandoffOutcome } from './ports'

/**
 * One hand-off as the card tracks it: the saved case number, the error to show, and whether
 * the request is still out. A new request clears the previous error; one already out blocks it.
 *
 * @param run - Sends the hand-off through the port.
 * @returns The case number, the error text, the pending flag and the sender.
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
 */
export function useHandoff(run: () => Promise<HandoffOutcome>) {
  const [outcome, setOutcome] = useState<HandoffOutcome | null>(null)
  const [pending, setPending] = useState(false)
  // a second click while one request is out does nothing; the button stays focusable
  const send = async () => {
    if (pending) {
      return
    }
    setPending(true)
    setOutcome(null)
    setOutcome(await run())
    setPending(false)
  }
  const caseId = typeof outcome === 'object' && outcome !== null ? outcome.caseId : null
  const error = typeof outcome === 'string' ? t.errors[outcome] : null
  return { caseId, error, pending, send }
}

/**
 * Focuses a message the moment it appears, so a keyboard user whose button just went away
 * lands on what replaced it.
 *
 * @param node - The mounted message, or null when it unmounts.
 * @feature US-MOD-03, US-MOD-06, F-24, F-17, ADR-22
 */
export function focusOnMount(node: HTMLElement | null): void {
  node?.focus()
}
