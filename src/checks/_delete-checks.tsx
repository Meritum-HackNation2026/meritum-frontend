import { t } from '@/components/meritum'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * The confirmation of „Usuń moje sprawdzenia”: a modal alert dialog (focus trapped, Esc and
 * „Anuluj” close it and return focus to the link). Deleting runs only after „Usuń”.
 *
 * @param props.open - Whether the dialog is shown.
 * @param props.onOpenChange - Called when the dialog opens or closes.
 * @param props.onConfirm - Called when the user confirms the deletion.
 * @returns The dialog.
 * @feature US-BEZ-05, F-20
 */
export function DeleteChecksDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent aria-describedby={undefined}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-body font-bold">
            {t.form.delete_session}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-pill">
            {t.extension.popup_delete_cancel}
          </AlertDialogCancel>
          <AlertDialogAction className="rounded-pill" onClick={onConfirm}>
            {t.extension.popup_delete_yes}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
