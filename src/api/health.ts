import { queryOptions } from '@tanstack/react-query'

/**
 * Body of GET /api/v1/health.
 *
 * @feature none (infrastructure)
 */
export type Health = { status: 'ok' | 'degraded'; env: string; database: 'ok' | 'unavailable' }

/**
 * Polls GET /api/v1/health, which answers 503 with the same body when the database is down.
 *
 * @feature none (infrastructure)
 */
export const healthQuery = queryOptions({
  queryKey: ['health'],
  queryFn: async (): Promise<Health> => {
    const response = await fetch('/api/v1/health')
    return (await response.json()) as Health
  },
  refetchInterval: 30_000,
})
