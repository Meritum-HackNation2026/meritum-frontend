import { Outlet } from '@tanstack/react-router'
import { createContext, type ReactNode, useContext, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { apiNotifications } from '@/api'
import { AppBar } from '@/components/app-bar'
import { AppFooter } from '@/components/app-footer'
import { usePageTitle } from '@/components/page-title'
import { TooltipProvider } from '@/components/ui/tooltip'
import pl from '@/copy/pl.json'
import { createInbox, InboxContext } from '@/notifications'

const RailSlot = createContext<HTMLElement | null>(null)

/**
 * What a page puts in the sticky 320 px rail beside its column (history of checks, a table of
 * contents). Rendered into the layout's rail slot; on a phone the rail drops under the content.
 * Pages without a rail keep the 720 px column alone.
 *
 * @param props.children - The rail content.
 * @returns A portal into the rail slot, or nothing before the slot is mounted.
 * @feature US-DST-01, F-01
 */
export function Rail({ children }: { children: ReactNode }) {
  const slot = useContext(RailSlot)
  return slot ? createPortal(children, slot) : null
}

/**
 * Layout of every page: the „Przejdź do treści” link (WCAG 2.4.1), the sticky top bar, the main
 * region with a column up to 720 px from the bar's left edge and a rail slot of 320 px inside a
 * container up to 1152 px (DESIGN_SYSTEM.md 5), and the one-row footer. A page that holds
 * [data-wide] (the home page) takes the whole container. Hints get one TooltipProvider,
 * the pages get this tab's notifications inbox, and the tab title follows the page's h1.
 *
 * @returns The page frame around the current route.
 * @feature US-SPR-01, US-DST-01, US-POW-01, US-POW-04, US-BEZ-05, F-01, F-20, F-26
 */
export function AppShell() {
  const [inbox] = useState(() => createInbox(apiNotifications))
  const [rail, setRail] = useState<HTMLElement | null>(null)
  const main = useRef<HTMLElement>(null)
  usePageTitle(main)
  // components/meritum/README.md: hints (InfoButton) need one TooltipProvider around the app
  return (
    <TooltipProvider>
      <div className="flex min-h-dvh flex-col">
        <a
          href="#tresc"
          className="sr-only rounded-md bg-background px-4 py-3 font-semibold text-foreground underline underline-offset-3 shadow-float focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {pl.layout.skip_to_content}
        </a>
        <AppBar inbox={inbox} />
        {/* tabIndex -1: the browser moves focus here when the skip link is followed */}
        <main
          ref={main}
          id="tresc"
          tabIndex={-1}
          className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-x-16 gap-y-12 px-4 pt-10 focus:outline-none sm:px-6 lg:flex lg:items-start lg:justify-between lg:pt-14"
        >
          <div className="min-w-0 max-w-column lg:flex-1 has-wide:max-w-none">
            <RailSlot value={rail}>
              <InboxContext value={inbox}>
                <Outlet />
              </InboxContext>
            </RailSlot>
          </div>
          <aside
            ref={setRail}
            className="grid content-start gap-8 empty:hidden lg:sticky lg:top-24 lg:w-rail lg:shrink-0"
          />
        </main>
        <AppFooter />
      </div>
    </TooltipProvider>
  )
}
