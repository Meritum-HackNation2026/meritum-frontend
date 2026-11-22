import type { ArchiveState, PageArchives } from '@/checks'
import { fetchClient } from './_client'
import { sessionId } from './_session'
import { SESSION_HEADER } from './constants'

const headers = () => ({ [SESSION_HEADER]: sessionId() })

/**
 * Archives a checked link through POST/GET/DELETE /api/v1/archives (meritum-backend, issue 114), typed by the
 * backend's OpenAPI schema; the tab's session (or the signed-in account) owns the copy. Never
 * throws: a network failure or any answer but 2xx is null or false.
 *
 * @feature US-KOR-07, F-38
 */
export const apiArchives: PageArchives = {
  async request(url) {
    try {
      const { data } = await fetchClient.POST('/api/v1/archives', {
        body: { url },
        params: { header: headers() },
      })
      return data?.archive_id ?? null
    } catch {
      return null
    }
  },
  async read(archiveId) {
    try {
      const { data } = await fetchClient.GET('/api/v1/archives/{archive_id}', {
        params: { path: { archive_id: archiveId }, header: headers() },
      })
      if (!data) return null
      if (data.status === 'done' && data.sha256 && data.archived_at && data.expires_at) {
        return {
          status: 'done',
          sha256: data.sha256,
          archivedAt: data.archived_at,
          expiresAt: data.expires_at,
        } satisfies ArchiveState
      }
      if (data.status === 'refused' && data.refusal) {
        return { status: 'refused', refusal: data.refusal }
      }
      return data.status === 'pending' ? { status: 'pending' } : { status: 'failed' }
    } catch {
      return null
    }
  },
  async download(archiveId) {
    try {
      const { data, response } = await fetchClient.GET('/api/v1/archives/{archive_id}/content', {
        params: { path: { archive_id: archiveId }, header: headers() },
        parseAs: 'blob',
      })
      return response.ok && data instanceof Blob ? data : null
    } catch {
      return null
    }
  },
  async remove(archiveId) {
    try {
      const { response } = await fetchClient.DELETE('/api/v1/archives/{archive_id}', {
        params: { path: { archive_id: archiveId }, header: headers() },
      })
      return response.ok
    } catch {
      return false
    }
  },
}
