/**
 * What every `CheckPage` in these tests needs beside its ports: a check whose run has ended
 * (a technical failure, kept in the tab), so the field „Sprawdź kolejną informację” shows, and
 * a rail rendered in place.
 *
 * @feature none (infrastructure)
 */
import type { ReactNode } from 'react'
import { saveCheck } from '@/checks'
import examples from '@/contracts/examples.json'
import type { CheckResult } from '@/contracts/meritum'

const failure = examples['CheckResult.failure'] as CheckResult

/**
 * Keeps the ended check in this tab and returns the page's address props for it.
 *
 * @returns `checkId`, no-op `onOpen` and `onNew`, and a `rail` that renders in place.
 * @feature none (infrastructure)
 */
export function finishedCheck() {
  saveCheck(failure)
  return {
    checkId: failure.check_id,
    onOpen: () => undefined,
    onNew: () => undefined,
    rail: (content: ReactNode) => content,
  }
}
