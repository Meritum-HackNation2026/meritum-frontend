import { LogInIcon, LogOutIcon, UserRoundIcon } from 'lucide-react'
import { useCallback } from 'react'
import { t } from '@/components/meritum'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAccount } from './_account'
import { LOGIN_PROVIDERS } from './constants'
import type { CitizenAccount } from './ports'

const labels = {
  google: t.account.sign_in_google,
  microsoft: t.account.sign_in_microsoft,
} as const

/** Signs out through the account port, then reloads so every view of the session agrees. */
async function signOutAndReload(account: CitizenAccount) {
  if (await account.signOut()) {
    window.location.reload()
  }
}

/**
 * The account control of the top bar, on the same session and sign-in as the account block of
 * the check page: „Zaloguj się” with a menu of the Google and Microsoft sign-in, or for a
 * signed-in citizen an avatar with a menu (who is signed in, „Wyloguj się”). Deleting the history
 * or the account stays on the check page, behind its confirmation. Renders nothing until the
 * session is read.
 *
 * @param props.account - The account port.
 * @returns The control, or nothing while the session is unknown.
 * @feature US-SPR-10, F-31
 */
export function AccountMenu({ account }: { account: CitizenAccount }) {
  const { user } = useAccount(account)
  const signOut = useCallback(() => signOutAndReload(account), [account])
  if (user === undefined) {
    return null
  }
  if (!user) {
    const returnTo = window.location.pathname
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 gap-2 rounded-pill px-3 text-small sm:px-4">
            <LogInIcon aria-hidden="true" />
            <span className="max-sm:sr-only">{t.nav.sign_in}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {LOGIN_PROVIDERS.map((provider) => (
            <DropdownMenuItem key={provider} asChild>
              <a href={account.loginUrl(provider, returnTo)}>{labels[provider]}</a>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
  const initial = user.email?.charAt(0).toUpperCase()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label={t.nav.account} className="size-9 rounded-pill p-0">
          <Avatar>
            <AvatarFallback className="bg-secondary text-small font-semibold">
              {initial ?? <UserRoundIcon aria-hidden="true" className="size-4" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {user.email && (
          <>
            <DropdownMenuLabel className="text-small font-normal text-muted-foreground">
              {t.account.signed_in_as.replace('{email}', user.email)}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={signOut}>
          <LogOutIcon aria-hidden="true" />
          {t.account.sign_out}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
