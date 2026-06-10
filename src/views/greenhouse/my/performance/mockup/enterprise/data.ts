// TASK-1075 — Enterprise redesign mockup (concept A+C) — typed mock data.
// Numbers are Daniela Ferreira (Sky) flavored from real BQ (mayo cerrado vs junio en curso)
// so the storytelling reads true. Mockup data — NOT a runtime contract.

export type MockTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

export type MockKpi = {
  id: string
  /** metric code shown prominently, e.g. OTD% */
  code: string
  /** full readable name, gray beside code */
  name: string
  value: number | null
  format: 'percentage' | 'integer' | 'decimal'
  suffix?: string
  /** explicit target/benchmark — never a number without context */
  target: string
  /** month-over-month delta (already computed); null when no comparison */
  delta: number | null
  deltaUnit?: string
  /** sparkline oldest → newest */
  series: { label: string; value: number | null }[]
  tone: MockTone
  /** semaphore label (color + icon + label, never color-only) */
  statusLabel: string
  icon: string
  /** honest non-value state for the in-progress lane */
  pending?: boolean
  /** honest "—" reason (e.g. RpA suppressed = 0 corrections) */
  emptyReason?: string
}

export type MockMover = {
  label: string
  delta: number
  unit: string
  direction: 'up' | 'down'
  /** is the direction good? (FTR down = bad; OTD up = good) */
  good: boolean
}

export type MockLane = {
  key: 'closed' | 'live'
  periodLabel: string
  statusLabel: string
  statusTone: MockTone
  /** closed lane = composite score; live lane = elapsed progress instead */
  score: number | null
  scoreVerdict: string
  scoreTone: MockTone
  /** live lane only: month elapsed fraction 0..1 + label */
  elapsedPct?: number
  elapsedLabel?: string
  movers: MockMover[]
  kpis: MockKpi[]
}

export type MockCsc = { label: string; count: number; pct: number; toneKey: 'briefing' | 'production' | 'review' }

const closedSeries = (vals: number[], labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May']) =>
  vals.map((value, i) => ({ label: labels[i], value }))

export const enterpriseMock = {
  memberName: 'Daniela Ferreira',
  spaceName: 'Sky Airline',
  roleTitle: 'Content Lead',

  nexa: {
    severityLabel: 'Causa raíz',
    metric: 'FTR%',
    // 2nd-person (self-view, TASK-1073) — the operator reads about their own work
    narrative:
      'Tu FTR% cayó a 44.6% este mes cerrado (−50.6 pts vs abril). Estás cerrando a tiempo, pero más piezas vuelven con cambios del cliente: la calidad de primera entrega es tu palanca del período.',
    action:
      'Revisá tus piezas con más rondas de cambio y reforzá el brief antes de enviar a revisión interna.',
    lastAnalysis: '10 jun 2026, 09:45 a. m.'
  },

  lanes: [
    {
      key: 'closed',
      periodLabel: 'Mayo 2026',
      statusLabel: 'Cerrado',
      statusTone: 'success',
      score: 78,
      scoreVerdict: 'Buen cierre',
      scoreTone: 'success',
      movers: [
        { label: 'OTD%', delta: 1.3, unit: 'pts', direction: 'up', good: true },
        { label: 'FTR%', delta: 50.6, unit: 'pts', direction: 'down', good: false },
        { label: 'Throughput', delta: 12, unit: 'piezas', direction: 'up', good: true }
      ],
      kpis: [
        {
          id: 'otd', code: 'OTD%', name: 'On-Time Delivery', value: 100, format: 'percentage',
          target: 'Meta ≥ 85%', delta: 1.3, deltaUnit: 'pts',
          series: closedSeries([96, 92, 90, 99, 100]), tone: 'success',
          statusLabel: 'Óptimo', icon: 'tabler-clock-check'
        },
        {
          id: 'ftr', code: 'FTR%', name: 'First Time Right', value: 44.6, format: 'percentage',
          target: 'Meta ≥ 80%', delta: -50.6, deltaUnit: 'pts',
          series: closedSeries([99, 81, 82, 95, 45]), tone: 'error',
          statusLabel: 'Crítico', icon: 'tabler-target'
        },
        {
          id: 'rpa', code: 'RpA', name: 'Rondas por pieza', value: 1.0, format: 'decimal',
          target: 'Meta ≤ 1.20', delta: -0.11, deltaUnit: '',
          series: closedSeries([1.0, 1.0, 1.18, 1.11, 1.0]), tone: 'success',
          statusLabel: 'Óptimo', icon: 'tabler-eye-check'
        },
        {
          id: 'throughput', code: 'Throughput', name: 'Cierres', value: 74, format: 'integer',
          target: 'Cierres del mes', delta: 12, deltaUnit: '',
          series: closedSeries([126, 111, 96, 62, 74]), tone: 'info',
          statusLabel: 'Estable', icon: 'tabler-bolt'
        },
        {
          id: 'cycle', code: 'Cycle Time', name: 'Días por pieza', value: 12.0, format: 'decimal',
          suffix: 'd', target: 'SLO ≤ 14.2d', delta: -0.8, deltaUnit: 'd',
          series: closedSeries([14, 13.2, 12.8, 12.4, 12]), tone: 'success',
          statusLabel: 'Dentro de SLO', icon: 'tabler-hourglass'
        },
        {
          id: 'stuck', code: 'Stuck', name: 'Piezas frenadas', value: 3, format: 'integer',
          target: 'Objetivo 0', delta: -2, deltaUnit: '',
          series: closedSeries([8, 6, 5, 5, 3]), tone: 'warning',
          statusLabel: 'Atención', icon: 'tabler-alert-triangle'
        }
      ]
    },
    {
      key: 'live',
      periodLabel: 'Junio 2026',
      statusLabel: 'En curso',
      statusTone: 'info',
      score: null,
      scoreVerdict: 'Mes en curso',
      scoreTone: 'info',
      elapsedPct: 0.33,
      elapsedLabel: '10 de 30 días',
      movers: [],
      kpis: [
        {
          id: 'otd', code: 'OTD%', name: 'On-Time Delivery', value: 100, format: 'percentage',
          target: 'Meta ≥ 85%', delta: null,
          series: [{ label: 'D1', value: 100 }, { label: 'D5', value: 100 }, { label: 'D10', value: 100 }],
          tone: 'success', statusLabel: 'Al día', icon: 'tabler-clock-check'
        },
        {
          id: 'ftr', code: 'FTR%', name: 'First Time Right', value: 100, format: 'percentage',
          target: 'Meta ≥ 80%', delta: null,
          series: [{ label: 'D1', value: 100 }, { label: 'D5', value: 100 }, { label: 'D10', value: 100 }],
          tone: 'success', statusLabel: 'Al día', icon: 'tabler-target'
        },
        {
          id: 'rpa', code: 'RpA', name: 'Rondas por pieza', value: null, format: 'decimal',
          target: 'Meta ≤ 1.20', delta: null, series: [],
          tone: 'neutral', statusLabel: 'Sin correcciones', icon: 'tabler-eye-check',
          emptyReason: 'Las piezas cerradas se aprobaron sin rondas de corrección'
        },
        {
          id: 'throughput', code: 'Throughput', name: 'Cierres', value: 1, format: 'integer',
          target: 'Cierres del mes', delta: null,
          series: [{ label: 'D1', value: 0 }, { label: 'D5', value: 1 }, { label: 'D10', value: 1 }],
          tone: 'info', statusLabel: 'Arrancando', icon: 'tabler-bolt'
        },
        {
          id: 'cycle', code: 'Cycle Time', name: 'Días por pieza', value: null, format: 'decimal',
          suffix: 'd', target: 'SLO ≤ 14.2d', delta: null, series: [],
          tone: 'neutral', statusLabel: 'Pendiente', icon: 'tabler-hourglass', pending: true,
          emptyReason: 'Aún sin cierres suficientes este mes'
        },
        {
          id: 'stuck', code: 'Stuck', name: 'Piezas frenadas', value: 9, format: 'integer',
          target: 'Objetivo 0', delta: null,
          series: [{ label: 'D1', value: 7 }, { label: 'D5', value: 8 }, { label: 'D10', value: 9 }],
          tone: 'warning', statusLabel: 'Atención', icon: 'tabler-alert-triangle'
        }
      ]
    }
  ] as MockLane[],

  csc: [
    { label: 'Briefing', count: 5, pct: 29, toneKey: 'briefing' },
    { label: 'Producción', count: 1, pct: 6, toneKey: 'production' },
    { label: 'Revisión interna', count: 11, pct: 65, toneKey: 'review' }
  ] as MockCsc[],
  cscTotal: 17,
  cscInsight: '65% de tus cierres pasan por revisión interna — ahí está tu cuello de botella.'
}
