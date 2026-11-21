import { fill, formatDate, t } from '@/components/meritum'
import type { ClaimResult, WouldChangeVerdict } from '@/contracts/meritum'
import { newestDateForWarning, showsArchivalWarning } from './_chain'

/**
 * The warning that the newest evidence is old for the date the claim is about, with both dates
 * in words, never a count of days (the strength premises name them when that section shows). Neutral, on its own row, never red; laws in force, pages
 * updated in place and past events never get it.
 *
 * @param props.claim - One claim result from the API.
 * @returns The warning, or null.
 * @feature US-ZRD-05, US-ZRD-10, F-17, ADR-25
 */
export function ArchivalNote({ claim }: { claim: ClaimResult }) {
  if (!showsArchivalWarning(claim)) {
    return null
  }
  const newest = newestDateForWarning(claim)
  return (
    <p className="mt-2.5 border-t border-border/70 pt-2 text-small text-pretty">
      {t.result.archival}
      {newest && (
        <>
          {' '}
          {fill(t.result.newest, {
            source_date: formatDate(newest),
            claim_date: formatDate(claim.claim_date),
            claim_date_source: t.result.claim_date_source[claim.claim_date_source],
          })}
        </>
      )}
    </p>
  )
}

/**
 * „Co zmieniłoby werdykt”: the kinds of evidence the result says are missing, worded from
 * copy/pl.json. The card shows the codes the API computed and never adds its own.
 *
 * @param props.codes - `ClaimResult.would_change_verdict`.
 * @returns The list, or null when there are no codes.
 * @feature US-ZRD-11, F-17
 */
export function WouldChangeSection({ codes }: { codes?: WouldChangeVerdict | undefined }) {
  if (!codes || codes.length === 0) {
    return null
  }
  return (
    <div className="mt-2.5">
      <h4 className="font-semibold text-meta text-muted-foreground">
        {t.result.what_would_change}
      </h4>
      <ul className="list-disc pl-4 text-small text-pretty">
        {codes.map((code) => (
          <li key={code}>{t.would_change_verdict[code]}</li>
        ))}
      </ul>
    </div>
  )
}
