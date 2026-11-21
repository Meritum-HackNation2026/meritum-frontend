import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'
import { apiAdmin, apiStaff } from '@/api'
import { AdminPage, loadAdmin, sectionsFor } from '@/moderation'

/**
 * The administration page at /panel/administracja: accounts and topics are read only for an
 * administrator; any other role goes back to /panel, a person signed out sees the sign-in page.
 *
 * @feature US-MOD-05, F-20, F-25
 */
export const Route = createFileRoute('/panel/administracja')({
  loader: async () => {
    const data = await loadAdmin(apiStaff, apiAdmin)
    const { session } = data
    if (session.kind === 'member' && !sectionsFor(session.role).includes('admin')) {
      throw redirect({ to: '/panel' })
    }
    return data
  },
  component: AdminRoute,
})

function AdminRoute() {
  const router = useRouter()
  const reload = useCallback(() => router.invalidate(), [router])
  return (
    <AdminPage
      data={Route.useLoaderData()}
      staff={apiStaff}
      admin={apiAdmin}
      onSignedOut={reload}
    />
  )
}
