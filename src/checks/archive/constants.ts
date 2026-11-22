/**
 * How often a pending archived copy is read again, in milliseconds.
 *
 * @feature US-KOR-07, F-38
 */
export const ARCHIVE_POLL_MS = 2000

/**
 * A question that is one http(s) link; such a question gets „Zarchiwizuj stronę” under it.
 *
 * @feature US-KOR-07, F-38
 */
export const LINK_QUESTION = /^https?:\/\/\S+$/
