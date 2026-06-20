/**
 * TASK-1197 — Tipos cliente del card F29 consolidado. Espejo client-side del VM
 * que entrega `GET /api/finance/f29/monthly-position` (TASK-1195). Se redeclaran
 * acá (no se importan los records server-only de `vat-ledger`/`retention-ledger`/
 * `ppm-ledger`) porque el card es `'use client'`. Mismo patrón que
 * `vat-monthly-position-types.ts`.
 */

export interface F29VatLine {
  periodId: string
  debitFiscalAmountClp: number
  creditFiscalAmountClp: number
  nonRecoverableVatAmountClp: number
  netVatPositionClp: number
  materializedAt: string | null
}

export interface F29RetentionLine {
  periodId: string
  totalRetentionAmountClp: number
  documentCount: number
  materializedAt: string | null
}

export interface F29PpmLine {
  periodId: string
  baseAmountClp: number
  ppmRate: number
  ppmAmountClp: number
  materializedAt: string | null
}

export interface F29LineEnablement {
  vat: boolean
  retention: boolean
  ppm: boolean
}

export interface F29LegalEntity {
  organizationId: string
  legalName: string
  taxId: string
  country: string
}

export interface F29ConsolidatedPayload {
  enabledByLine: F29LineEnablement
  vat: F29VatLine | null
  retention: F29RetentionLine | null
  ppm: F29PpmLine | null
  periodId: string
  year: number
  month: number
  legalEntity: F29LegalEntity
}
