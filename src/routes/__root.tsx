import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { apiNotifications } from '@/api'
import { MeritumMark } from '@/components/meritum/meritum-mark'
import privacy from '@/copy/privacy.json'
import { createInbox, Notifications } from '@/notifications'

/**
 * Layout of every page: the Meritum header with the notifications bell, the page below it and
 * a footer with the privacy policy of every channel. Toasts show on every page.
 *
 * @feature US-SPR-01, US-DST-01, US-BEZ-06, US-BEZ-05, US-POW-01, US-POW-04, F-20, F-26
 */
export const Route = createRootRoute({ component: Layout })

const { policies } = privacy
const policyLinks = [
  ['/prywatnosc', policies.web.title],
  ['/prywatnosc/discord', policies.discord.title],
  ['/prywatnosc/wtyczka', policies.extension.title],
  ['/prywatnosc/sms', policies.sms.title],
] as const

function Layout() {
  const [inbox] = useState(() => createInbox(apiNotifications))
  return (
    <div className="min-h-dvh">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <MeritumMark className="size-7" />
          <div>
            <p className="text-body font-semibold">Meritum</p>
            <p className="text-small text-muted-foreground">obywatelski radar dezinformacji</p>
          </div>
          <Notifications inbox={inbox} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t">
        <ul className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2 px-4 py-4 text-small">
          {policyLinks.map(([to, title]) => (
            <li key={to}>
              <Link to={to} className="underline underline-offset-3">
                {title}
              </Link>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  )
}
