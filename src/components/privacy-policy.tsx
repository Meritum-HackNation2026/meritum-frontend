import { Link } from '@tanstack/react-router'
import { FileTextIcon } from 'lucide-react'
import { useId } from 'react'
import { Rail } from '@/components/app-shell'
import { OnPageToc } from '@/components/on-page-toc'
import pl from '@/copy/pl.json'
import privacy from '@/copy/privacy.json'

type Channel = keyof typeof privacy.policies
type Processor = (typeof privacy.processors.items)[number]

const policyPages = [
  ['/prywatnosc', privacy.policies.web.title],
  ['/prywatnosc/discord', privacy.policies.discord.title],
  ['/prywatnosc/wtyczka', privacy.policies.extension.title],
  ['/prywatnosc/sms', privacy.policies.sms.title],
] as const

// Anchors of the titled sections, for „Na tej stronie” in the rail.
const anchors = {
  controller: 'administrator',
  signIn: 'logowanie',
  processors: 'podmioty',
  mcp: 'klienci-mcp',
}

const { columns } = privacy.processors
const registry: Processor[] = [...privacy.processors.items, ...privacy.processors.planned_items]

function lookup(ids: readonly string[]): Processor[] {
  return ids.map((id) => {
    const item = registry.find((p) => p.id === id)
    if (!item) {
      throw new Error(`copy/privacy.json: processor ${id} is not in the register`)
    }
    return item
  })
}

// The lead names the table and its scroll region; the region takes focus so keyboard
// users can scroll the columns hidden at 320 px.
function ProcessorTable({ lead, items }: { lead: string; items: Processor[] }) {
  const leadId = useId()
  return (
    <>
      <p id={leadId}>{lead}</p>
      <section
        aria-labelledby={leadId}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must take focus to scroll by keyboard (WCAG 2.1.1)
        tabIndex={0}
        className="overflow-x-auto rounded-md focus-visible:outline-2 focus-visible:outline-ring"
      >
        <table aria-labelledby={leadId} className="w-full text-left text-small">
          <thead className="text-meta text-muted-foreground">
            <tr>
              {[columns.name, columns.region, columns.data, columns.purpose].map((label) => (
                <th key={label} scope="col" className="py-2 pr-4 font-normal">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="align-top">
                <th scope="row" className="py-2 pr-4 font-semibold">
                  {p.name}
                </th>
                <td className="py-2 pr-4">{p.region}</td>
                <td className="py-2 pr-4">{p.data}</td>
                <td className="py-2 pr-4">{p.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}

// The other channels' policies, linked from every policy page since the footer has only „Prywatność”.
function PolicyLinks() {
  const titleId = useId()
  return (
    <nav aria-labelledby={titleId} className="grid gap-3">
      <h2 id={titleId} className="flex items-center gap-2 font-semibold text-small">
        <FileTextIcon aria-hidden="true" className="size-4 shrink-0" />
        <span>{pl.nav.privacy}</span>
      </h2>
      <ul className="-mx-3 grid gap-0.5">
        {policyPages.map(([to, title]) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: true }}
              className="block rounded-lg px-3 py-1.5 text-muted-foreground text-small text-pretty hover:bg-muted hover:text-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * One channel's privacy policy: who controls the data, what is processed and why, how
 * long it is kept, how to delete it, aggregate telemetry, IP addresses and the processors
 * of that channel from the ADR-14 register. The rail holds „Na tej stronie” and the links to
 * every channel's policy. Every text comes from copy/privacy.json.
 *
 * @param props.channel - The channel whose policy to show.
 * @returns The policy as an article.
 * @throws {Error} When the policy names a processor missing from the register.
 * @feature US-BEZ-06, US-BEZ-05, F-20, ADR-13, ADR-14
 */
export function PrivacyPolicy({ channel }: { channel: Channel }) {
  const policy = privacy.policies[channel]
  const { controller, external_mcp_clients: mcp } = privacy
  const sections = [
    { id: anchors.controller, title: controller.title },
    ...('sign_in' in policy ? [{ id: anchors.signIn, title: policy.sign_in.title }] : []),
    { id: anchors.processors, title: privacy.processors.title },
    { id: anchors.mcp, title: mcp.title },
  ]
  return (
    <article className="space-y-8 text-body">
      <Rail>
        <OnPageToc sections={sections} />
        <PolicyLinks />
      </Rail>
      <h1 className="text-title font-semibold">{policy.title}</h1>
      <section id={anchors.controller} className="space-y-2">
        <h2 className="font-semibold">{controller.title}</h2>
        <p>{controller.name}</p>
        <p>{controller.no_partnership}</p>
        <p>{controller.deployment}</p>
        <p>{controller.contact}</p>
      </section>
      <section className="space-y-3">
        {'fees' in policy && <p>{policy.fees}</p>}
        <p>{policy.data}</p>
        <p>{policy.purpose}</p>
        <p>{policy.retention}</p>
        {'moderators' in policy && <p>{policy.moderators}</p>}
        <p>{policy.deletion}</p>
        <p>{policy.telemetry}</p>
        <p>{policy.ip_addresses}</p>
      </section>
      {'sign_in' in policy && (
        <section id={anchors.signIn} className="space-y-2">
          <h2 className="font-semibold">{policy.sign_in.title}</h2>
          <p>{policy.sign_in.scopes}</p>
          <p>{policy.sign_in.purpose}</p>
          <p>{policy.sign_in.retention}</p>
        </section>
      )}
      <section id={anchors.processors} className="space-y-3">
        <h2 className="font-semibold">{privacy.processors.title}</h2>
        <ProcessorTable lead={policy.processors_lead} items={lookup(policy.processors)} />
        <ProcessorTable
          lead={policy.planned_processors_lead}
          items={lookup(policy.planned_processors)}
        />
      </section>
      <section id={anchors.mcp} className="space-y-2">
        <h2 className="font-semibold">{mcp.title}</h2>
        <p>{mcp.text}</p>
      </section>
    </article>
  )
}
