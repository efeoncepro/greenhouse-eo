// TASK-1096 — Specimens de PORTABILIDAD fuera de Knowledge.
//
// Prueban que el mismo NexaAnswersCanvas + el contrato surfaceContext/renderPlan son agnósticos del
// dominio: el primitive ya nació con kinds finance/agency (financeChartEmbedded, agencyInsightEmbedded)
// y variantes chart/metricSummary. Datos SINTÉTICOS y declarados como tales (dataReality: 'synthetic').

import type { NexaAnswersRenderPlan, NexaAnswersSurfaceContext } from '@/components/greenhouse/primitives'

// ── Specimen A — Finance · chart (margen de contribución comprimido) ─────────────────────────────

export const financeSurfaceContext: NexaAnswersSurfaceContext = {
  surfaceId: 'finance.nexa.answers',
  domain: 'finance',
  placement: 'chart',
  dataReality: 'synthetic',
  sensitivity: 'confidential',
  allowedRenderers: ['answerBubble', 'compactAnswer'],
  allowedActions: ['read', 'explain', 'comparePeriod']
}

export const financeRenderPlan: NexaAnswersRenderPlan = {
  id: 'finance-margin-chart-answer',
  version: 'nexa-answer-render-plan.v1',
  intent: 'diagnose',
  autonomyTier: 'observeOnly',
  primaryBlockId: 'finance-margin-chart',
  trustCue: {
    tone: 'warning',
    label: 'Margen comprimido — revisar antes de renovar',
    detail: 'Finance · synthetic · costo laboral creció más rápido que el ingreso'
  },
  actions: [
    { label: 'Abrir P&L del cliente', iconClassName: 'tabler-report-money', variant: 'outlined', tone: 'primary', id: 'finance-action-1', intent: 'openSource', riskLevel: 'low' },
    { label: 'Comparar período', iconClassName: 'tabler-arrows-left-right', variant: 'outlined', tone: 'secondary', id: 'finance-action-2', intent: 'comparePeriod', riskLevel: 'low' },
    { label: 'Señalar a Finanzas', iconClassName: 'tabler-flag', variant: 'text', tone: 'secondary', id: 'finance-action-3', intent: 'flagGap', riskLevel: 'low' }
  ],
  proof: {
    id: 'finance-margin-proof',
    label: 'Base',
    collapsedLabel: 'Ver base',
    expandedLabel: 'Ocultar base'
  },
  blocks: [
    {
      id: 'finance-margin-chart',
      renderer: 'answerBubble',
      rendererVersion: 'v1',
      kind: 'financeChartAnswer',
      title: 'El margen cae porque el costo laboral sube más rápido que el ingreso.',
      body: [
        { text: 'El ingreso creció, pero el ' },
        { text: 'margen de contribución bajó 6 pts', style: 'warning' },
        { text: ' en el trimestre: la atribución laboral subió por encima del ingreso del cliente' },
        {
          type: 'citation',
          source: {
            id: 'finance-chunk-cost-attribution',
            label: '1',
            title: 'Modelo: Member Loaded Cost',
            headingPath: ['Costos', 'Atribución laboral'],
            excerpt:
              'El margen de contribución del cliente se erosiona cuando la atribución laboral cargada crece más rápido que el ingreso reconocido del período.',
            score: 0.9,
            freshness: 'current',
            href: '/finance/clients'
          }
        },
        { text: '.' }
      ],
      metaLabel: 'Diagnóstico · proof bajo demanda',
      points: [
        {
          title: 'Ingreso ≠ margen',
          body: 'El ingreso sube, pero el costo laboral cargado sube más: el margen de contribución se comprime.'
        },
        {
          title: 'Atribución, no volumen',
          body: 'La caída viene de cómo se asigna el costo laboral al cliente, no de menos actividad.'
        },
        {
          title: 'Decisión de renovación',
          body: 'Si esto sostiene una renovación o pricing, abrí la base y revisá el período exacto.'
        }
      ],
      chart: {
        title: 'Margen de contribución',
        helper: 'Synthetic · últimos 5 meses',
        valueSuffix: '%',
        modes: [
          { mode: 'trend', label: 'Tendencia', ariaLabel: 'Ver tendencia del margen de contribución' },
          { mode: 'comparison', label: 'Comparativo', ariaLabel: 'Ver comparativo de ingreso, costo y margen' },
          { mode: 'composition', label: 'Composición', ariaLabel: 'Ver composición del costo' }
        ],
        series: [
          { key: 'margin', label: 'Margen', tone: 'primary' },
          { key: 'revenue', label: 'Ingreso (índice)', compactLabel: 'Ingreso', tone: 'secondary' },
          { key: 'laborCost', label: 'Costo laboral (índice)', compactLabel: 'Costo', tone: 'success' }
        ],
        trend: [
          { label: 'Mar', margin: 34, revenue: 100, laborCost: 66 },
          { label: 'Abr', margin: 33, revenue: 104, laborCost: 70 },
          { label: 'May', margin: 31, revenue: 108, laborCost: 75 },
          { label: 'Jun', margin: 29, revenue: 110, laborCost: 78 },
          { label: 'Jul', margin: 28, revenue: 112, laborCost: 81 }
        ],
        composition: [
          { label: 'Costo laboral', value: 58, tone: 'success' },
          { label: 'Herramientas', value: 14, tone: 'secondary' },
          { label: 'Margen', value: 28, tone: 'primary' }
        ]
      }
    }
  ]
}

// ── Specimen B — Insight promovido (señal ICO promovida a respuesta) ─────────────────────────────

export const insightSurfaceContext: NexaAnswersSurfaceContext = {
  surfaceId: 'agency.nexa.answers',
  domain: 'agency',
  placement: 'inline',
  dataReality: 'synthetic',
  sensitivity: 'tenant_internal',
  allowedRenderers: ['answerBubble', 'compactAnswer'],
  allowedActions: ['read', 'explain', 'drillDown']
}

export const insightRenderPlan: NexaAnswersRenderPlan = {
  id: 'agency-insight-promoted-answer',
  version: 'nexa-answer-render-plan.v1',
  intent: 'summarize',
  autonomyTier: 'observeOnly',
  primaryBlockId: 'agency-insight-summary',
  trustCue: {
    tone: 'info',
    label: 'Promovido desde Nexa Insights',
    detail: 'Agency · synthetic · señal EO-AIS detectada en el sprint actual'
  },
  actions: [
    { label: 'Ver causa raíz', iconClassName: 'tabler-arrow-up-right', variant: 'outlined', tone: 'primary', id: 'agency-action-1', intent: 'drillDown', riskLevel: 'low' },
    { label: 'Explicar para un manager', iconClassName: 'tabler-message-plus', variant: 'outlined', tone: 'secondary', id: 'agency-action-2', intent: 'explain', riskLevel: 'low' }
  ],
  proof: {
    id: 'agency-insight-proof',
    label: 'Base',
    collapsedLabel: 'Ver base',
    expandedLabel: 'Ocultar base'
  },
  blocks: [
    {
      id: 'agency-insight-summary',
      renderer: 'answerBubble',
      rendererVersion: 'v1',
      kind: 'agencyMetricSummary',
      title: 'OTD del equipo cayó este sprint, pero la calidad se sostiene.',
      body: [
        { text: 'La entrega a tiempo bajó por reprogramaciones del cliente; el ' },
        { text: 'first-time-right se mantiene', style: 'positive' },
        { text: ', así que la caída no es de calidad sino de calendario.' }
      ],
      metaLabel: 'Insight promovido · EO-AIS-7c4f2a91 · señal detectada por Nexa',
      points: [],
      metricSummary: {
        title: 'Señales del sprint',
        helper: 'Synthetic · sprint actual',
        interpretation: 'La caída de OTD viene de reprogramaciones, no de retrabajo: FTR estable y RpA bajo.',
        metrics: [
          {
            id: 'otd',
            label: 'OTD',
            value: '68%',
            helper: 'Entrega a tiempo',
            deltaLabel: '−12 pts',
            deltaTone: 'warning',
            emphasis: true,
            trend: [
              { label: 'S1', value: 84 },
              { label: 'S2', value: 80 },
              { label: 'S3', value: 74 },
              { label: 'S4', value: 68 }
            ]
          },
          {
            id: 'ftr',
            label: 'FTR',
            value: '92%',
            helper: 'First-time-right',
            deltaLabel: '+1 pt',
            deltaTone: 'success',
            trend: [
              { label: 'S1', value: 90 },
              { label: 'S2', value: 91 },
              { label: 'S3', value: 91 },
              { label: 'S4', value: 92 }
            ]
          },
          {
            id: 'rpa',
            label: 'RpA',
            value: '0.4',
            helper: 'Rondas por aprobación',
            deltaLabel: '−0.1',
            deltaTone: 'success',
            trend: [
              { label: 'S1', value: 0.6 },
              { label: 'S2', value: 0.5 },
              { label: 'S3', value: 0.5 },
              { label: 'S4', value: 0.4 }
            ]
          }
        ]
      }
    }
  ]
}
