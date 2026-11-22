import { Link } from '@tanstack/react-router'
import { ArrowRightIcon, BookOpenIcon, LibraryIcon, RefreshCwIcon, ScaleIcon } from 'lucide-react'
import { ResultCard } from '@/components/meritum/result-card'
import { VerdictBadge } from '@/components/meritum/verdict-badge'
import { Button } from '@/components/ui/button'
import examples from '@/contracts/examples.json'
import type { CheckResult, Verdict } from '@/contracts/meritum'
import pl from '@/copy/pl.json'

const { method } = pl
const done = examples['CheckResult.done'] as CheckResult
const [firstClaim, ...nextClaims] = done.claims ?? []
const verdicts = Object.keys(pl.verdict) as Verdict[]
const pill = 'h-11 gap-2 rounded-pill px-5 text-body'
// ResultCard's frame, background and entry motion go: the example stands still on the page
const bare = 'animate-none! border-0 bg-transparent'

const principles = [
  { icon: LibraryIcon, title: method.sources.title, text: method.sources.text[0] },
  { icon: ScaleIcon, title: method.verdict.title, text: method.verdict.text[1] },
  { icon: RefreshCwIcon, title: method.corrections.title, text: method.corrections.text[0] },
]

/**
 * The example beside the headline: a real result from contracts/examples.json through the
 * current ResultCard, without its frame (data-reply drops the border and the label). The first
 * claim is whole; only the start of the next one shows, faded out by a mask. It is inert, a
 * picture of the product and not a second place to click.
 */
function Sample() {
  return (
    <figure aria-labelledby="przyklad" className="grid min-w-0 content-start gap-3">
      <figcaption id="przyklad" className="text-meta font-semibold text-muted-foreground">
        {pl.check_page.sample}
      </figcaption>
      {/* aria-hidden says out loud what inert already does in a browser: the picture is not read */}
      <div inert aria-hidden="true" data-reply="" className="grid min-w-0">
        <ResultCard
          result={{
            ...done,
            claims: firstClaim ? [firstClaim] : [],
            limitation_codes: [],
            limitations: [],
          }}
          className={bare}
        />
        <div data-faded="" className="max-h-28 overflow-hidden mask-b-from-0% mask-b-to-90%">
          <ResultCard result={{ ...done, claims: nextClaims }} className={bare} />
        </div>
      </div>
    </figure>
  )
}

/**
 * The home page (shadcnblocks hero1 structure): no field. The headline, the lead,
 * „Sprawdź informację” to /sprawdz and „Jak działa Meritum”, the note that sign-in is optional;
 * beside them the inert example result; below three principles of the method with icons and the
 * legend of the five verdicts with their hints. It takes the whole width of the layout
 * (data-wide).
 *
 * @returns The home page content.
 * @feature US-SPR-01, US-DST-01, US-ZRD-12, F-01, F-29
 */
export function HomePage() {
  return (
    <div data-wide="" className="grid min-w-0 gap-20 pb-8">
      <section className="grid items-start gap-x-16 gap-y-12 lg:grid-cols-2">
        <div className="grid gap-6 lg:pt-10">
          <h1 className="text-headline font-bold tracking-tight text-balance">
            {pl.brand.taglines[0]}
          </h1>
          <p className="max-w-lg text-body text-muted-foreground text-pretty">{pl.form.lead}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {/* twMerge reads `text-body` as a colour, so the primary text colour is set again */}
            <Button asChild className={`${pill} text-primary-foreground`}>
              <Link to="/sprawdz">
                {pl.form.title}
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" className={pill}>
              <Link to="/jak-dziala">
                <BookOpenIcon aria-hidden="true" />
                {pl.result.how_it_works}
              </Link>
            </Button>
          </div>
          <p className="max-w-md text-small text-muted-foreground text-pretty">
            {pl.account.optional}
          </p>
        </div>
        <Sample />
      </section>
      <section className="grid gap-x-12 gap-y-10 md:grid-cols-3">
        {principles.map(({ icon: Icon, title, text }) => (
          <div key={title} className="grid content-start gap-2">
            <h2 className="flex items-center gap-2 text-body font-semibold">
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {title}
            </h2>
            <p className="text-small text-muted-foreground text-pretty">{text}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-x-16 gap-y-6 lg:grid-cols-2">
        <h2 className="text-title font-bold tracking-tight text-balance">{pl.brand.taglines[1]}</h2>
        <ul className="grid gap-4">
          {verdicts.map((verdict) => (
            <li key={verdict} className="grid gap-1 sm:flex sm:items-baseline sm:gap-4">
              <span className="flex sm:w-64 sm:shrink-0">
                <VerdictBadge verdict={verdict} size="sm" />
              </span>
              <span className="text-body text-muted-foreground text-pretty">
                {pl.verdict_hint[verdict]}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
