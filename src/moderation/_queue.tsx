import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { ModerationQueue } from '@/components/meritum'
import type { ModeratorCase } from '@/contracts/meritum'
import { DEFAULT_DISTINCT_ASKERS } from './constants'

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic },
})
const column = createColumnHelper<typeof features, ModeratorCase>()
// distinct_askers raises a case's priority; ties keep the API's latest-first order
const columns = column.columns([
  column.accessor((c) => c.distinct_askers ?? DEFAULT_DISTINCT_ASKERS, {
    id: 'distinct_askers',
    sortFn: 'basic',
  }),
])
const byPriority = { sorting: [{ id: 'distinct_askers', desc: true }] }

/**
 * The case queue in priority order: most distinct askers first. TanStack Table sorts the rows,
 * `ModerationQueue` from the design system renders them.
 *
 * @param props.cases - The cases from the API.
 * @param props.selectedId - The case open in the detail view.
 * @param props.onOpen - Opens a case.
 * @returns The queue.
 * @feature US-MOD-05, US-MOD-02, F-25
 */
export function CaseQueue(props: {
  cases: ModeratorCase[]
  selectedId: string | undefined
  onOpen: (id: string) => void
}) {
  const table = useTable({ features, columns, data: props.cases, state: byPriority })
  const sorted = table.getRowModel().rows.map((row) => row.original)
  return (
    <ModerationQueue
      cases={sorted}
      onOpen={props.onOpen}
      {...(props.selectedId ? { selectedId: props.selectedId } : {})}
    />
  )
}
