import 'server-only'

import type { TeamsAdaptiveCard, TeamsAdaptiveCardElement } from '../types'

export type OpsAlertSeverity = 'critical' | 'warning' | 'info'

export interface OpsAlertInput {
  title: string
  message: string
  severity: OpsAlertSeverity
  source: string
  occurredAt: Date | string
  environment?: string
  facts?: Array<{ title: string; value: string }>
  actionUrl?: string
  actionLabel?: string
}

const SEVERITY_LABEL: Record<OpsAlertSeverity, string> = {
  critical: 'Critico',
  warning: 'Atencion',
  info: 'Informativo'
}

const SEVERITY_STYLE: Record<OpsAlertSeverity, 'attention' | 'warning' | 'accent'> = {
  critical: 'attention',
  warning: 'warning',
  info: 'accent'
}

const SEVERITY_TEXT_COLOR: Record<OpsAlertSeverity, 'Attention' | 'Warning' | 'Accent'> = {
  critical: 'Attention',
  warning: 'Warning',
  info: 'Accent'
}

const toIso = (value: Date | string) => (value instanceof Date ? value.toISOString() : value)

export const buildOpsAlertCard = (input: OpsAlertInput): TeamsAdaptiveCard => {
  const facts: Array<{ title: string; value: string }> = [
    { title: 'Fuente', value: input.source },
    { title: 'Ocurrio', value: toIso(input.occurredAt) }
  ]

  if (input.environment) {
    facts.push({ title: 'Entorno', value: input.environment })
  }

  if (input.facts) {
    facts.push(...input.facts)
  }

  const body: TeamsAdaptiveCardElement[] = [
    {
      type: 'Container',
      style: SEVERITY_STYLE[input.severity],
      items: [
        {
          type: 'TextBlock',
          text: SEVERITY_LABEL[input.severity].toUpperCase(),
          weight: 'Bolder',
          size: 'Small',
          color: SEVERITY_TEXT_COLOR[input.severity]
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
      text: input.message,
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
    actions: input.actionUrl
      ? [
          {
            type: 'Action.OpenUrl',
            title: input.actionLabel || 'Abrir en Greenhouse',
            url: input.actionUrl
          }
        ]
      : undefined
  }
}
