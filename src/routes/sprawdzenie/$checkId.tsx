import { createFileRoute } from '@tanstack/react-router'
import { apiResultReader } from '@/api'
import { ResultPage } from '@/checks'

/**
 * Result page of one check at /sprawdzenie/{id}: the form goes here once the API accepts a
 * check, and the address can be opened again while the record is kept.
 *
 * @feature US-SPR-01, US-SPR-04, F-01, F-17
 */
export const Route = createFileRoute('/sprawdzenie/$checkId')({ component: Result })

function Result() {
  const { checkId } = Route.useParams()
  return <ResultPage key={checkId} checkId={checkId} reader={apiResultReader} />
}
