import { z } from 'zod'

import { EmailEvidenceError, type EmailProvider } from './email-evidence'

const Binding = z
  .object({
    organizationId: z.string().regex(/^org-[a-z0-9-]+$/),
    provider: z.enum(['resend', 'hubspot']),
    accountRef: z.string().min(1).max(200)
  })
  .strict()

/** The two canonical credentials each map to exactly one configured account; never accept credential refs from a caller. */
export const authorizeEmailEvidence = (input: {
  enabled: boolean
  configuredBindings: string | undefined
  consumerPlatform: string
  bindingPlatform: string
  bindingOrganizationId: string | null
  bindingScope: string
  organizationId: string | null
  provider: string | null
  accountRef: string | null
}): { organizationId: string; provider: EmailProvider; accountRef: string } => {
  if (!input.enabled) throw new EmailEvidenceError('not_configured')
  if (
    input.consumerPlatform !== 'marketing-studio' ||
    input.bindingPlatform !== 'marketing-studio' ||
    input.bindingScope !== 'organization' ||
    !input.organizationId ||
    input.organizationId !== input.bindingOrganizationId
  )
    throw new EmailEvidenceError('not_configured')
  let bindings: z.infer<typeof Binding>[]

  try {
    bindings = z
      .array(Binding)
      .max(2)
      .parse(JSON.parse(input.configuredBindings ?? '[]'))
  } catch {
    throw new EmailEvidenceError('not_configured')
  }

  if (new Set(bindings.map(b => b.provider)).size !== bindings.length) throw new EmailEvidenceError('not_configured')

  const found = bindings.find(
    b => b.organizationId === input.organizationId && b.provider === input.provider && b.accountRef === input.accountRef
  )

  if (!found) throw new EmailEvidenceError('not_configured')

  return found
}
