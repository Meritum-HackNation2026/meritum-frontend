import { useCallback, useRef, useState } from 'react'
import { t } from '@/components/meritum'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { forgetChecks } from './_history'
import type { SessionEraser } from './ports'

/**
 * The confirmation of „Usuń moje sprawdzenia” (or, with `account`, of „Usuń konto i historię”): a modal alert dialog with the page's own title
 * and what gets deleted (focus trapped, Esc and „Anuluj” close it and return focus to the
 * link). Deleting runs only after „Usuń”.
 *
 * @param props.open - Whether the dialog is shown.
 * @param props.onOpenChange - Called when the dialog opens or closes.
 * @param props.onConfirm - Called when the user confirms the deletion.
 * @param props.account - Confirms „Usuń konto i historię” instead, with the account texts.
 * @returns The dialog.
 * @feature US-BEZ-05, F-20
 */
export function DeleteChecksDialog({
  open,
  onOpenChange,
  onConfirm,
  account = false,
}: {
  account?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  // controlled without a Trigger, so Radix has nothing to return focus to on close
  const returnTo = useRef<HTMLElement | null>(null)
  const remember = useCallback(() => {
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }, [])
  const restore = useCallback((event: Event) => {
    if (returnTo.current?.isConnected) {
      event.preventDefault()
      returnTo.current.focus()
    }
  }, [])
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onOpenAutoFocus={remember} onCloseAutoFocus={restore}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-body font-bold">
            {account ? t.account.delete_account_title : t.form.delete_session_title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-small text-muted-foreground text-pretty">
            {account ? t.account.delete_account_text : t.form.delete_session_text}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-pill">
            {t.form.delete_session_cancel}
          </AlertDialogCancel>
          <AlertDialogAction className="rounded-pill" onClick={onConfirm}>
            {account ? t.account.delete_account_yes : t.form.delete_session_yes}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * „Usuń moje sprawdzenia” (or the account's history or the account): the confirmation, the
 * deletion and its outcome. The tab's copies go only after the server deleted its records.
 *
 * @param eraser - Deletes the records on the server.
 * @param onErased - Called after the deletion; empties the inbox.
 * @param onEmptied - Clears what the page shows of the history.
 * @returns Whether the dialog is open and its setter, `ask`, the outcome and `erase`.
 * @feature US-BEZ-05, US-SPR-10, F-20, F-31
 */
export function useErase(
  eraser: SessionEraser,
  onErased: () => Promise<void> | void,
  onEmptied: () => void,
) {
  const [confirming, setConfirming] = useState(false)
  const [erased, setErased] = useState<boolean | null>(null)
  const erase = useCallback(async () => {
    setErased(null)
    const ok = await eraser.erase()
    // the local copies go only once the server deleted its records, so a failure can be retried
    if (ok) {
      forgetChecks()
      onEmptied()
      await onErased()
    }
    setErased(ok)
  }, [eraser, onErased, onEmptied])
  const ask = useCallback(() => setConfirming(true), [])
  return { confirming, setConfirming, ask, erased, erase }
}
