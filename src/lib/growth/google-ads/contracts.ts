/** Initial operator binding. Expanding accounts requires a separately authorized binding. */
export const GOOGLE_ADS_PROFILE = Object.freeze({
  customerId: '6862539491',
  loginCustomerId: '9531478329',
  authorizedEmail: 'jreyes@efeoncepro.com',
  cloudIdentity: 'julio.reyes@efeonce.org',
  cloudProject: 'efeonce-group',
  clientId: '183008134038-1tv5o3kk9dmqhv0q4r41dcd5kg64qdtl.apps.googleusercontent.com',
  apiVersion: 'v26',
  timeZone: 'America/Santiago',
  secretName: 'efeonce-google-ads-agent-oauth'
})

export const GOOGLE_ADS_SCOPE = 'https://www.googleapis.com/auth/adwords'
export const GOOGLE_ADS_CLI_VERSION = 'google-ads-agent.v1'
export const MEASUREMENT_BINDINGS_COMMAND = 'conversions bindings'
export const MEASUREMENT_BINDINGS_DESCRIPTION = 'Bindings nativos verificados de solicitud comercial y agenda; AW/label sin HTML ni datos de leads.'

export class GoogleAdsError extends Error {
  constructor(
    readonly code: string,
    readonly exitCode = 2,
    readonly details: { httpStatus?: number; requestId?: string; providerCodes?: string[] } = {}
  ) {
    super(code)
    this.name = 'GoogleAdsError'
  }
}

export type ReportLevel = 'account' | 'campaign' | 'adgroup' | 'ad'
export type ReadOptions = { pages?: number; cursor?: string; since?: string; until?: string; days?: number; level?: ReportLevel; daily?: boolean }
export type ReadCommand = 'account get' | 'budgets list' | 'campaigns list' | 'adgroups list' | 'ads list' | 'conversions list' | 'goals account' | 'goals campaigns' | 'goals config' | 'goals custom' | 'report get'

export const READ_COMMANDS: Record<ReadCommand, string> = {
  'account get': 'Identidad, moneda/timezone y configuración de conversion tracking.',
  'budgets list': 'Presupuestos, importe en micros y estado.',
  'campaigns list': 'Inventario de campañas, estado y canal.',
  'adgroups list': 'Inventario de grupos de anuncios.',
  'ads list': 'Metadatos ad_group_ad; no cubre asset groups de Performance Max.',
  'conversions list': 'Acciones de conversión y configuración; sin snippets.',
  'goals account': 'Objetivos de cuenta.',
  'goals campaigns': 'Objetivos por campaña.',
  'goals config': 'Selección de objetivos por campaña.',
  'goals custom': 'Objetivos personalizados.',
  'report get': 'Métricas agregadas por nivel y fechas, sin búsquedas/click IDs/datos de leads.'
}
