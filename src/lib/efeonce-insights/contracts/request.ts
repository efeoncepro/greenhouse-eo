/**
 * TASK-1845 — Efeonce Insights · contrato de encargo (`InsightRequestV1`).
 *
 * Browser-safe: sin imports de DB, secretos ni providers. Es el DTO que UI, App API,
 * Ecosystem API y MCP envían al MISMO command (`createEdition`). El actor NUNCA viaja en
 * el payload: proviene de la autoridad autenticada (arquitectura Insights §5).
 */

export const INSIGHT_REQUEST_VERSION = 'insight_request_v1' as const

export const INSIGHT_MODULES = ['seo', 'aeo', 'ico'] as const
export type InsightModule = (typeof INSIGHT_MODULES)[number]

export const INSIGHT_OUTPUTS = ['deck_pdf', 'report_pdf', 'web'] as const
export type InsightOutput = (typeof INSIGHT_OUTPUTS)[number]

export const INSIGHT_AUDIENCES = ['client', 'internal'] as const
export type InsightAudience = (typeof INSIGHT_AUDIENCES)[number]

export const INSIGHT_DEPTHS = ['executive', 'standard', 'detailed'] as const
export type InsightDepth = (typeof INSIGHT_DEPTHS)[number]

export const INSIGHT_LOCALES = ['es-CL', 'en-US'] as const
export type InsightLocale = (typeof INSIGHT_LOCALES)[number]

export const INSIGHT_COMPARISON_KINDS = ['none', 'previous_period', 'previous_year', 'custom'] as const
export type InsightComparisonKind = (typeof INSIGHT_COMPARISON_KINDS)[number]

/** Fecha civil `YYYY-MM-DD` interpretada en `timeZone` (IANA). `endExclusive` NO se incluye. */
export interface InsightPeriodV1 {
  start: string
  endExclusive: string
  timeZone: string
}

export type InsightComparisonV1 =
  | { kind: 'none' }
  | { kind: 'previous_period' }
  | { kind: 'previous_year' }
  | { kind: 'custom'; start: string; endExclusive: string }

export interface InsightBrandV1 {
  efeoncePackVersion: string
  /** Referencia versionada al logo/asset autorizado del cliente; nunca un upload libre. */
  clientBrandRef?: string | null
}

/** Policy explícita de omisiones visibles: nunca salta gates de seguridad ni validez. */
export interface InsightPolicyV1 {
  allowPartial?: boolean
}

export interface InsightRequestV1 {
  requestVersion: typeof INSIGHT_REQUEST_VERSION
  organizationId: string
  projectIds?: string[]
  modules: InsightModule[]
  period: InsightPeriodV1
  comparison: InsightComparisonV1
  audience: InsightAudience
  locale: InsightLocale
  depth: InsightDepth
  outputs: InsightOutput[]
  brand: InsightBrandV1
  policy?: InsightPolicyV1
  /** 8–200 chars. Misma key + mismo payload = misma edición; payload distinto = conflicto. */
  idempotencyKey?: string
  /** Título y propósito del reporte (biblioteca); se ignoran al revisar un reporte existente. */
  title?: string
  purpose?: string
}

export const isInsightModule = (value: unknown): value is InsightModule =>
  typeof value === 'string' && (INSIGHT_MODULES as readonly string[]).includes(value)

export const isInsightOutput = (value: unknown): value is InsightOutput =>
  typeof value === 'string' && (INSIGHT_OUTPUTS as readonly string[]).includes(value)

export const isInsightAudience = (value: unknown): value is InsightAudience =>
  typeof value === 'string' && (INSIGHT_AUDIENCES as readonly string[]).includes(value)
