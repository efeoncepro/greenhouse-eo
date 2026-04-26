import 'server-only'

import type { TeamsAdaptiveCard, TeamsAdaptiveCardElement } from '../types'

export interface DeliveryPulseKpi {
  label: string
  value: string
  trend?: 'up' | 'down' | 'flat' | null
  comparison?: string
}

export interface DeliveryPulseInput {
  /** ISO date (YYYY-MM-DD) covered by the pulse */
  date: string
  headline: string
  summary: string
  kpis: DeliveryPulseKpi[]
  alerts?: string[]
  dashboardUrl?: string
}

const TREND_ARROW: Record<NonNullable<DeliveryPulseKpi['trend']>, string> = {
  up: 'al alza',
  down: 'a la baja',
  flat: 'estable'
}

const formatKpiValue = (kpi: DeliveryPulseKpi) => {
  const trend = kpi.trend ? ` (${TREND_ARROW[kpi.trend]})` : ''
  const comparison = kpi.comparison ? ` ${kpi.comparison}` : ''

  return `${kpi.value}${trend}${comparison}`
}

export const buildDeliveryPulseCard = (input: DeliveryPulseInput): TeamsAdaptiveCard => {
  const body: TeamsAdaptiveCardElement[] = [
    {
      type: 'Container',
      style: 'accent',
      items: [
        {
          type: 'TextBlock',
          text: `PULSE ${input.date}`,
          weight: 'Bolder',
          size: 'Small',
          isSubtle: true
        },
        {
          type: 'TextBlock',
          text: input.headline,
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
      facts: input.kpis.map(kpi => ({ title: kpi.label, value: formatKpiValue(kpi) })),
      separator: true,
      spacing: 'Medium'
    }
  ]

  if (input.alerts && input.alerts.length > 0) {
    body.push({
      type: 'Container',
      style: 'warning',
      separator: true,
      spacing: 'Medium',
      items: [
        {
          type: 'TextBlock',
          text: 'Atencion',
          weight: 'Bolder',
          size: 'Small'
        },
        ...input.alerts.map<TeamsAdaptiveCardElement>(alert => ({
          type: 'TextBlock',
          text: `- ${alert}`,
          wrap: true,
          spacing: 'Small'
        }))
      ]
    })
  }

  return {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.5',
    body,
    actions: input.dashboardUrl
      ? [
          {
            type: 'Action.OpenUrl',
            title: 'Abrir Pulse',
            url: input.dashboardUrl
          }
        ]
      : undefined
  }
}
