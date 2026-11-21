/**
 * Preloaded by `pnpm test` (`node --import ./tests/setup-dom.ts`): gives every test file a
 * happy-dom DOM and unmounts what a test rendered once it ends.
 *
 * @feature none (infrastructure)
 */
import { after, afterEach } from 'node:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

// Imported after register(): @testing-library/dom reads `document` when it loads.
const { cleanup } = await import('@testing-library/react')

afterEach(() => {
  cleanup()
})

after(async () => {
  await GlobalRegistrator.unregister()
})
