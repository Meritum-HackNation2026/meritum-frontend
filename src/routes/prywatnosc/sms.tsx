import { createFileRoute } from '@tanstack/react-router'
import { PrivacyPolicy } from '@/components/privacy-policy'

/**
 * Privacy policy of the SMS channel at a fixed address that other channels link to.
 *
 * @feature US-BEZ-06, US-BEZ-05, F-20
 */
export const Route = createFileRoute('/prywatnosc/sms')({
  component: () => <PrivacyPolicy channel="sms" />,
})
