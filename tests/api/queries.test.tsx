/**
 * The stack the moderator panel builds on, in one example: a typed openapi-react-query hook
 * reads GET /api/v1/moderation/cases, TanStack Table lays the cases out and a zustand store
 * keeps the case the moderator picked. The panel itself is a later issue.
 *
 * @feature US-MOD-01, F-25
 */
import assert from 'node:assert/strict'
import { type TestContext, test } from 'node:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'
import { fireEvent, render, screen } from '@testing-library/react'
import type { MouseEvent } from 'react'
import { create } from 'zustand'
import { type ApiSchemas, meritumQueries } from '@/api'
import { requestPath } from '../fetch-request'

type Case = ApiSchemas['ModeratorCase']

const useSelection = create<{ picked: string | null; pick: (id: string) => void }>()((set) => ({
  picked: null,
  pick: (id) => set({ picked: id }),
}))

const features = tableFeatures({})
const column = createColumnHelper<typeof features, Case>()
const columns = column.columns([
  column.accessor('summary', { header: 'Sprawa' }),
  column.accessor('distinct_askers', { header: 'Pytających' }),
])
const noCases: Case[] = []
const pickRow = (event: MouseEvent<HTMLTableRowElement>) =>
  useSelection.getState().pick(event.currentTarget.id)

function CasesTable() {
  const { data } = meritumQueries.useQuery('get', '/api/v1/moderation/cases')
  const table = useTable({ features, columns, data: data ?? noCases })
  return (
    <table>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} id={row.original.id} onClick={pickRow}>
            {row.getAllCells().map((cell) => (
              <td key={cell.id}>
                <table.FlexRender cell={cell} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const openCase: Case = {
  id: 'case_01',
  state: 'open',
  reasons: ['high_risk'],
  summary: 'Szczepionki a bezpłodność',
  claims: [],
  distinct_askers: 7,
  first_seen: '2026-11-20T10:00:00Z',
  last_seen: '2026-11-21T10:00:00Z',
  assignee_role: 'moderator',
}

function fakeApi(t: TestContext) {
  return t.mock.method(globalThis, 'fetch', () =>
    Promise.resolve(new Response(JSON.stringify([openCase]), { status: 200 })),
  )
}

test('the typed hook reads the cases into table rows and a click picks one', async (t) => {
  const fetch = fakeApi(t)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <CasesTable />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByText(openCase.summary))
  assert.equal(screen.getByText('7').tagName, 'TD')
  assert.equal(useSelection.getState().picked, 'case_01')
  assert.equal(requestPath(fetch.mock.calls[0]?.arguments[0]), '/api/v1/moderation/cases')
})
