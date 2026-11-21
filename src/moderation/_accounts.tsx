import { type ChangeEvent, type FormEvent, useCallback, useId, useState } from 'react'
import { fill, t } from '@/components/meritum'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { AdminSection, Field, type Notice, refusalText, tableClass } from './_admin-parts'
import { EMAIL_PATTERN, GRANTABLE_ROLES, MAX_EMAIL_CHARS } from './constants'
import type { AdminApi, StaffAccount, StaffRole } from './ports'

const copy = t.staff.admin.accounts
const byEmail = (a: StaffAccount, b: StaffAccount) => a.email.localeCompare(b.email)
const isRole = (value: string): value is StaffRole =>
  (GRANTABLE_ROLES as readonly string[]).includes(value)

function AccountRow({ email, role, onRemove }: StaffAccount & { onRemove: (e: string) => void }) {
  const confirm = useCallback(() => onRemove(email), [onRemove, email])
  const emailId = useId()
  return (
    <tr className={tableClass.row}>
      <td id={emailId} className={`${tableClass.td} break-all font-semibold`}>
        {email}
      </td>
      <td className={tableClass.td}>{t.moderation.role[role]}</td>
      <td className="py-1 text-right">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-pill" aria-describedby={emailId}>
              {copy.remove}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent aria-describedby={undefined}>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-body font-bold text-pretty">
                {fill(copy.remove_confirm, { email })}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-pill">
                {t.extension.popup_delete_cancel}
              </AlertDialogCancel>
              <AlertDialogAction className="rounded-pill" onClick={confirm}>
                {copy.remove}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </td>
    </tr>
  )
}

function AccountList(props: { accounts: StaffAccount[]; onRemove: (email: string) => void }) {
  if (props.accounts.length === 0) {
    return <p className={tableClass.empty}>{copy.empty}</p>
  }
  return (
    <div className={tableClass.wrap}>
      <table className={tableClass.table}>
        <thead>
          <tr className={tableClass.head}>
            <th scope="col" className={tableClass.th}>
              {copy.email}
            </th>
            <th scope="col" className={tableClass.th}>
              {copy.role}
            </th>
          </tr>
        </thead>
        <tbody>
          {props.accounts.map((account) => (
            <AccountRow key={account.email} {...account} onRemove={props.onRemove} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// The grant form: an address and a role; checks the address before calling onAdd.
function GrantForm({ onAdd }: { onAdd: (account: StaffAccount) => Promise<boolean> }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('moderator')
  const emailId = useId()
  const roleId = useId()
  const editEmail = useCallback((e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value), [])
  const pickRole = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target
    if (isRole(value)) {
      setRole(value)
    }
  }, [])
  const submit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      if (await onAdd({ email: email.trim(), role })) {
        setEmail('')
      }
    },
    [onAdd, email, role],
  )
  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto]"
    >
      <Field id={emailId} label={copy.email}>
        <Input
          id={emailId}
          type="email"
          autoComplete="off"
          maxLength={MAX_EMAIL_CHARS}
          value={email}
          onChange={editEmail}
          className={tableClass.input}
        />
      </Field>
      <Field id={roleId} label={copy.role}>
        <NativeSelect
          id={roleId}
          value={role}
          onChange={pickRole}
          className="w-full [&_select]:h-11 [&_select]:rounded-md [&_select]:text-body"
        >
          {GRANTABLE_ROLES.map((r) => (
            <NativeSelectOption key={r} value={r}>
              {t.moderation.role[r]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Button type="submit" size="lg" className="h-11 justify-self-start rounded-pill">
        {copy.add}
      </Button>
    </form>
  )
}

/**
 * „Konta personelu”: the granted accounts with „Odbierz dostęp” (asked first in a dialog) and
 * a form that grants a role to an e-mail address. The address is checked against the API's
 * pattern and the list before anything is sent.
 *
 * @param props.api - The administration API.
 * @param props.initial - The accounts from the loader; null when the API did not give them.
 * @returns The section.
 * @feature US-MOD-05, F-25
 */
export function AccountsSection({
  api,
  initial,
}: {
  api: AdminApi
  initial: StaffAccount[] | null
}) {
  const [accounts, setAccounts] = useState(initial)
  const [notice, setNotice] = useState<Notice>(null)
  const add = useCallback(
    async (account: StaffAccount) => {
      const fail = (text: string) => {
        setNotice({ kind: 'error', text })
        return false
      }
      if (!EMAIL_PATTERN.test(account.email)) {
        return fail(copy.invalid_email)
      }
      const address = account.email.toLowerCase()
      if (accounts?.some((a) => a.email.toLowerCase() === address)) {
        return fail(copy.duplicate)
      }
      const outcome = await api.grant(account)
      if (outcome !== 'saved') {
        return fail(refusalText(outcome, copy.invalid_email))
      }
      setAccounts((list) => [...(list ?? []), account].sort(byEmail))
      const role = t.moderation.role[account.role]
      setNotice({ kind: 'done', text: fill(copy.added, { email: account.email, role }) })
      return true
    },
    [api, accounts],
  )
  const remove = useCallback(
    async (removed: string) => {
      const outcome = await api.revoke(removed)
      if (outcome !== 'saved') {
        return setNotice({ kind: 'error', text: refusalText(outcome, t.errors.offline) })
      }
      setAccounts((list) => (list ?? []).filter((a) => a.email !== removed))
      setNotice({ kind: 'done', text: fill(copy.removed, { email: removed }) })
    },
    [api],
  )
  return (
    <AdminSection title={copy.title} lead={copy.lead} notice={notice}>
      {accounts === null ? (
        <p className="text-body">{t.errors.offline}</p>
      ) : (
        <>
          <AccountList accounts={accounts} onRemove={remove} />
          <GrantForm onAdd={add} />
        </>
      )}
    </AdminSection>
  )
}
