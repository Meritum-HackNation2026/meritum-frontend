import { Link } from '@tanstack/react-router'
import pl from '@/copy/pl.json'
import privacy from '@/copy/privacy.json'

/**
 * The AI Act art. 50 notice shown at first contact on the website, with a link to the
 * website's privacy policy.
 *
 * @returns The notice paragraph.
 * @feature US-BEZ-06, US-BEZ-05, F-20
 */
export function AiNotice() {
  return (
    <p className="text-small text-muted-foreground">
      {pl.ai_notice.first_contact}{' '}
      <Link to="/prywatnosc" className="py-3 underline underline-offset-3">
        {privacy.policies.web.title}
      </Link>
    </p>
  )
}
