import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import pl from '@/copy/pl.json'

const { layout } = pl

const buttonClass = 'h-11 rounded-pill px-4 text-body'
// twMerge reads `text-body` as a colour and drops the variant's text colour, so it is set again
const primaryClass = `${buttonClass} text-primary-foreground`

/**
 * The page a route shows when it throws while rendering, in Meritum's words and inside the page
 * frame: it says the failure is not a verdict, offers another try and a way home. The error
 * itself is logged to the console, never shown.
 *
 * @param props.error - What the route threw.
 * @param props.reset - Renders the route again.
 * @returns The error page.
 * @feature US-DST-01, F-01
 */
export function ErrorPage({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error)
  return (
    <section className="grid max-w-prose gap-4 py-8" role="alert">
      <h1 className="text-title font-semibold text-balance">{layout.error_title}</h1>
      <p className="text-body text-pretty">{layout.error_text}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="lg" className={primaryClass} onClick={reset}>
          {layout.error_retry}
        </Button>
        <Button asChild size="lg" variant="outline" className={buttonClass}>
          <Link to="/">{layout.back_home}</Link>
        </Button>
      </div>
    </section>
  )
}

/**
 * The page for an address the app does not have, inside the page frame, with a way home.
 *
 * @returns The 404 page.
 * @feature US-DST-01, F-01
 */
export function NotFoundPage() {
  return (
    <section className="grid max-w-prose gap-4 py-8">
      <h1 className="text-title font-semibold text-balance">{layout.not_found_title}</h1>
      <p className="text-body text-pretty">{layout.not_found_text}</p>
      <div>
        <Button asChild size="lg" className={primaryClass}>
          <Link to="/">{layout.back_home}</Link>
        </Button>
      </div>
    </section>
  )
}
