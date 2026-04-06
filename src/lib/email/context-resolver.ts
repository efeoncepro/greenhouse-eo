import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { DEFAULT_PLATFORM_CONTEXT } from './tokens'
import type { EmailLocale, ResolvedEmailContext } from './tokens'

interface UserClientRow {
  user_id: string
  full_name: string | null
  email: string
  locale: string | null
  client_id: string | null
  client_name: string | null
  tenant_type: string
  email_undeliverable: boolean
}

const extractFirstName = (fullName: string): string => {
  const first = fullName.trim().split(/\s+/)[0]

  return first || fullName
}

const normalizeLocale = (raw: string | null | undefined): EmailLocale =>
  raw === 'en' ? 'en' : 'es'

/**
 * Resolves canonical email context for a recipient by email address.
 *
 * Queries `client_users` JOIN `clients` to hydrate recipient + client data.
 * Returns `null` if the user is not found in the database (external recipient).
 * Throws if the recipient is marked as `email_undeliverable`.
 */
export const resolveEmailContext = async (
  recipientEmail: string
): Promise<ResolvedEmailContext | null> => {
  const normalizedEmail = recipientEmail.trim().toLowerCase()

  const rows = await runGreenhousePostgresQuery<UserClientRow & Record<string, unknown>>(`
    SELECT
      cu.user_id,
      cu.full_name,
      cu.email,
      cu.locale,
      cu.client_id,
      c.client_name,
      cu.tenant_type,
      cu.email_undeliverable
    FROM greenhouse_core.client_users cu
    LEFT JOIN greenhouse_core.clients c ON c.client_id = cu.client_id
    WHERE LOWER(cu.email) = $1
    LIMIT 1
  `, [normalizedEmail])

  const row = rows[0]

  if (!row) {
    return null
  }

  if (row.email_undeliverable) {
    throw new EmailUndeliverableError(normalizedEmail, row.user_id)
  }

  const fullName = row.full_name || ''

  return {
    recipient: {
      firstName: extractFirstName(fullName),
      fullName,
      email: row.email || normalizedEmail,
      locale: normalizeLocale(row.locale),
      userId: row.user_id
    },
    client: {
      name: row.client_name || (row.tenant_type === 'efeonce_internal' ? 'Efeonce' : 'Greenhouse'),
      id: row.client_id || '',
      tenantType: (row.tenant_type as 'client' | 'efeonce_internal') || 'client'
    },
    platform: DEFAULT_PLATFORM_CONTEXT
  }
}

export class EmailUndeliverableError extends Error {
  readonly recipientEmail: string
  readonly userId: string

  constructor(email: string, userId: string) {
    super(`Recipient ${email} is marked as undeliverable.`)
    this.name = 'EmailUndeliverableError'
    this.recipientEmail = email
    this.userId = userId
  }
}
