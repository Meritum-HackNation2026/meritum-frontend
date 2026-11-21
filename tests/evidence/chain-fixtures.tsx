/**
 * Shared fixtures of the evidence-chain tests: citations built from the contract example and
 * a result card rendered around one claim.
 *
 * @feature US-ZRD-11, US-ZRD-04, US-ZRD-05, US-ZRD-10, F-17
 */
import assert from 'node:assert/strict'
import { render, screen, within } from '@testing-library/react'
import examples from '@/contracts/examples.json'
import type { CheckResult, Citation, ClaimResult } from '@/contracts/meritum'
import { CheckResultCard } from '@/evidence'
import { fakeHandoff } from '../moderation/fake-handoff'

const done = examples['CheckResult.done'] as CheckResult
const [first] = done.claims ?? []
const { handoff } = fakeHandoff()

/**
 * The first claim of the contract's done example, which the fixtures change.
 *
 * @feature US-ZRD-11, F-17
 */
export const base = first

/**
 * A citation like the example's, with its own id, title `Dokument <id>`, publisher and date.
 *
 * @param id - Source id, also used in the title.
 * @param changes - Stance, validity or other citation fields.
 * @param published - Publication date (ISO 8601).
 * @param publisher - The publisher id.
 * @returns The citation.
 * @feature US-ZRD-11, F-17
 */
export function citation(
  id: string,
  changes: Partial<Citation>,
  published: string,
  publisher = 'gov',
): Citation {
  assert.ok(first?.citations?.[0])
  const { source } = first.citations[0]
  return {
    ...first.citations[0],
    ...changes,
    source: {
      ...source,
      id,
      title: `Dokument ${id}`,
      publisher_id: publisher,
      published_at: published,
    },
  }
}

/**
 * Renders the result card with one claim: the example's first claim with `changes`.
 *
 * @param changes - Fields of the claim to change.
 * @returns Queries scoped to the claim's article.
 * @feature US-ZRD-11, F-17
 */
export function renderClaim(changes: Partial<ClaimResult>) {
  assert.ok(first)
  render(
    <CheckResultCard result={{ ...done, claims: [{ ...first, ...changes }] }} handoff={handoff} />,
  )
  return within(screen.getByRole('article'))
}

/**
 * Whether the page shows a text anywhere.
 *
 * @param text - The text to look for.
 * @returns True when the page contains it.
 * @feature US-ZRD-11, F-17
 */
export function hasText(text: string): boolean {
  return document.body.textContent?.includes(text) ?? false
}

/**
 * A superseded supporting citation from 2025-01-10.
 *
 * @feature US-ZRD-04, F-17
 */
export const older = citation(
  'old',
  { stance: 'supports', validity: 'superseded' },
  '2025-01-10T00:00:00Z',
)

/**
 * A refuting citation of the same publisher from 2026-02-15.
 *
 * @feature US-ZRD-04, F-17
 */
export const newer = citation(
  'new',
  { stance: 'refutes', validity: 'expires' },
  '2026-02-15T00:00:00Z',
)
