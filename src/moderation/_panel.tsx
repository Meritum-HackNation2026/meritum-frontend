import { Link, type LinkProps, useNavigate } from '@tanstack/react-router'
import { type ReactNode, useCallback, useState } from 'react'
import { fill, t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import type { ModeratorCase } from '@/contracts/meritum'
import { CaseDetail } from './_case-detail'
import { CaseQueue } from './_queue'
import { type PanelData, type PanelSection, sectionsFor } from './_session'
import { SignIn } from './_sign-in'
import type { AnswerApi, StaffApi, StaffSession } from './ports'

// Sections whose page exists today.
const pages: Partial<Record<PanelSection, { to: NonNullable<LinkProps['to']>; label: string }>> = {
  cases: { to: '/panel', label: t.moderation.queue_title },
  evaluation: { to: '/panel/eval', label: t.evaluation.title },
  export: { to: '/panel/eksport', label: t.export.title },
  admin: { to: '/panel/administracja', label: t.staff.admin.title },
}

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
 * otherwise the member's address and role (a read-only jury session: its notice), sign-out (back to the home page), the navigation of their role's sections
 * and the page's own content: by default, for moderators and administrators, the case queue
 * with the open case below it.
 * Notifications (`case_assigned` toasts and the inbox) come from the layout's bell.
 *
 * @param props.data - The session from `loadPanel` or `loadAdmin`, with the cases when the page shows them.
 * @param props.api - The staff API (login addresses, sign-out).
 * @param props.answers - The answer API; without it an open case has no answer form.
 * @param props.children - Another panel page in place of the cases (e.g. administration).
 * @param props.openCaseId - The case the address opens (`/panel/sprawy/S-4`), with `onOpenCase`.
 * @param props.onOpenCase - Opens a case by changing the address; without it the open case is
 *   kept in the page only.
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
}: {
  data: Pick<PanelData, 'session'> & Partial<Pick<PanelData, 'cases'>>
  api: StaffApi
  answers?: AnswerApi | undefined
  children?: ReactNode
  openCaseId?: string | undefined
  onOpenCase?: ((caseId: string) => void) | undefined
}) {
  const navigate = useNavigate()
  const signOut = useCallback(async () => {
    await api.signOut()
    await navigate({ to: '/' })
  }, [api, navigate])
  const { session } = data
  if (session.kind !== 'member') {
    return <SignIn api={api} notice={notices[session.kind]} />
  }
  const sections = sectionsFor(session.role)
  const role = t.moderation.role[session.role]
  return (
    // grid-cols-1 lets the wide queue table scroll inside its own box from 320 px up
    <div className="grid grid-cols-1 gap-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <nav className="mr-auto">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-body font-semibold">
            {sections.map((section) => {
              const page = pages[section]
              return page ? (
                <li key={section}>
                  <Link
                    to={page.to}
                    activeOptions={{ exact: true }}
                    className="rounded-md underline-offset-3 hover:underline focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:underline"
                  >
                    {page.label}
                  </Link>
                </li>
              ) : null
            })}
          </ul>
        </nav>
        {session.email && !session.readOnly && (
          <p className="text-small text-muted-foreground">
            {fill(t.staff.sign_in.signed_in_as, { email: session.email, role })}
          </p>
        )}
        {session.readOnly && <p className="text-small text-muted-foreground">{t.jury.read_only}</p>}
        <Button variant="ghost" size="sm" className="rounded-pill" onClick={signOut}>
          {t.account.sign_out}
        </Button>
      </div>
      {children ??
        (sections.includes('cases') && (
          <CasesSection
            cases={data.cases ?? null}
            answers={answers}
            openCaseId={openCaseId}
            onOpenCase={onOpenCase}
          />
        ))}
    </div>
  )
}
