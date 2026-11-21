import { cn } from "@/lib/utils"

import { t } from "./copy"
import { MeritumMark } from "./meritum-mark"

export type CheckButtonState = "idle" | "pending" | "done"

/**
 * "Sprawdź" in a post's action bar (DESIGN_SYSTEM.md 6.2). At rest it takes the host's icon colour;
 * the post's content is sent only after the click.
 */
export function CheckButton({ state = "idle", onClick, className }: { state?: CheckButtonState; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "pending"}
      aria-busy={state === "pending"}
      title={t.extension.page_hint}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-[var(--host-button-radius,var(--radius-pill))] px-2.5 font-sans text-small font-semibold",
        "text-[var(--host-icon,var(--muted-foreground))] transition-colors hover:bg-verified-surface hover:text-verified-foreground",
        "focus-visible:bg-verified-surface focus-visible:text-verified-foreground disabled:cursor-progress",
        state === "done" && "text-verified-foreground",
        className,
      )}
    >
      <MeritumMark className={cn("size-[18px]", state === "pending" && "animate-pulse motion-reduce:animate-none")} />
      {state === "done" ? t.extension.checked : state === "pending" ? t.form.checking : t.extension.check}
    </button>
  )
}
