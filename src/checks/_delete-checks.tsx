import { useCallback, useRef } from 'react'
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
