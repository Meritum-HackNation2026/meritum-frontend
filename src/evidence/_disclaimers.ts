import catalog from '@/contracts/catalog.json'

// publisher_id → the catalogue's note on that publisher, e.g. EUvsDisinfo (meritum-core issue 146)
const byPublisher = new Map(
  catalog.entries.flatMap((entry) =>
    entry.disclaimer ? [[entry.publisher_id, entry.disclaimer] as const] : [],
  ),
)

/**
 * The catalogue disclaimer of a citation's publisher, shown under its source line.
 *
 * @param publisherId - `Source.publisher_id` of the citation.
 * @returns The disclaimer, or null when the catalogue has none.
 * @feature F-05, US-ZRD-11
 */
export const disclaimerOf = (publisherId: string): string | null =>
  byPublisher.get(publisherId) ?? null
