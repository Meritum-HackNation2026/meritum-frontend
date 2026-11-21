import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { MeritumMark } from '@/components/meritum/meritum-mark'

/**
 * Layout of every page: the Meritum header, the page and a footer with the privacy policy.
 *
 * @feature US-SPR-01, US-DST-01, ADR-13
 */
export const Route = createRootRoute({ component: Layout })

function Layout() {
  return (
    <div className="min-h-dvh">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <MeritumMark className="size-7" />
          <div>
            <p className="text-body font-semibold">Meritum</p>
            <p className="text-small text-muted-foreground">obywatelski radar dezinformacji</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-3xl px-4 pb-8 text-small text-muted-foreground">
        <Link className="underline underline-offset-2" to="/prywatnosc">
          Polityka prywatności
        </Link>
      </footer>
    </div>
  )
}
