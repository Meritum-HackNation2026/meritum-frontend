import { createFileRoute } from '@tanstack/react-router'
import { apiAskerAnswer } from '@/api'
import { AskerAnswer } from '@/moderation'

/**
 * Address of a moderator's answer at /odpowiedzi/{case_id}, the link of the `moderator_answer`
 * notification. Only a session that got the notification reads it; the answer is not public.
 *
 * @feature US-MOD-07, US-POW-02, F-39
 */
export const Route = createFileRoute('/odpowiedzi/$caseId')({ component: Answer })

function Answer() {
  const { caseId } = Route.useParams()
  return <AskerAnswer caseId={caseId} reader={apiAskerAnswer} />
}
