import { useLocation } from '@tanstack/react-router'
import { t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
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
    </section>
  )
}
