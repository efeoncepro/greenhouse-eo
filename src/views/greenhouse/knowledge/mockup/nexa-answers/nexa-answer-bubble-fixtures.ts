import type {
  NexaAnswerAction,
  NexaAnswerChartSpec,
  NexaAnswerPoint,
  NexaAnswerTrustCue
} from '@/components/greenhouse/primitives'

export const answerPoints: NexaAnswerPoint[] = [
  {
    title: 'Resultado antes que actividad',
    body: 'Lee primero qué cambió para cliente, equipo u operación; después mira la actividad que lo produjo.'
  },
  {
    title: 'Se interpreta en conjunto',
    body: 'Contrasta Impacto con Colaboración y Orientación al Cliente para evitar una lectura aislada.'
  },
  {
    title: 'Validación si decide algo sensible',
    body: 'Si la respuesta se usa para calibración, abre la base y revisa freshness, citas y gaps.'
  }
]

export const trustCue: NexaAnswerTrustCue = {
  tone: 'success',
  label: 'Basado en 3 fuentes actuales',
  detail: 'Knowledge · confianza alta · 0 filtradas por política'
}

export const answerActions: NexaAnswerAction[] = [
  { label: 'Abrir guía', iconClassName: 'tabler-book', variant: 'outlined', tone: 'primary' },
  { label: 'Convertir en explicación', iconClassName: 'tabler-message-plus', variant: 'outlined', tone: 'secondary' },
  { label: 'Señalar gap', iconClassName: 'tabler-flag', variant: 'text', tone: 'secondary' }
]

export const icoChartSpec: NexaAnswerChartSpec = {
  title: 'Señales ICO',
  helper: 'Último corte · Agosto',
  valueSuffix: 'pts',
  modes: [
    { mode: 'trend', label: 'Tendencia', ariaLabel: 'Ver tendencia de señales ICO' },
    { mode: 'comparison', label: 'Comparativo', ariaLabel: 'Ver comparativo de señales ICO' },
    { mode: 'composition', label: 'Composición', ariaLabel: 'Ver composición de señales ICO' }
  ],
  series: [
    { key: 'impact', label: 'Impacto', tone: 'primary' },
    { key: 'collaboration', label: 'Colaboración', compactLabel: 'Colab.', tone: 'secondary' },
    { key: 'customerOrientation', label: 'Orientación', compactLabel: 'Cliente', tone: 'success' }
  ],
  trend: [
    { label: 'Abr', impact: 61, collaboration: 68, customerOrientation: 64 },
    { label: 'May', impact: 66, collaboration: 70, customerOrientation: 67 },
    { label: 'Jun', impact: 72, collaboration: 73, customerOrientation: 71 },
    { label: 'Jul', impact: 75, collaboration: 76, customerOrientation: 74 },
    { label: 'Ago', impact: 81, collaboration: 78, customerOrientation: 77 }
  ],
  composition: [
    { label: 'Impacto', value: 43, tone: 'primary' },
    { label: 'Colaboración', value: 31, tone: 'secondary' },
    { label: 'Orientación', value: 26, tone: 'success' }
  ]
}
