import { useCallback, useState } from 'react'
import { t } from '@/components/meritum'
import type { HandoffOutcome } from './ports'

/**
 * One hand-off as the card tracks it: the saved case number, the error to show, and whether
 * the request is still out. A new request clears the previous error.
 *
 * @param run - Sends the hand-off through the port.
 * @returns The case number, the error text, the pending flag and the sender.
 * @feature US-MOD-03, US-MOD-06, F-24, ADR-22
 */
export function useHandoff(run: () => Promise<HandoffOutcome>) {
  const [outcome, setOutcome] = useState<HandoffOutcome | null>(null)
  const [pending, setPending] = useState(false)
  const send = useCallback(async () => {
    setPending(true)
    setOutcome(null)
    setOutcome(await run())
    setPending(false)
  }, [run])
  const caseId = typeof outcome === 'object' && outcome !== null ? outcome.caseId : null
  const error = typeof outcome === 'string' ? t.errors[outcome] : null
  return { caseId, error, pending, send }
}

/**
 * Focuses a message the moment it appears, so a keyboard user whose button just went away
 * lands on what replaced it.
 *
 * @param node - The mounted message, or null when it unmounts.
 * @feature US-MOD-03, US-MOD-06, F-24
 */
export function focusOnMount(node: HTMLElement | null): void {
  node?.focus()
}
