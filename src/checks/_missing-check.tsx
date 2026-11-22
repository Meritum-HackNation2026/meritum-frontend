import { fill, t } from '@/components/meritum'
import { Button } from '@/components/ui/button'
import { RETENTION_DAYS } from './constants'

/**
 * What the result page shows when the API has no such check (404): an old or mistyped address,
 * or a record deleted after the retention period. It is not a processing failure, so there is
 * no „Spróbuj za kilka minut”, only a way back to the home page.
 *
 * @returns The line and the link home.
 * @feature US-SPR-09, US-DST-01, F-01
 */
export function MissingCheck() {
  return (
    <div className="grid min-w-0 justify-items-start gap-3">
      <p role="alert" className="text-small text-pretty">
        {fill(t.result.not_found, { days: RETENTION_DAYS })}
      </p>
      <Button asChild size="lg" variant="outline" className="h-11 rounded-pill px-4 text-body">
        <a href="/">{t.layout.back_home}</a>
      </Button>
    </div>
  )
}
