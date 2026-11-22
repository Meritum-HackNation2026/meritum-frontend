import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { Verdict } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { t } from "./copy"
import { VerdictBadge } from "./verdict-badge"

export interface HistoryItem {
  checkId: string
  /** The masked question or its main claim, as the user will recognise it. */
  label: string
  /** Verdict of the main claim; absent for a non-verdict status or a check in progress. */
  verdict?: Verdict
  /** The check is still running; the row says so in a word instead of a badge. */
  pending?: boolean
  /** ISO time the answer arrived. */
  at: string
}

type Account = { signedIn: false; onSignIn: (provider: "google" | "microsoft") => void } | { signedIn: true; onSignOut: () => void; onDeleteHistory: () => void; onDeleteAccount: () => void }

const TIME = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" })

/**
 * "Twoje sprawdzenia" in the rail of the check page (DESIGN_SYSTEM.md 6.1 points 5 and 6, 6.8): newest first, a click
 * opens the result. Each check is a row: the question on two lines, then the verdict badge (or the word for a check
 * in progress) and the time. No rules between rows; a row highlights on hover. `onNew` adds „Nowe sprawdzenie” above.
 * Anonymous history lives in sessionStorage, signed-in history on the server; sign-in is optional.
 * Without `account` (or with `account={false}`) the sign-in block is left out, for a page without accounts (design-system#74).
 *
 * @param props - History items, optional account (`false` or left out: no sign-in block), `onOpen`, optional `onNew` and CSS class.
 * @returns The history section.
 * @feature US-BEZ-05, US-SPR-01, F-20
 */
export function CheckHistory({
  items,
  account,
  onOpen,
  onNew,
  className,
}: {
  items: HistoryItem[]
  account?: Account | false
  onOpen: (checkId: string) => void
  onNew?: () => void
  className?: string
}) {
  return (
    <section aria-labelledby="meritum-history" className={cn("grid min-w-0 content-start gap-3 font-sans", className)}>
      {onNew && (
        <Button variant="outline" className="w-fit rounded-pill" onClick={onNew}>
          <Plus aria-hidden="true" className="size-4" />
          {t.check_page.new}
        </Button>
      )}
      <h2 id="meritum-history" className="text-body font-bold">
        {t.history.title}
      </h2>
      {items.length === 0 ? (
        <p className="text-small text-muted-foreground text-pretty">{t.history.empty}</p>
      ) : (
        <ul className="-mx-3 grid min-w-0 gap-1">
          {items.map((item) => (
            <li key={item.checkId}>
              <button
                type="button"
                onClick={() => onOpen(item.checkId)}
                className="grid w-full gap-2 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
              >
                <span className="line-clamp-2 min-w-0 text-small break-words text-pretty">{item.label}</span>
                <span className="flex items-center justify-between gap-3">
                  {item.verdict ? (
                    <VerdictBadge verdict={item.verdict} size="sm" />
                  ) : (
                    item.pending && <span className="text-meta text-muted-foreground">{t.analysis.step_status.active}</span>
                  )}
                  <time dateTime={item.at} className="ml-auto shrink-0 text-meta tabular-nums text-muted-foreground">
                    {TIME.format(new Date(item.at))}
                  </time>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-meta text-muted-foreground text-pretty">{account && account.signedIn ? t.history.account_note : t.history.session_note}</p>

      {account && (
        <div className="mt-2 grid gap-2">
          {account.signedIn ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="rounded-pill" onClick={account.onDeleteHistory}>
                {t.history.delete}
              </Button>
              <Button size="sm" variant="outline" className="rounded-pill" onClick={account.onSignOut}>
                {t.account.sign_out}
              </Button>
              <Button size="sm" variant="ghost" className="rounded-pill text-scam-foreground" onClick={account.onDeleteAccount}>
                {t.account.delete_account}
              </Button>
            </div>
          ) : (
            <>
              <p className="text-small text-pretty">{t.account.optional}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="rounded-pill" onClick={() => account.onSignIn("google")}>
                  {t.account.sign_in_google}
                </Button>
                <Button size="sm" variant="outline" className="rounded-pill" onClick={() => account.onSignIn("microsoft")}>
                  {t.account.sign_in_microsoft}
                </Button>
              </div>
            </>
          )}
          <p className="text-meta text-muted-foreground text-pretty">{t.account.stored}</p>
        </div>
      )}
    </section>
  )
}
