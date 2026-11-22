import { useCallback, useEffect, useState } from 'react'
import { t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import { LOGIN_PROVIDERS } from './constants'
import type { AccountCheck, AccountSession, CitizenAccount } from './ports'

const labels = {
  google: t.account.sign_in_google,
  microsoft: t.account.sign_in_microsoft,
} as const

/**
 * The optional account of the page: who is signed in (null: nobody, undefined: not read yet)
 * and, for a signed-in citizen, the checks the server keeps for them.
 *
 * @param account - The account port; without it the page has no sign-in.
 * @returns The state and what changes it.
 * @feature US-SPR-10, F-31
 */
export function useAccount(account: CitizenAccount | undefined) {
  const [user, setUser] = useState<AccountSession | null | undefined>(undefined)
  const [remote, setRemote] = useState<AccountCheck[]>([])
  const [signedOut, setSignedOut] = useState(false)
  useEffect(() => {
    let live = true
    account
      ?.session()
      .then(async (session) => {
        if (!live) {
          return
        }
        setUser(session)
        const history = session ? await account.history() : []
        if (live) {
          setRemote(history)
        }
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [account])
  const forgetRemote = useCallback(() => setRemote([]), [])
  const leave = useCallback(() => {
    setUser(null)
    setRemote([])
  }, [])
  const signOut = useCallback(async () => {
    if (await account?.signOut()) {
      leave()
      setSignedOut(true)
    }
  }, [account, leave])
  return { user, remote, signedOut, signOut, forgetRemote, leave }
}

/**
 * Under the privacy line: sign-in with Google or Microsoft for a citizen who is not signed in
 * (links to the provider, optional), and for a signed-in one who they are, „Usuń moją
 * historię”, „Wyloguj się” and „Usuń konto i historię”. Renders nothing until the session is
 * read, so the sign-in does not flash for a signed-in citizen.
 *
 * @param props.account - The account port.
 * @param props.user - Who is signed in; undefined while unknown.
 * @param props.signedOut - Whether the citizen just signed out (shows `account.signed_out`).
 * @param props.onSignOut - Called by „Wyloguj się”.
 * @param props.onDeleteHistory - Called by „Usuń moją historię” (opens the confirmation).
 * @param props.onDeleteAccount - Called by „Usuń konto i historię” (opens the confirmation).
 * @returns The account block.
 * @feature US-SPR-10, US-BEZ-05, F-31
 */
export function AccountSection({
  account,
  user,
  signedOut,
  onSignOut,
  onDeleteHistory,
  onDeleteAccount,
}: {
  account: CitizenAccount
  user: AccountSession | null | undefined
  signedOut: boolean
  onSignOut: () => void
  onDeleteHistory: () => void
  onDeleteAccount: () => void
}) {
  if (user === undefined) {
    return null
  }
  const returnTo = window.location.pathname
  return (
    <div className="grid gap-2">
      <p role="status" className="text-foreground empty:hidden">
        {signedOut && t.account.signed_out}
      </p>
      {user ? (
        <>
          {user.email && (
            <p className="text-foreground">
              {t.account.signed_in_as.replace('{email}', user.email)}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              variant="outline"
              className="h-11 rounded-pill px-4 text-body"
              onClick={onDeleteHistory}
            >
              {t.history.delete}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 rounded-pill px-4 text-body"
              onClick={onSignOut}
            >
              {t.account.sign_out}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="h-11 rounded-pill px-4 text-body underline underline-offset-3"
              onClick={onDeleteAccount}
            >
              {t.account.delete_account}
            </Button>
          </div>
          <p className="text-small text-muted-foreground text-pretty">
            {user.isDemo ? t.account.stored_demo : t.account.stored}
          </p>
        </>
      ) : (
        <>
          <p>{t.account.optional}</p>
          <div className="flex flex-wrap gap-2">
            {LOGIN_PROVIDERS.map((provider) => (
              <Button
                key={provider}
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-pill px-4 text-body"
              >
                <a href={account.loginUrl(provider, returnTo)}>{labels[provider]}</a>
              </Button>
            ))}
          </div>
          <p className="text-small text-muted-foreground text-pretty">{t.account.stored}</p>
        </>
      )}
    </div>
  )
}
