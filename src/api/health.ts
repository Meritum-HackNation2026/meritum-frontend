import { queryOptions } from '@tanstack/react-query'

export type Health = { status: 'ok' | 'degraded'; env: string; database: 'ok' | 'unavailable' }

// GET /api/v1/health answers 503 with the same body when the database is down.
export const healthQuery = queryOptions({
  queryKey: ['health'],
  queryFn: async (): Promise<Health> => {
    const response = await fetch('/api/v1/health')
    return (await response.json()) as Health
  },
  refetchInterval: 30_000,
})
