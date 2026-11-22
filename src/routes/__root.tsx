import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { apiNotifications, apiStaff } from '@/api'
import { MeritumMark } from '@/components/meritum/meritum-mark'
import { usePageTitle } from '@/components/page-title'
import { TooltipProvider } from '@/components/ui/tooltip'
import pl from '@/copy/pl.json'
import privacy from '@/copy/privacy.json'
import { PanelLink } from '@/moderation'
import { createInbox, InboxContext, Notifications } from '@/notifications'

/**
 * Layout of every page: a „Przejdź do treści” link that skips the header (WCAG 2.4.1), the Meritum header with the notifications bell, the page below it and
 * a link back to the panel for staff, and a footer with the "Jak działa Meritum" page and the privacy policy of every channel. Toasts
 * show on every page.
 *
 * @feature US-SPR-01, US-DST-01, US-BEZ-06, US-BEZ-05, US-POW-01, US-POW-04, US-ZRD-12, F-20, F-26, F-29
 */
export const Route = createRootRoute({ component: Layout })

const { policies } = privacy
const footerLinks = [
  ['/jak-dziala', pl.result.how_it_works],
  ['/prywatnosc', policies.web.title],
  ['/prywatnosc/discord', policies.discord.title],
  ['/prywatnosc/wtyczka', policies.extension.title],
  ['/prywatnosc/sms', policies.sms.title],
] as const

function Layout() {
  const [inbox] = useState(() => createInbox(apiNotifications))
  const main = useRef<HTMLElement>(null)
  usePageTitle(main)
  // components/meritum/README.md: hints (InfoButton) need one TooltipProvider around the app
  return (
    <TooltipProvider>
      <div className="min-h-dvh">
        <a
          href="#tresc"
          className="sr-only rounded-md bg-card px-4 py-3 font-semibold text-foreground underline underline-offset-3 shadow-float focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {pl.layout.skip_to_content}
        </a>
        <header className="border-b bg-card">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
            <MeritumMark className="size-7" />
            <div>
              <p className="text-body font-semibold">{pl.brand.name}</p>
              <p className="text-small text-muted-foreground">{pl.brand.subtitle}</p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-3">
              <PanelLink api={apiStaff} />
              <Notifications inbox={inbox} />
            </div>
          </div>
        </header>
        {/* tabIndex -1: the browser moves focus here when the skip link is followed */}
        <main
          ref={main}
          id="tresc"
          tabIndex={-1}
          className="mx-auto max-w-3xl px-4 py-8 focus:outline-none has-wide:max-w-6xl lg:has-wide:py-16"
        >
          <InboxContext value={inbox}>
            <Outlet />
          </InboxContext>
        </main>
        <footer className="border-t">
          <ul className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 py-4 text-small">
            {footerLinks.map(([to, title]) => (
              <li key={to}>
                <Link
                  to={to}
                  className="inline-flex min-h-11 items-center underline underline-offset-3 sm:min-h-0"
                >
                  {title}
                </Link>
              </li>
            ))}
          </ul>
        </footer>
      </div>
    </TooltipProvider>
  )
}
