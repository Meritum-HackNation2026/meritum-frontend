import { useLocation } from '@tanstack/react-router'
import { type FormEvent, useCallback, useState } from 'react'
import { t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LOGIN_PROVIDERS } from './constants'
import type { LoginProvider, StaffApi } from './ports'

const label: Record<LoginProvider, string> = {
  google: t.account.sign_in_google,
  microsoft: t.account.sign_in_microsoft,
}

/**
 * The staff sign-in page: a link to each OIDC provider's login on the API and, above them, why
 * the person is here again (no role, a failed sign-in or a finished session). After sign-in the
 * API brings the person back to the panel page they opened.
 *
 * @param props.api - Gives the login address of each provider.
 * @param props.notice - The message to show, if any.
 * @returns The sign-in page.
 * @feature US-MOD-05, F-25
 */
export function SignIn({ api, notice }: { api: StaffApi; notice: string | null }) {
  const returnTo = useLocation({ select: (location) => location.pathname })
  return (
    <section aria-labelledby="staff-sign-in" className="mx-auto grid max-w-md gap-4 py-6">
      <h1 id="staff-sign-in" className="text-title font-bold text-balance">
        {t.staff.sign_in.title}
      </h1>
      <p className="text-body text-muted-foreground text-pretty">{t.staff.sign_in.lead}</p>
      <p role="status" className="text-body empty:hidden">
        {notice}
      </p>
      <div className="grid gap-2">
        {LOGIN_PROVIDERS.map((provider) => (
          <Button key={provider} asChild variant="outline" size="lg" className="h-11 rounded-pill">
            <a href={api.loginUrl(provider, returnTo)}>{label[provider]}</a>
          </Button>
        ))}
      </div>
      <JuryForm />
    </section>
  )
}

/**
 * Login and password for the jury: the API signs them in as the demo administrator.
 *
 * @returns The form; the page reloads into the panel after a good password.
 * @feature US-MOD-05, F-25
 */
function JuryForm() {
  const [error, setError] = useState('')
  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const response = await fetch('/api/v1/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: data.get('login'), password: data.get('password') }),
    })
    if (response.ok) window.location.reload()
    else setError('Nieprawidłowy login lub hasło.')
  }, [])
  return (
    <form onSubmit={submit} className="grid gap-2 border-t pt-4" aria-labelledby="jury-sign-in">
      <h2 id="jury-sign-in" className="text-body font-bold">
        Logowanie dla jury
      </h2>
      <Input name="login" autoComplete="username" placeholder="Login" aria-label="Login" required />
      <Input
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Hasło"
        aria-label="Hasło"
        required
      />
      <p role="alert" className="text-body text-destructive empty:hidden">
        {error}
      </p>
      <Button type="submit" size="lg" className="h-11 rounded-pill">
        Zaloguj
      </Button>
    </form>
  )
}
