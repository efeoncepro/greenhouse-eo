/**
 * TASK-1848 — contratos del ShareGrant (browser-safe). Un grant es un enlace de LECTURA a una
 * edición emitida de audiencia cliente: no abre la biblioteca, no crea ediciones, no envía correo
 * y no actúa como identidad del cliente (arquitectura §7.1/§8).
 */

import type { InsightActorKind } from '../contracts/states'
import type { InsightOutput } from '../contracts/request'

/** Días de vigencia: default de diseño 30, máximo inicial 90 (el techo también es CHECK en DB). */
export const INSIGHT_SHARE_DEFAULT_TTL_DAYS = 30
export const INSIGHT_SHARE_MAX_TTL_DAYS = 90

/** Enlaces activos simultáneos por edición: cota contra fábricas de enlaces. */
export const INSIGHT_SHARE_MAX_ACTIVE_PER_EDITION = 20

/** Outputs que un enlace puede descargar (web es la vista, no una descarga). */
export const INSIGHT_SHARE_DOWNLOADABLE_OUTPUTS = ['deck_pdf', 'report_pdf'] as const satisfies readonly InsightOutput[]
export type InsightShareDownloadableOutput = (typeof INSIGHT_SHARE_DOWNLOADABLE_OUTPUTS)[number]

export const isInsightShareDownloadableOutput = (value: unknown): value is InsightShareDownloadableOutput =>
  typeof value === 'string' && (INSIGHT_SHARE_DOWNLOADABLE_OUTPUTS as readonly string[]).includes(value)

export const INSIGHT_SHARE_REVOKE_REASONS = ['manual', 'edition_withdrawn', 'delivery_superseded', 'delivery_failed', 'authority_revoked'] as const
export type InsightShareRevokeReason = (typeof INSIGHT_SHARE_REVOKE_REASONS)[number]

export type InsightShareStatus = 'active' | 'revoked' | 'expired'
export type InsightShareSource = 'manual' | 'delivery'

export interface InsightShareGrantRecord {
  shareGrantId: string
  organizationId: string
  editionId: string
  downloadOutputs: InsightShareDownloadableOutput[]
  label: string | null
  source: InsightShareSource
  expiresAt: string
  createdByActorKind: InsightActorKind
  createdByUserId: string | null
  createdAt: string
  revokedAt: string | null
  revokedByActorKind: InsightActorKind | null
  revokeReason: InsightShareRevokeReason | null
}

/** DTO de gestión: jamás lleva token ni digest. */
export interface InsightShareGrantDto {
  shareGrantId: string
  editionId: string
  status: InsightShareStatus
  downloadOutputs: InsightShareDownloadableOutput[]
  label: string | null
  source: InsightShareSource
  expiresAt: string
  createdAt: string
  createdByActorKind: InsightActorKind
  revokedAt: string | null
  revokeReason: InsightShareRevokeReason | null
}

export const deriveInsightShareStatus = (grant: Pick<InsightShareGrantRecord, 'revokedAt' | 'expiresAt'>, now: Date = new Date()): InsightShareStatus => {
  if (grant.revokedAt) return 'revoked'
  if (new Date(grant.expiresAt).getTime() <= now.getTime()) return 'expired'

  return 'active'
}

export const projectInsightShareGrant = (grant: InsightShareGrantRecord, now: Date = new Date()): InsightShareGrantDto => ({
  shareGrantId: grant.shareGrantId,
  editionId: grant.editionId,
  status: deriveInsightShareStatus(grant, now),
  downloadOutputs: [...grant.downloadOutputs],
  label: grant.label,
  source: grant.source,
  expiresAt: grant.expiresAt,
  createdAt: grant.createdAt,
  createdByActorKind: grant.createdByActorKind,
  revokedAt: grant.revokedAt,
  revokeReason: grant.revokeReason
})

/** Resultado de crear: el bearer se entrega UNA vez y nunca más es recuperable. */
export interface InsightShareCreatedResult {
  share: InsightShareGrantDto
  token: string
  url: string
}
