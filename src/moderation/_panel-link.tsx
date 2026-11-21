import { Link, useLocation } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { t } from '@/components/meritum'
import type { StaffApi } from './ports'

/**
 * A link back to the panel in the header of citizen pages, shown only while the browser has a
 * staff session (read again on leaving the panel); citizens never see it, and the panel pages
 * have their own navigation.
 *
 * @param props.api - Reads the staff session on each page outside the panel.
 * @returns The link, or nothing.
 * @feature US-MOD-05, F-25
 */
export function PanelLink({ api }: { api: StaffApi }) {
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
    <Link
      to="/panel"
      className="rounded-md text-small font-semibold underline-offset-3 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
    >
      {t.staff.sign_in.title}
    </Link>
  )
}
