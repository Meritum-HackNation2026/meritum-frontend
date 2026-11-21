import { createFileRoute } from '@tanstack/react-router'
import { type CatalogRow, MethodPage } from '@/evidence'

// catalog.json is a pnpm sync copy from meritum-core; until meritum-core#22 lands, sync skips
// it and the glob finds nothing. import.meta.env is undefined outside Vite (node --test),
// where the glob is never evaluated.
const catalogFiles: Record<string, { entries: CatalogRow[] }> = import.meta.env
  ? import.meta.glob('/src/contracts/catalog.json', { eager: true, import: 'default' })
  : {}
const catalog = Object.values(catalogFiles)[0]?.entries ?? null

/**
 * Public page "Jak działa Meritum" at /jak-dziala; no sign-in is needed.
 *
 * shortcut: no finished evaluation run is shown until meritum-backend#35 serves the public
 * summary of the last run; then load it here through src/api.
 *
 * @feature US-ZRD-12, F-29
 */
export const Route = createFileRoute('/jak-dziala')({
  component: () => <MethodPage catalog={catalog} run={null} />,
})
