import { ListIcon } from 'lucide-react'
import { type MouseEvent, useId } from 'react'
import pl from '@/copy/pl.json'
import { METHOD_SECTIONS } from './constants'

function scrollToSection(event: MouseEvent<HTMLButtonElement>) {
  const id = event.currentTarget.dataset['section'] ?? ''
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // scroll-padding-top on html keeps the heading clear of the sticky bar
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

/**
 * „Na tej stronie”: the table of contents of „Jak działa Meritum” for the rail, buttons that
 * scroll to each section, smoothly unless the user asked for reduced motion.
 *
 * @returns The navigation.
 * @feature US-ZRD-12, F-29
 */
export function MethodToc() {
  const titleId = useId()
  return (
    <nav aria-labelledby={titleId} className="grid gap-3">
      <h2 id={titleId} className="flex items-center gap-2 font-semibold text-small">
        <ListIcon aria-hidden="true" className="size-4 shrink-0" />
        <span>{pl.nav.on_page}</span>
      </h2>
      <ul className="-mx-3 grid gap-0.5">
        {METHOD_SECTIONS.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              data-section={section.id}
              onClick={scrollToSection}
              className="w-full rounded-lg px-3 py-1.5 text-left text-muted-foreground text-small text-pretty hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {section.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
