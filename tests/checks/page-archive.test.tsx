/**
 * „Zarchiwizuj stronę” under a checked link (a fake port): pending, the copy with its hash,
 * a refusal with the worker's text and deleting the copy.
 *
 * @feature US-KOR-07, F-38
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { type ArchiveState, PageArchive, type PageArchives } from '@/checks'
import pl from '@/copy/pl.json'

const urlAsked = 'https://www.gov.pl/web/rcb'
const sha = 'ab'.repeat(32)

function fakeArchives(states: ArchiveState[], removed: string[] = []): PageArchives {
  return {
    request: () => Promise.resolve('a1'),
    read: () => Promise.resolve(states.length > 1 ? (states.shift() ?? null) : (states[0] ?? null)),
    download: () => Promise.resolve(new Blob(['RCB'])),
    remove: (id) => {
      removed.push(id)
      return Promise.resolve(true)
    },
  }
}

test('the action archives the page and shows the copy with its hash', async () => {
  const done: ArchiveState = {
    status: 'done',
    sha256: sha,
    archivedAt: '2026-11-22T12:00:00Z',
    expiresAt: '2026-12-22T12:00:00Z',
  }
  render(
    <PageArchive
      url={urlAsked}
      archives={fakeArchives([{ status: 'pending' }, done])}
      pollMs={0}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: pl.archive.action }))
  await waitFor(() => assert.ok(screen.getByText(sha)))
  assert.ok(screen.getByText(pl.archive.title))
  assert.ok(screen.getByRole('button', { name: pl.archive.download }))
})

test('a refusal shows the text of its code', async () => {
  render(
    <PageArchive
      url={urlAsked}
      archives={fakeArchives([{ status: 'refused', refusal: 'login_wall' }])}
      pollMs={0}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: pl.archive.action }))
  await waitFor(() => assert.ok(screen.getByText(pl.archive.refusal.login_wall)))
})

test('deleting the copy says it is gone', async () => {
  const removed: string[] = []
  const done: ArchiveState = {
    status: 'done',
    sha256: sha,
    archivedAt: '2026-11-22T12:00:00Z',
    expiresAt: '2026-12-22T12:00:00Z',
  }
  render(<PageArchive url={urlAsked} archives={fakeArchives([done], removed)} pollMs={0} />)
  fireEvent.click(screen.getByRole('button', { name: pl.archive.action }))
  await waitFor(() => screen.getByRole('button', { name: pl.archive.delete }))
  fireEvent.click(screen.getByRole('button', { name: pl.archive.delete }))
  await waitFor(() => assert.ok(screen.getByText(pl.archive.deleted)))
  assert.deepEqual(removed, ['a1'])
})
