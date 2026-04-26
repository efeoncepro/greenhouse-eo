import 'server-only'

import type { TeamsAdaptiveCard, TeamsAdaptiveCardElement } from '../types'

export type FinanceAlertKind =
  | 'vat_period_materialized'
  | 'balance_divergence'
  | 'sii_claim_detected'
  | 'fx_sync_failure'
  | 'margin_alert'
  | 'dte_discrepancy'
  | 'generic'

export interface FinanceAlertInput {
  kind: FinanceAlertKind
  title: string
  summary: string
  period?: string
  amountCLP?: number
  amountUSD?: number
  entity?: string
  occurredAt: Date | string
  detailUrl?: string
  detailLabel?: string
  extraFacts?: Array<{ title: string; value: string }>
}

const KIND_LABEL: Record<FinanceAlertKind, string> = {
  vat_period_materialized: 'Cierre de IVA',
  balance_divergence: 'Divergencia de balance',
  sii_claim_detected: 'Reclamo SII detectado',
  fx_sync_failure: 'Falla de tipos de cambio',
  margin_alert: 'Alerta de margen',
  dte_discrepancy: 'Discrepancia DTE',
  generic: 'Aviso financiero'
}

const KIND_STYLE: Record<FinanceAlertKind, 'good' | 'attention' | 'warning' | 'accent'> = {
  vat_period_materialized: 'good',
  balance_divergence: 'attention',
  sii_claim_detected: 'attention',
  fx_sync_failure: 'warning',
  margin_alert: 'warning',
  dte_discrepancy: 'warning',
  generic: 'accent'
}

const formatClp = (value: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)

const formatUsd = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)

const toIso = (value: Date | string) => (value instanceof Date ? value.toISOString() : value)

export const buildFinanceAlertCard = (input: FinanceAlertInput): TeamsAdaptiveCard => {
  const facts: Array<{ title: string; value: string }> = [{ title: 'Tipo', value: KIND_LABEL[input.kind] }]

  if (input.period) facts.push({ title: 'Periodo', value: input.period })
  if (input.entity) facts.push({ title: 'Entidad', value: input.entity })
  if (typeof input.amountCLP === 'number') facts.push({ title: 'Monto CLP', value: formatClp(input.amountCLP) })
  if (typeof input.amountUSD === 'number') facts.push({ title: 'Monto USD', value: formatUsd(input.amountUSD) })

  facts.push({ title: 'Ocurrio', value: toIso(input.occurredAt) })

  if (input.extraFacts) facts.push(...input.extraFacts)

  const body: TeamsAdaptiveCardElement[] = [
    {
      type: 'Container',
      style: KIND_STYLE[input.kind],
      items: [
        {
          type: 'TextBlock',
          text: 'FINANCE',
          weight: 'Bolder',
          size: 'Small',
          isSubtle: true
        },
        {
          type: 'TextBlock',
          text: input.title,
          weight: 'Bolder',
          size: 'Medium',
          wrap: true,
          spacing: 'Small'
        }
      ]
    },
    {
      type: 'TextBlock',
      text: input.summary,
      wrap: true,
      spacing: 'Medium'
    },
    {
      type: 'FactSet',
      facts,
      separator: true,
      spacing: 'Medium'
    }
  ]

  return {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.5',
    body,
    actions: input.detailUrl
      ? [
          {
            type: 'Action.OpenUrl',
            title: input.detailLabel || 'Ver detalle',
            url: input.detailUrl
          }
        ]
      : undefined
  }
}
