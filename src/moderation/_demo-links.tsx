import { type ChangeEvent, type FocusEvent, useCallback, useId, useState } from 'react'
import { fill, formatDate, t } from '@/components/meritum'
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
import { DEMO_ACCOUNTS, DEMO_VALIDITIES, MS_PER_HOUR } from './constants'
import type { AdminApi, DemoAccount, DemoLink } from './ports-admin'

const copy = t.staff.admin.demo_links
type Issued = DemoLink & { account: DemoAccount }
const accountName = (account: DemoAccount) => copy[`account_${account}`]
const isAccount = (value: string): value is DemoAccount =>
  (DEMO_ACCOUNTS as readonly string[]).includes(value)

const selectAll = (e: FocusEvent<HTMLInputElement>) => e.currentTarget.select()

function LinkRow(props: {
  link: Issued
  onCopy: (url: string) => void
  onRevoke: (link: Issued) => void
}) {
  const { link } = props
  const nameId = useId()
  const copyUrl = useCallback(() => props.onCopy(link.url), [props, link.url])
  const revoke = useCallback(() => props.onRevoke(link), [props, link])
  return (
    <li className="grid gap-2 border-t border-border/70 py-3">
      <p className="text-small">
        <span id={nameId} className="font-semibold">
          {accountName(link.account)}
        </span>
        <span className="text-muted-foreground">
          {' · '}
          {fill(copy.expires, { date: formatDate(link.expiresAt) })}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          readOnly
          aria-label={copy.url}
          value={link.url}
          onFocus={selectAll}
          className="h-11 min-w-0 flex-1 basis-64 rounded-md font-mono text-small"
        />
        <Button
          type="button"
          size="sm"
          className="rounded-pill"
          aria-describedby={nameId}
          onClick={copyUrl}
        >
          {copy.copy}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-pill"
              aria-describedby={nameId}
            >
              {copy.revoke}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent aria-describedby={undefined}>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-body font-bold text-pretty">
                {fill(copy.revoke_confirm, { account: accountName(link.account) })}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-pill">
                {t.extension.popup_delete_cancel}
              </AlertDialogCancel>
              <AlertDialogAction className="rounded-pill" onClick={revoke}>
                {copy.revoke}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  )
}

function IssueForm({ onIssue }: { onIssue: (account: DemoAccount, hours: number) => void }) {
  const [account, setAccount] = useState<DemoAccount>('obywatel')
  const [hours, setHours] = useState<number>(DEMO_VALIDITIES[0].hours)
  const accountId = useId()
  const validityId = useId()
  const pickAccount = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    if (isAccount(e.target.value)) {
      setAccount(e.target.value)
    }
  }, [])
  const pickValidity = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setHours(Number(e.target.value))
  }, [])
  const submit = useCallback(() => onIssue(account, hours), [onIssue, account, hours])
  const select = 'w-full [&_select]:h-11 [&_select]:rounded-md [&_select]:text-body'
  return (
    <div className="grid items-end gap-3 sm:flex">
      <Field id={accountId} label={copy.account}>
        <NativeSelect id={accountId} value={account} onChange={pickAccount} className={select}>
          {DEMO_ACCOUNTS.map((a) => (
            <NativeSelectOption key={a} value={a}>
              {accountName(a)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field id={validityId} label={copy.validity}>
        <NativeSelect id={validityId} value={hours} onChange={pickValidity} className={select}>
          {DEMO_VALIDITIES.map((v) => (
            <NativeSelectOption key={v.key} value={v.hours}>
              {copy[v.key]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Button
        type="button"
        size="lg"
        className="h-11 justify-self-start rounded-pill"
        onClick={submit}
      >
        {copy.issue}
      </Button>
    </div>
  )
}

/**
 * „Linki demo”: issues a reusable link into the citizen's or the administrator's technical
 * account, copies it to the clipboard, lists the links issued since the page opened (the API
 * has no list, and shows an address once) and revokes one after a confirmation.
 *
 * @param props.api - The administration API.
 * @returns The section.
 * @feature US-OBS-06, US-MOD-05, F-28, F-25
 */
export function DemoLinksSection({ api }: { api: AdminApi }) {
  const [links, setLinks] = useState<Issued[]>([])
  const [notice, setNotice] = useState<Notice>(null)
  const issue = useCallback(
    async (account: DemoAccount, hours: number) => {
      const expiresAt = new Date(Date.now() + hours * MS_PER_HOUR).toISOString()
      const outcome = await api.issueDemoLink(account, expiresAt)
      if (typeof outcome === 'string') {
        const text =
          outcome === 'unavailable' ? copy.unavailable : refusalText(outcome, t.errors.offline)
        return setNotice({ kind: 'error', text })
      }
      setLinks((list) => [{ ...outcome.link, account }, ...list])
      setNotice({ kind: 'done', text: fill(copy.issued, { account: accountName(account) }) })
    },
    [api],
  )
  const copyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setNotice({ kind: 'done', text: copy.copied })
    } catch {
      setNotice({ kind: 'error', text: copy.copy_failed })
    }
  }, [])
  const revoke = useCallback(
    async (link: Issued) => {
      const outcome = await api.revokeDemoLink(link.account, link.url)
      if (outcome !== 'saved' && outcome !== 'not_found') {
        return setNotice({ kind: 'error', text: refusalText(outcome, t.errors.offline) })
      }
      setLinks((list) => list.filter((l) => l.url !== link.url))
      const text =
        outcome === 'saved'
          ? fill(copy.revoked, { account: accountName(link.account) })
          : copy.not_found
      setNotice({ kind: 'done', text })
    },
    [api],
  )
  return (
    <AdminSection title={copy.title} lead={copy.lead} notice={notice}>
      {links.length === 0 ? (
        <p className={tableClass.empty}>{copy.empty}</p>
      ) : (
        <ul>
          {links.map((link) => (
            <LinkRow key={link.url} link={link} onCopy={copyUrl} onRevoke={revoke} />
          ))}
        </ul>
      )}
      <IssueForm onIssue={issue} />
    </AdminSection>
  )
}
