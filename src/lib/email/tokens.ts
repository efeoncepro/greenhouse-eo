import 'server-only'

/**
 * Canonical email token catalog.
 *
 * Defines the standard context that the delivery layer auto-resolves
 * for every recipient. Templates receive these as typed props — no
 * Handlebars/Mustache interpolation engine.
 */

export type EmailLocale = 'es' | 'en'

export interface ResolvedRecipientContext {
  firstName: string
  fullName: string
  email: string
  locale: EmailLocale
  userId: string
}

export interface ResolvedClientContext {
  name: string
  id: string
  tenantType: 'client' | 'efeonce_internal'
}

export interface ResolvedPlatformContext {
  url: string
  supportEmail: string
  logoUrl: string
}

export interface ResolvedEmailContext {
  recipient: ResolvedRecipientContext
  client: ResolvedClientContext
  platform: ResolvedPlatformContext
}

export const DEFAULT_PLATFORM_CONTEXT: ResolvedPlatformContext = {
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com',
  supportEmail: 'soporte@efeoncepro.com',
  logoUrl: 'https://greenhouse.efeoncepro.com/branding/logo-white-email.png'
}
