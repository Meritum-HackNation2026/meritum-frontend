import { type RefObject, useEffect } from 'react'
import pl from '@/copy/pl.json'

/**
 * Keeps the tab title in step with the page (WCAG 2.4.2 Page Titled): „<h1> · Meritum”, or
 * just „Meritum” while the page has no heading. Watches the main region, so a heading that
 * appears after data loads or after a client-side navigation updates the title too.
 *
 * @param main - The page's `<main>` element.
 * @feature US-DST-01, F-01
 */
export function usePageTitle(main: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = main.current
    if (!root) {
      return
    }
    const update = () => {
      const heading = root.querySelector('h1')?.textContent?.trim()
      const title = heading ? `${heading} · ${pl.brand.name}` : pl.brand.name
      if (document.title !== title) {
        document.title = title
      }
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [main])
}
