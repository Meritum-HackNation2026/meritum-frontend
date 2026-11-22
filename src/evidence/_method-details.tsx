import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import pl from '@/copy/pl.json'
import privacy from '@/copy/privacy.json'

const { method } = pl
const { controller } = privacy
const rows = [
  { id: 'zrodla', ...method.sources },
  { id: 'werdykt', ...method.verdict },
  { id: 'poprawki', ...method.corrections },
  { id: 'zgloszenia', ...method.report_error },
  { id: 'pilotaz', ...method.pilot },
  { id: 'zespol', ...method.team },
]

/**
 * The principles in detail as rows that open, all collapsed at first: sources, verdict,
 * corrections, „Zgłoś błąd”, the pilot and the team; the team row also names the data
 * controller from copy/privacy.json. A row lights up under the pointer; no lines between rows.
 *
 * @returns The accordion of principles.
 * @feature US-ZRD-12, US-MOD-06, F-29
 */
export function MethodDetails() {
  return (
    <Accordion type="multiple" className="-mx-3 grid gap-1">
      {rows.map((row) => (
        <AccordionItem key={row.id} value={row.id} className="border-none">
          <AccordionTrigger className="items-center rounded-lg px-3 py-3 font-semibold text-body! hover:bg-muted hover:no-underline">
            {row.title}
          </AccordionTrigger>
          <AccordionContent className="grid max-w-prose gap-3 px-3 pt-1 pb-5 text-body [&_p]:mb-0!">
            {row.text.map((paragraph) => (
              <p key={paragraph} className="text-pretty">
                {paragraph}
              </p>
            ))}
            {row.id === 'zespol' && (
              <>
                <p className="font-semibold">{controller.title}</p>
                <p>{controller.name}</p>
                <p>{controller.deployment}</p>
                <p>{controller.contact}</p>
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
