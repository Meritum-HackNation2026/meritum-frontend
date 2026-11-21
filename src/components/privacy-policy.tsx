import privacy from '@/copy/privacy.json'

type Channel = keyof typeof privacy.policies
type Processor = (typeof privacy.processors.items)[number]

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

function ProcessorTable({ items }: { items: Processor[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-small">
        <thead className="bg-muted">
          <tr>
            {[columns.name, columns.region, columns.data, columns.purpose].map((label) => (
              <th key={label} scope="col" className="px-3 py-2 font-semibold">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className="border-t align-top">
              <th scope="row" className="px-3 py-2 font-semibold">
                {p.name}
              </th>
              <td className="px-3 py-2">{p.region}</td>
              <td className="px-3 py-2">{p.data}</td>
              <td className="px-3 py-2">{p.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * One channel's privacy policy: who controls the data, what is processed and why, how
 * long it is kept, how to delete it, aggregate telemetry, IP addresses and the processors
 * of that channel from the ADR-14 register. Every text comes from copy/privacy.json.
 *
 * @param props.channel - The channel whose policy to show.
 * @returns The policy as an article.
 * @throws {Error} When the policy names a processor missing from the register.
 * @feature US-BEZ-06, US-BEZ-05, F-20, ADR-13, ADR-14
 */
export function PrivacyPolicy({ channel }: { channel: Channel }) {
  const policy = privacy.policies[channel]
  const { controller, external_mcp_clients: mcp } = privacy
  return (
    <article className="space-y-8 text-body">
      <h1 className="text-title font-semibold">{policy.title}</h1>
      <section className="space-y-2">
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
      <section className="space-y-3">
        <h2 className="font-semibold">{privacy.processors.title}</h2>
        <p>{policy.processors_lead}</p>
        <ProcessorTable items={lookup(policy.processors)} />
        <p>{policy.planned_processors_lead}</p>
        <ProcessorTable items={lookup(policy.planned_processors)} />
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">{mcp.title}</h2>
        <p>{mcp.text}</p>
      </section>
    </article>
  )
}
