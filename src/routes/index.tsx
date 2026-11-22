import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/components/home-page'

/**
 * Home page: what Meritum does, with „Sprawdź informację” to the page of a new check
 * (/sprawdz) and an example result; it has no field. No sign-in is needed.
 *
 * @feature US-SPR-01, US-DST-01, F-01
 */
export const Route = createFileRoute('/')({ component: HomePage })
