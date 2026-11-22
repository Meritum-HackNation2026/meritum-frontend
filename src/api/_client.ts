import createFetchClient from 'openapi-fetch'
import createQueryClient from 'openapi-react-query'
import type { components, paths } from './_openapi.gen'

/**
 * Typed fetch client of meritum-backend: paths, parameters and bodies come from its OpenAPI
 * schema (`pnpm openapi`). Calls the global `fetch` at request time, so tests can swap it.
 *
 * @feature none (infrastructure)
 */
export const fetchClient = createFetchClient<paths>({
  fetch: (request) => globalThis.fetch(request),
})

/**
 * TanStack Query hooks over the same client (`useQuery`, `useMutation`, `queryOptions`), for
 * screens that read the API straight from a component.
 *
 * @feature none (infrastructure)
 */
export const meritumQueries = createQueryClient(fetchClient)

/**
 * What a thrown `fetchClient` call means for the page: `fetch` rejects with a TypeError when
 * the API is unreachable, and an unreadable JSON body is a SyntaxError.
 *
 * @param error - What the call threw.
 * @returns `busy` for an unreadable answer, `offline` otherwise.
 * @feature US-SPR-01, F-01
 */
export function failureOf(error: unknown): 'busy' | 'offline' {
  return error instanceof SyntaxError ? 'busy' : 'offline'
}

/**
 * Models of meritum-backend by their OpenAPI name, e.g. `ApiSchemas['ModeratorCase']`.
 *
 * @feature none (infrastructure)
 */
export type ApiSchemas = components['schemas']
