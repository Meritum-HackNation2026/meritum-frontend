import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { type Health, healthQuery } from '@/api'

/**
 * Home page: the place of the check form (US-SPR-01); for now it shows the API status.
 *
 * @feature US-SPR-01
 */
export const Route = createFileRoute('/')({ component: Home })

function statusText(health: UseQueryResult<Health>): string {
  if (health.isPending) {
    return 'Łączę z API…'
  }
  const data = health.data
  return data?.status === 'ok'
    ? `API działa (${data.env}), baza danych: ${data.database}`
    : 'API nie odpowiada albo nie ma połączenia z bazą'
}

function statusDot(health: UseQueryResult<Health>): string {
  if (health.isPending) {
    return 'bg-muted-foreground'
  }
  return health.data?.status === 'ok' ? 'bg-verified' : 'bg-destructive'
}

function Home() {
  const health = useQuery(healthQuery)

  return (
    <section className="rounded-lg border bg-card p-6">
      <h1 className="text-title font-semibold">Sprawdź informację</h1>
      <p className="mt-2 text-body text-muted-foreground">
        Formularz sprawdzania twierdzeń jest w budowie. Na razie ta strona pokazuje stan systemu.
      </p>
      <p
        className="mt-6 inline-flex items-center gap-2 rounded-pill border px-3 py-1 text-small"
        aria-live="polite"
      >
        <span aria-hidden="true" className={`size-2 rounded-pill ${statusDot(health)}`} />
        {statusText(health)}
      </p>
    </section>
  )
}
