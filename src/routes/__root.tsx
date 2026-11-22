import { createRootRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/app-shell'

/**
 * Root route: every page renders inside the app shell (sticky bar, column with a rail slot,
 * one-row footer). Toasts show on every page.
 *
 * @feature US-SPR-01, US-DST-01, US-BEZ-06, US-BEZ-05, US-POW-01, US-POW-04, US-ZRD-12, F-20, F-26, F-29
 */
export const Route = createRootRoute({ component: AppShell })
