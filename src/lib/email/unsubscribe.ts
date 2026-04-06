import 'server-only'

import { generateToken, storeToken } from '@/lib/auth-tokens'

const UNSUBSCRIBE_TOKEN_TTL_HOURS = 30 * 24 // 30 days

/**
 * Generate a signed unsubscribe URL for email footers.
 *
 * The URL points to the email-preferences API route with a JWT token.
 * Recipients can unsubscribe without logging in — the token carries
 * their email and the email type securely.
 */
export const generateUnsubscribeUrl = async (
  recipientEmail: string,
  emailType: string
): Promise<string> => {
  const token = generateToken(
    { email: recipientEmail, type: 'unsubscribe' },
    UNSUBSCRIBE_TOKEN_TTL_HOURS
  )

  await storeToken(token, { email: recipientEmail, type: 'unsubscribe' })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com'

  return `${baseUrl}/api/account/email-preferences?token=${encodeURIComponent(token)}&action=unsubscribe&emailType=${encodeURIComponent(emailType)}`
}
