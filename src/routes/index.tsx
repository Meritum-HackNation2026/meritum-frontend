import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { healthQuery } from '@/api/health'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const health = useQuery(healthQuery)
  const ok = health.data?.status === 'ok'

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
        <span
          aria-hidden="true"
          className={`size-2 rounded-pill ${ok ? 'bg-verified' : health.isPending ? 'bg-muted-foreground' : 'bg-destructive'}`}
        />
        {health.isPending
          ? 'Łączę z API…'
          : ok
            ? `API działa (${health.data?.env}), baza danych: ${health.data?.database}`
            : 'API nie odpowiada albo nie ma połączenia z bazą'}
      </p>
    </section>
  )
}
