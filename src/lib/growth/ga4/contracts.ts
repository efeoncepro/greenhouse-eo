/**
 * Google Analytics 4 (GA4) — contratos del dominio.
 *
 * Dos APIs: Admin (config: cuentas, propiedades, dimensiones, conversiones) y Data
 * (reporting: runReport / runRealtimeReport). Mismo patrón que `growth/gtm`: el token
 * lo entrega un `GoogleApiTokenProvider` inyectable, así el mismo cliente sirve Efeonce
 * (service account) y clientes (OAuth per-org).
 *
 * IMPORTANTE — enviar ≠ leer:
 *   - ENVIAR eventos a GA4 (el tag dispara → GA4 recibe el hit) NO requiere acceso por
 *     API: basta el Measurement ID en el tag de GTM.
 *   - LEER eventos/métricas por API (verificar que los eventos llegan, dashboards) SÍ
 *     requiere que el SA esté agregado en la propiedad GA4 (Property Access Management,
 *     rol Viewer/Analyst). GA4 access ≠ IAM de GCP, igual que GTM.
 */

import 'server-only'

export const GA4_ADMIN_API_BASE = 'https://analyticsadmin.googleapis.com/v1beta'
export const GA4_DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta'

/** Scopes canónicos de las Analytics APIs. */
export const GA4_SCOPES = {
  /** Leer config + data (Admin read + Data API). Suficiente para verificar eventos. */
  readonly: 'https://www.googleapis.com/auth/analytics.readonly',
  /** Escribir config vía Admin API (conversiones, custom dimensions, etc.). */
  edit: 'https://www.googleapis.com/auth/analytics.edit'
} as const

/** Proveedor de access token. Efeonce lo resuelve por SA; clientes por OAuth per-org. */
export interface GoogleApiTokenProvider {
  getAccessToken(): Promise<string>
}

export interface Ga4PropertySummary {
  /** Resource name: `properties/{propertyId}`. */
  property: string
  /** ID numérico de la propiedad (para la Data API). */
  propertyId: string
  displayName: string
  /** `accounts/{accountId}` u otro parent, o null. */
  parent: string | null
}

export interface Ga4AccountSummary {
  /** Resource name: `accountSummaries/{accountId}`. */
  account: string
  accountId: string
  displayName: string
  properties: Ga4PropertySummary[]
}

/** Fila de conteo de eventos (realtime o histórico) por nombre de evento. */
export interface Ga4EventCountRow {
  eventName: string
  eventCount: number
}
