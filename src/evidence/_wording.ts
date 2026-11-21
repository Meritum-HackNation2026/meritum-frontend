import { t } from '@/components/meritum'
import type { CheckResult } from '@/contracts/meritum'

/**
 * The line under a non-verdict status, from copy: the failure code's text for a technical
 * failure that has one, otherwise the status hint. `message` is never used, since it is not user-facing.
 *
 * @param result - The check result from the API.
 * @returns The line, or null for a result with verdicts.
 * @feature US-SPR-04, F-17
 */
export function statusText(result: CheckResult): string | null {
  if (result.status === 'done') {
    return null
  }
  const code = result.status === 'technical_failure' ? result.failure_code : null
  return code ? t.failure_code[code] : t.status_hint[result.status]
}

/**
 * The limits of the check: the limitation codes worded from copy, or the limitation texts
 * for a result that carries no codes.
 *
 * @param result - The check result from the API.
 * @returns The lines to list under the limitations heading.
 * @feature US-SPR-04, F-17
 */
export function limitationTexts(result: CheckResult): string[] {
  const codes = result.limitation_codes ?? []
  return codes.length > 0
    ? codes.map((code) => t.limitation_code[code])
    : (result.limitations ?? [])
}
