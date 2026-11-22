import { OnPageToc } from '@/components/on-page-toc'
import { METHOD_SECTIONS } from './constants'

/**
 * „Na tej stronie”: the table of contents of „Jak działa Meritum” for the rail.
 *
 * @returns The navigation.
 * @feature US-ZRD-12, F-29
 */
export function MethodToc() {
  return <OnPageToc sections={METHOD_SECTIONS} />
}
