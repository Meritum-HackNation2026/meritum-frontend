import { Link, useLocation } from '@tanstack/react-router'
import { InboxIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { t } from '@/components/meritum'
import type { StaffApi } from './ports'

/**
 * A link back to the panel in the header of citizen pages, shown only while the browser has a
 * staff session (read again on leaving the panel); citizens never see it, and the panel pages
 * have their own navigation. The bar shows it from 768 px up and the phone menu below that, each
 * with its own look.
 *
 * @param props.api - Reads the staff session on each page outside the panel.
 * @param props.className - The look of the place that shows the link.
 * @returns The link, or nothing.
 * @feature US-MOD-05, F-25
 */
export function PanelLink({ api, className }: { api: StaffApi; className: string }) {
  const isPanel = useLocation({ select: (location) => location.pathname.startsWith('/panel') })
  const [isStaff, setStaff] = useState(false)
  // Read again each time the person leaves the panel, so a sign-out there hides the link.
  useEffect(() => {
    setStaff(false)
    if (isPanel) {
      return
    }
    let isMounted = true
    api.session().then((session) => isMounted && setStaff(session.kind === 'member'))
    return () => {
      isMounted = false
    }
  }, [api, isPanel])
  if (!isStaff) {
    return null
  }
  return (
    <Link to="/panel" className={className}>
      <InboxIcon aria-hidden="true" className="size-4 shrink-0" />
      {t.staff.sign_in.title}
    </Link>
  )
}
