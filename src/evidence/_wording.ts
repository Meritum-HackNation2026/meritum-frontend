import { t } from '@/components/meritum'
import type { CheckResult } from '@/contracts/meritum'

/**
 * The limits of the check, each once: the limitation codes worded from copy, or the limitation
 * texts for a result that carries no codes.
 *
 * @param result - The check result from the API.
 * @returns The lines to list under the limitations heading.
 * @feature US-SPR-04, F-17
 */
export function limitationTexts(result: CheckResult): string[] {
  const codes = result.limitation_codes ?? []
  const lines =
    codes.length > 0 ? codes.map((code) => t.limitation_code[code]) : (result.limitations ?? [])
  // the API may repeat a code (or a text); one line per limit
  return [...new Set(lines)]
}
