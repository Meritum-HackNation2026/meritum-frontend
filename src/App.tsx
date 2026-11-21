import { useEffect, useState } from 'react'

type Health = { status: string; env: string; database: string }

export function App() {
  const [health, setHealth] = useState<Health | null>(null)

  useEffect(() => {
    fetch('/api/v1/health')
      .then((r) => r.json() as Promise<Health>)
      .then(setHealth)
      .catch(() => setHealth(null))
  }, [])

  return (
    <main className="mx-auto max-w-xl p-8 font-sans">
      <h1 className="text-3xl font-semibold">Meritum</h1>
      <p className="mt-2 text-neutral-600">Obywatelski radar dezinformacji oraz scamu</p>
      <p className="mt-6 text-sm" aria-live="polite">
        API:{' '}
        {health ? `${health.status} (${health.env}, baza: ${health.database})` : 'brak odpowiedzi'}
      </p>
    </main>
  )
}
