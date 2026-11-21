import { Button } from "@/components/ui/button"
import type { Verdict } from "@/contracts/meritum"
import { cn } from "@/lib/utils"

import { t } from "./copy"
import { VerdictBadge } from "./verdict-badge"

export interface HistoryItem {
  checkId: string
  /** The masked question or its main claim, as the user will recognise it. */
  label: string
  /** Verdict of the main claim; absent for a non-verdict status. */
  verdict?: Verdict
  /** ISO time the answer arrived. */
  at: string
}

type Account = { signedIn: false; onSignIn: (provider: "google" | "microsoft") => void } | { signedIn: true; onSignOut: () => void; onDeleteHistory: () => void; onDeleteAccount: () => void }

const TIME = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" })

/**
 * "Twoje sprawdzenia" under the form (DESIGN_SYSTEM.md 6.1, points 5 and 6): newest first, a click opens the result.
 * Anonymous history lives in sessionStorage, signed-in history on the server; sign-in is optional.
 */
export function CheckHistory({ items, account, onOpen, className }: { items: HistoryItem[]; account: Account; onOpen: (checkId: string) => void; className?: string }) {
  return (
    <section aria-labelledby="meritum-history" className={cn("grid min-w-0 max-w-[720px] gap-2 font-sans", className)}>
      <h2 id="meritum-history" className="text-body font-bold">
        {t.history.title}
      </h2>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-2.5 text-small text-muted-foreground">{t.history.empty}</p>
      ) : (
        <ul className="min-w-0 divide-y divide-border/70 border-y border-border/70">
          {items.map((item) => (
            <li key={item.checkId}>
              <button
                type="button"
                onClick={() => onOpen(item.checkId)}
                className="flex w-full items-center gap-3 rounded-md px-1 py-2.5 text-left hover:bg-secondary/60 focus-visible:bg-secondary/60"
              >
                <span className="min-w-0 flex-1 truncate text-small">{item.label}</span>
                {item.verdict && <VerdictBadge verdict={item.verdict} size="sm" />}
                <time dateTime={item.at} className="w-11 shrink-0 text-right font-mono text-meta text-muted-foreground">
                  {TIME.format(new Date(item.at))}
                </time>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-meta text-muted-foreground text-pretty">{account.signedIn ? t.history.account_note : t.history.session_note}</p>

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
    </section>
  )
}
