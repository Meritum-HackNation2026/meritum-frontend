import type { AdminApi, AdminOutcome, DemoRevokeOutcome } from '@/moderation'
import { fetchClient } from './_client'
import { csrfHeaders } from './_csrf'
import { HTTP_FORBIDDEN, HTTP_NOT_FOUND, HTTP_UNAUTHORIZED, HTTP_UNPROCESSABLE } from './constants'

const refusals: Record<number, AdminOutcome> = {
  [HTTP_UNAUTHORIZED]: 'expired',
  [HTTP_FORBIDDEN]: 'no_access',
  [HTTP_UNPROCESSABLE]: 'invalid',
}

// Every write repeats the session's CSRF token; no session means it ended.
async function write<Extra extends string = never>(
  call: (headers: Record<string, string>) => Promise<{ response: Response }>,
  extra: Record<number, Extra> = {},
): Promise<AdminOutcome | Extra> {
  try {
    const headers = await csrfHeaders()
    if (!headers) {
      return 'expired'
    }
    const { response } = await call(headers)
    return response.ok ? 'saved' : (extra[response.status] ?? refusals[response.status] ?? 'failed')
  } catch {
    return 'failed'
  }
}

// The token is the last segment of the link's address.
const tokenOf = (url: string) => url.split('/').pop() ?? ''

async function list<T>(call: () => Promise<{ data?: T[] | undefined }>): Promise<T[] | null> {
  try {
    const { data } = await call()
    return Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

/**
 * Administration API of meritum-backend (backend#22): staff accounts under /api/v1/staff and
 * high-risk topics under /api/v1/moderation/topics, demo links under /api/v1/staff/demo-links (backend#53). Never throws: an unreachable API is `failed`
 * or no list; 401 is `expired`, 403 `no_access`, 422 `invalid`.
 *
 * @feature US-MOD-05, F-20, F-25
 */
export const apiAdmin: AdminApi = {
  accounts: () => list(() => fetchClient.GET('/api/v1/staff')),
  grant: (account) =>
    write((headers) => fetchClient.POST('/api/v1/staff', { headers, body: account })),
  revoke: (email) =>
    write((headers) =>
      fetchClient.DELETE('/api/v1/staff/{email}', { headers, params: { path: { email } } }),
    ),
  topics: () => list(() => fetchClient.GET('/api/v1/moderation/topics')),
  saveTopic: (topic) =>
    write((headers) => fetchClient.POST('/api/v1/moderation/topics', { headers, body: topic })),
  async issueDemoLink(account, expiresAt) {
    try {
      const headers = await csrfHeaders()
      if (!headers) {
        return 'expired'
      }
      const { data, response } = await fetchClient.POST('/api/v1/staff/demo-links', {
        headers,
        body: { account, expires_at: expiresAt },
      })
      if (data) {
        return { link: { url: data.url, expiresAt: data.expires_at } }
      }
      if (response.status === HTTP_NOT_FOUND) {
        return 'unavailable'
      }
      const refused = refusals[response.status]
      return refused && refused !== 'saved' ? refused : 'failed'
    } catch {
      return 'failed'
    }
  },
  revokeDemoLink: (account, url): Promise<DemoRevokeOutcome> =>
    write(
      (headers) =>
        fetchClient.POST('/api/v1/staff/demo-links/revoke', {
          headers,
          body: { account, token: tokenOf(url) },
        }),
      { [HTTP_NOT_FOUND]: 'not_found' as const },
    ),
  deleteTopic: (name) =>
    write((headers) =>
      fetchClient.DELETE('/api/v1/moderation/topics/{name}', {
        headers,
        params: { path: { name } },
      }),
    ),
}
