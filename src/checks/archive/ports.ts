/**
 * Why the worker made no copy of a page (`ArchiveRefusal` codes, keys of `archive.refusal`).
 *
 * @feature US-KOR-07, F-38
 */
type ArchiveRefusal = 'login_wall' | 'robots_or_tdm' | 'fetch_failed' | 'rate_limited'

/**
 * Where an archived copy is: being made, made (its hash and dates), refused or failed.
 *
 * @feature US-KOR-07, F-38
 */
export type ArchiveState =
  | { status: 'pending' }
  | { status: 'done'; sha256: string; archivedAt: string; expiresAt: string }
  | { status: 'refused'; refusal: ArchiveRefusal }
  | { status: 'failed' }

/**
 * Archives a public page on the citizen's request and reads, downloads or deletes the copy.
 * Never throws: a failure is null or false.
 *
 * @feature US-KOR-07, F-38
 */
export interface PageArchives {
  /**
   * Asks for a copy of `url`.
   *
   * @param url - The checked link.
   * @returns The copy's id to poll, or null when the request was refused or failed.
   */
  request(url: string): Promise<string | null>
  /**
   * Reads where a copy is.
   *
   * @param archiveId - The copy's id.
   * @returns Its state, or null when it is gone or unreadable.
   */
  read(archiveId: string): Promise<ArchiveState | null>
  /**
   * Fetches the archived text.
   *
   * @param archiveId - The copy's id.
   * @returns The text as a file, or null.
   */
  download(archiveId: string): Promise<Blob | null>
  /**
   * Deletes the copy and its text.
   *
   * @param archiveId - The copy's id.
   * @returns Whether it was deleted.
   */
  remove(archiveId: string): Promise<boolean>
}
