import type { LucideIcon } from 'lucide-react'
import { type ReactNode, useId } from 'react'

/**
 * One section of „Jak działa Meritum”: the anchor the table of contents scrolls to, a heading
 * with its Lucide icon beside it (never a tile), an optional lead and the content. No frame and
 * no rule line around it; the white page is the only surface.
 *
 * @param props.id - Anchor of the section.
 * @param props.icon - Lucide icon beside the heading, hidden from screen readers.
 * @param props.title - The heading.
 * @param props.lead - Optional lead under the heading.
 * @param props.children - The section content.
 * @returns The section, named by its heading.
 * @feature US-ZRD-12, F-29
 */
export function MethodSection({
  id,
  icon: Icon,
  title,
  lead,
  children,
}: {
  id: string
  icon: LucideIcon
  title: string
  lead?: string
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <section id={id} aria-labelledby={headingId} className="grid gap-4">
      <h2
        id={headingId}
        className="flex items-center gap-2 font-semibold text-title tracking-tight text-balance"
      >
        <Icon aria-hidden="true" className="size-5 shrink-0" />
        <span>{title}</span>
      </h2>
      {lead && <p className="max-w-prose text-muted-foreground text-pretty">{lead}</p>}
      {children}
    </section>
  )
}
