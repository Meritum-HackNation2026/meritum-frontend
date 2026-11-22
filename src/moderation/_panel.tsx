import { useNavigate } from '@tanstack/react-router'
import { type ReactNode, useCallback, useState } from 'react'
import { fill, t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import type { ModeratorCase } from '@/contracts/meritum'
import { CaseDetail } from './_case-detail'
import { PanelNav, PanelSession, useWideScreen } from './_panel-rail'
import { CaseQueue } from './_queue'
import { type PanelData, sectionsFor } from './_session'
import { SignIn } from './_sign-in'
import type { AnswerApi, StaffApi, StaffSession } from './ports'

const notices: Record<Exclude<StaffSession['kind'], 'member'>, string | null> = {
  signed_out: null,
  expired: t.staff.sign_in.session_expired,
  no_access: t.staff.sign_in.no_access,
  failed: t.staff.sign_in.failed,
}

function CasesSection({
  cases,
  answers,
  openCaseId,
  onOpenCase,
}: {
  cases: PanelData['cases']
  answers?: AnswerApi | undefined
  openCaseId?: string | undefined
  onOpenCase?: ((caseId: string) => void) | undefined
}) {
  const [localId, setLocalId] = useState<string>()
  const openId = onOpenCase ? openCaseId : localId
  // cases the moderator answered or closed in this visit: the list is not read again until a reload
  const [changed, setChanged] = useState<Readonly<Record<string, ModeratorCase['state']>>>({})
  const markAnswered = useCallback(
    (id: string) => setChanged((states) => ({ ...states, [id]: 'answered' })),
    [],
  )
  const markClosed = useCallback(
    (id: string) => setChanged((states) => ({ ...states, [id]: 'closed' })),
    [],
  )
  if (cases === null) {
    return <p className="text-body">{t.errors.offline}</p>
  }
  const shown = cases.map((c) => {
    const state = changed[c.id]
    return state ? { ...c, state } : c
  })
  const open = shown.find((c) => c.id === openId)
  return (
    <div className="grid grid-cols-1 gap-6">
      <CaseQueue cases={shown} selectedId={openId} onOpen={onOpenCase ?? setLocalId} />
      {open && (
        <CaseDetail
          key={open.id}
          moderatorCase={open}
          answers={answers}
          onAnswered={markAnswered}
          onClosed={markClosed}
        />
      )}
    </div>
  )
}

/**
 * The moderator panel (DESIGN_SYSTEM.md 6.5): the sign-in page for anyone without a staff role,
 * otherwise the page's own content in the column (by default, for moderators and administrators,
 * the case queue with the open case below it) and, in the rail, the navigation of their role's
 * sections, the member's address and role (a read-only jury session: its notice) and sign-out
 * (back to the home page). On a phone the rail drops under the content, so the navigation
 * stands before the content instead.
 * Notifications (`case_assigned` toasts and the inbox) come from the layout's bell.
 *
 * @param props.data - The session from `loadPanel` or `loadAdmin`, with the cases when the page shows them.
 * @param props.api - The staff API (login addresses, sign-out).
 * @param props.answers - The answer API; without it an open case has no answer form.
 * @param props.children - Another panel page in place of the cases (e.g. administration).
 * @param props.openCaseId - The case the address opens (`/panel/sprawy/S-4`), with `onOpenCase`.
 * @param props.onOpenCase - Opens a case by changing the address; without it the open case is
 *   kept in the page only.
 * @param props.rail - Puts its content into the layout's side rail.
 * @returns The panel.
 * @feature US-MOD-05, US-MOD-02, US-POW-05, US-MOD-07, US-MOD-01, F-25, F-26, F-39
 */
export function Panel({
  data,
  api,
  answers,
  children,
  openCaseId,
  onOpenCase,
  rail,
}: {
  data: Pick<PanelData, 'session'> & Partial<Pick<PanelData, 'cases'>>
  api: StaffApi
  answers?: AnswerApi | undefined
  children?: ReactNode
  openCaseId?: string | undefined
  onOpenCase?: ((caseId: string) => void) | undefined
  rail: (content: ReactNode) => ReactNode
}) {
  const navigate = useNavigate()
  const wide = useWideScreen()
  const signOut = useCallback(async () => {
    await api.signOut()
    await navigate({ to: '/' })
  }, [api, navigate])
  const { session } = data
  if (session.kind !== 'member') {
    return <SignIn api={api} notice={notices[session.kind]} />
  }
  const sections = sectionsFor(session.role)
  return (
    // grid-cols-1 lets the wide queue table scroll inside its own box from 320 px up
    <div className="grid grid-cols-1 gap-6">
      {!wide && <PanelNav sections={sections} inRail={false} />}
      {children ??
        (sections.includes('cases') && (
          <CasesSection
            cases={data.cases ?? null}
            answers={answers}
            openCaseId={openCaseId}
            onOpenCase={onOpenCase}
          />
        ))}
      {rail(
        <>
          {wide && <PanelNav sections={sections} inRail />}
          <PanelSession session={session} onSignOut={signOut} />
        </>,
      )}
    </div>
  )
}
