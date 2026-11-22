import { Link } from '@tanstack/react-router'
import { BookOpenIcon, MenuIcon, SearchCheckIcon } from 'lucide-react'
import { apiAccount, apiStaff } from '@/api'
import { AccountMenu } from '@/checks'
import { MeritumMark } from '@/components/meritum/meritum-mark'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import pl from '@/copy/pl.json'
import { PanelLink } from '@/moderation'
import { type Inbox, Notifications } from '@/notifications'

// „Sprawdź” points at the home page until the check page /sprawdz exists (issue 123 in this repo).
const navLinks = [
  { to: '/', label: pl.nav.check, icon: SearchCheckIcon, exact: true },
  { to: '/jak-dziala', label: pl.nav.how, icon: BookOpenIcon, exact: false },
] as const

const barLink =
  'flex items-center gap-2 rounded-pill px-3 py-1.5 text-small font-medium text-muted-foreground hover:bg-muted hover:text-foreground aria-[current=page]:text-foreground focus-visible:outline-2 focus-visible:outline-ring'
const menuLink =
  'flex min-h-11 items-center gap-3 rounded-md px-3 text-body hover:bg-muted aria-[current=page]:font-semibold focus-visible:outline-2 focus-visible:outline-ring'

/**
 * The mark with the lowercase logotype (DESIGN_SYSTEM.md 2), a link to the home page.
 *
 * @returns The logotype link.
 * @feature US-DST-01, F-01
 */
export function Wordmark() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <MeritumMark className="size-7" />
      <span className="font-logo text-body leading-5 font-semibold tracking-tight lowercase font-stretch-semi-expanded">
        {pl.brand.name}
      </span>
    </Link>
  )
}

/** The two places of the bar, as a row from 768 px or as the items of the phone menu. */
function NavItems({ className }: { className: string }) {
  return navLinks.map(({ to, label, icon: Icon, exact }) => (
    <Link key={to} to={to} activeOptions={{ exact }} className={className}>
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </Link>
  ))
}

/**
 * The sticky top bar of every page, in the page colour and without a rule (DESIGN_SYSTEM.md
 * 6.9): mark and logotype, „Sprawdź” and „Jak działa” with icons and aria-current (in a Popover
 * menu below 768 px), and on the right the panel link for staff, the notifications and the
 * account. Its height is the --spacing-bar token, which the page's scroll padding clears.
 *
 * @param props.inbox - This tab's notifications inbox, shown under the bell.
 * @returns The bar as the page banner.
 * @feature US-SPR-01, US-DST-01, US-POW-01, US-MOD-05, US-SPR-10, F-01, F-25, F-26, F-31
 */
export function AppBar({ inbox }: { inbox: Inbox }) {
  return (
    <header className="sticky top-0 z-20 bg-background">
      <div className="mx-auto flex h-bar w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-1 md:gap-8">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={pl.nav.menu}
                className="-ml-2 rounded-pill md:hidden"
              >
                <MenuIcon aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" aria-label={pl.nav.menu} className="w-56 p-1">
              <nav aria-label={pl.nav.menu} className="grid">
                <NavItems className={menuLink} />
              </nav>
            </PopoverContent>
          </Popover>
          <Wordmark />
          <nav aria-label={pl.nav.menu} className="flex items-center gap-1 max-md:hidden">
            <NavItems className={barLink} />
          </nav>
        </div>
        {/* the „Wygląd” menu (issue 125 in this repo) goes first in this group */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <PanelLink api={apiStaff} />
          <Notifications inbox={inbox} />
          <AccountMenu account={apiAccount} />
        </div>
      </div>
    </header>
  )
}
