import { Link, type LinkProps } from '@tanstack/react-router'
import {
  DownloadIcon,
  GaugeIcon,
  InboxIcon,
  LogOutIcon,
  type LucideIcon,
  SettingsIcon,
} from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { fill, t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import type { PanelSection } from './_session'
import { WIDE_SCREEN_QUERY } from './constants'
import type { StaffSession } from './ports'

type Page = { to: NonNullable<LinkProps['to']>; label: string; icon: LucideIcon }

// Sections whose page exists today.
const pages: Partial<Record<PanelSection, Page>> = {
  cases: { to: '/panel', label: t.moderation.queue_title, icon: InboxIcon },
  evaluation: { to: '/panel/eval', label: t.evaluation.title, icon: GaugeIcon },
  export: { to: '/panel/eksport', label: t.export.title, icon: DownloadIcon },
  admin: { to: '/panel/administracja', label: t.staff.admin.title, icon: SettingsIcon },
}

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE_SCREEN_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/**
 * Whether the screen is wide enough for the rail to stand beside the column (Tailwind `lg`).
 *
 * @returns True from 64 rem up.
 * @feature US-MOD-05, US-DST-01, F-25, F-01
 */
export function useWideScreen(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(WIDE_SCREEN_QUERY).matches)
}

/**
 * The navigation of the sections a role sees, each with its Lucide icon and the current page
 * marked: a list in the rail, a wrapping row before the content on a phone.
 *
 * @param props.sections - The role's sections, in navigation order.
 * @param props.inRail - Lays the items out for the rail.
 * @returns The navigation.
 * @feature US-MOD-05, US-DST-01, F-25, F-01
 */
export function PanelNav({ sections, inRail }: { sections: PanelSection[]; inRail: boolean }) {
  return (
    <nav>
      <ul className={inRail ? '-mx-3 grid gap-0.5' : '-mx-3 flex flex-wrap gap-x-1 gap-y-1'}>
        {sections.map((section) => {
          const page = pages[section]
          if (!page) {
            return null
          }
          const Icon = page.icon
          return (
            <li key={section}>
              <Link
                to={page.to}
                activeOptions={{ exact: true }}
                className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-1.5 text-body text-muted-foreground hover:bg-muted hover:text-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground focus-visible:outline-2 focus-visible:outline-ring lg:min-h-0"
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span>{page.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * Who is signed in (or the jury's read-only notice) and sign-out, for the rail.
 *
 * @param props.session - The member's session.
 * @param props.onSignOut - Signs out.
 * @returns The block.
 * @feature US-MOD-05, US-OBS-06, F-25, F-28
 */
export function PanelSession({
  session,
  onSignOut,
}: {
  session: Extract<StaffSession, { kind: 'member' }>
  onSignOut: () => void
}) {
  const role = t.moderation.role[session.role]
  return (
    <div className="grid justify-items-start gap-2">
      {session.email && !session.readOnly && (
        <p className="text-small text-muted-foreground text-pretty wrap-anywhere">
          {fill(t.staff.sign_in.signed_in_as, { email: session.email, role })}
        </p>
      )}
      {session.readOnly && (
        <p className="text-small text-muted-foreground text-pretty">{t.jury.read_only}</p>
      )}
      <Button variant="ghost" size="sm" className="-mx-3 rounded-pill" onClick={onSignOut}>
        <LogOutIcon aria-hidden="true" />
        {t.account.sign_out}
      </Button>
    </div>
  )
}
