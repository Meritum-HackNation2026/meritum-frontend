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
 * The confirmation of „Usuń moje sprawdzenia”: a modal alert dialog with the page's own title
 * and what gets deleted (focus trapped, Esc and „Anuluj” close it and return focus to the
 * link). Deleting runs only after „Usuń”.
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-body font-bold">
            {t.form.delete_session_title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-small text-muted-foreground text-pretty">
            {t.form.delete_session_text}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-pill">
            {t.form.delete_session_cancel}
          </AlertDialogCancel>
          <AlertDialogAction className="rounded-pill" onClick={onConfirm}>
            {t.form.delete_session_yes}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
