import { Link } from '@tanstack/react-router'
import { Wordmark } from '@/components/app-bar'
import pl from '@/copy/pl.json'
import { CATALOG_SECTION_ID } from '@/evidence'

const footerLink =
  'inline-flex min-h-11 items-center rounded-md text-small text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0'

/**
 * The footer of every page: one row without a rule above it (DESIGN_SYSTEM.md 6.9) with the
 * mark, „Jak działa Meritum”, „Katalog źródeł”, „Prywatność” (which links on to the policy of
 * every channel) and the year.
 *
 * @returns The page's contentinfo landmark.
 * @feature US-ZRD-12, US-BEZ-06, F-20, F-29
 */
export function AppFooter() {
  return (
    <footer className="mt-16">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-4 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Wordmark />
          <Link to="/jak-dziala" className={footerLink}>
            {pl.result.how_it_works}
          </Link>
          <Link to="/jak-dziala" hash={CATALOG_SECTION_ID} className={footerLink}>
            {pl.method.catalog.title}
          </Link>
          <Link to="/prywatnosc" className={footerLink}>
            {pl.nav.privacy}
          </Link>
        </div>
        <p className="text-small text-muted-foreground">© {new Date().getFullYear()}</p>
      </div>
    </footer>
  )
}
