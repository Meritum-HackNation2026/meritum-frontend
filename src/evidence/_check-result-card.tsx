import { MeritumLabel, ResultCard, t } from '@/components/meritum'
import type { CheckResult } from '@/contracts/meritum'
import { ClaimBlock } from './_claim-block'
import { limitationTexts, statusText } from './_wording'

/**
 * Result card of one check (DESIGN_SYSTEM.md 6.4): one block per claim, then the limits of
 * the check and the AI line. Each part is its own component, so later sections (non-verdict
 * states, actions) add one component and one line here. `message` is never shown: the
 * status line comes from `failure_code` or the status through copy, and the limitations from
 * `limitation_codes` through copy (the API's limitation texts only when it sent no codes).
 *
 * @param props.result - The check result from the API.
 * @returns The result card.
 * @feature US-SPR-04, US-SPR-05, US-ZRD-01, US-ZRD-02, US-ZRD-03, US-ZRD-06, F-17
 */
export function CheckResultCard({ result }: { result: CheckResult }) {
  if (result.status !== 'done') {
    // shortcut: the design-system ResultCard draws non-verdict states and shows `message`, so
    // it gets the copy text there; drop it once meritum-frontend#25 draws them here
    const worded = { ...result, message: statusText(result), limitations: limitationTexts(result) }
    return <ResultCard result={worded} />
  }
  return (
    <section
      aria-label={t.result.label}
      className="min-w-0 rounded-lg border border-border bg-card text-card-foreground animate-rise"
    >
      <header className="flex items-center px-3.5 pt-3">
        <MeritumLabel />
      </header>
      <h2 className="sr-only">{t.result.claims_title}</h2>
      {result.claims?.map((claim) => (
        <ClaimBlock key={claim.claim} claim={claim} />
      ))}
      <footer className="mt-3 grid gap-1.5 border-t border-border px-3.5 pt-2.5 pb-3.5 text-meta text-muted-foreground">
        <Limitations items={limitationTexts(result)} />
        <p>{t.result.ai_disclosure}</p>
        {/* actions and escalation (meritum-frontend#23) */}
      </footer>
    </section>
  )
}

function Limitations({ items }: { items: readonly string[] }) {
  if (items.length === 0) {
    return null
  }
  return (
    <div>
      <p className="font-semibold">{t.result.limitations}</p>
      <ul className="list-disc pl-4">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
