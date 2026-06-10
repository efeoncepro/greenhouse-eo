// TASK-1075 — Mi Desempeño · editorial brief (concept A v2) — typed mock data.
// COLLABORATOR lens (NOT client/commercial): calidad → tu ritmo → tu foco.
// The ICO causal chain reframed for the person reading their OWN performance —
// never "revenue enabled / ganaste más" (that's the client pitch lens).
// Numbers are Daniela Ferreira (Sky) flavored from real BQ. Mockup data — not a contract.

export type BriefTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

export type RibbonMetric = {
  id: string
  code: string
  name: string
  value: string
  delta: string | null
  deltaGood: boolean | null
  series: number[]
  tone: BriefTone
}

export type CausalNode = {
  /** overline: the causal level in collaborator lens */
  stage: string
  headline: string
  detail: string
  /** optional metric figure for driver/effect nodes */
  figure?: string
  figureDelta?: string
  tone: BriefTone
  /** the focus/action node renders as the accent CTA-ish end of the chain */
  isFocus?: boolean
}

export const editorialBrief = {
  eyebrow: 'Brief de desempeño personal',
  member: 'Daniela Ferreira',
  space: 'Sky Airline',

  periods: [
    { key: 'closed', label: 'Mayo 2026', status: 'Mes cerrado' },
    { key: 'live', label: 'Junio', status: 'En curso' }
  ],

  // The verdict — the editorial hero. Captures the nuance: on-time, but FTR is the story.
  headline: 'Entregaste a tiempo, pero la calidad de primera entrega te jugó en contra.',
  subline: 'Mayo 2026 · mes cerrado · 74 piezas entregadas',

  score: { value: 78, max: 100, verdict: 'Buen mes, con un foco claro', tone: 'success' as BriefTone },

  // ICO causal chain — collaborator lens (driver → tu ritmo → tu foco). Ends in the action.
  causal: [
    {
      stage: 'Lo que controlas',
      headline: 'Calidad de primera entrega',
      detail: 'Más piezas volvieron con cambios del cliente.',
      figure: 'FTR% 44.6%',
      figureDelta: '−50.6 pts vs abril',
      tone: 'error'
    },
    {
      stage: 'Tu ritmo',
      headline: 'El retrabajo te suma rondas',
      detail: 'Cada vuelta de cambios alarga el cierre de tu pieza y te baja el throughput.',
      figure: 'Cycle 12.0d',
      figureDelta: 'rondas de cambio ↑',
      tone: 'warning'
    },
    {
      stage: 'Tu foco ahora',
      headline: 'Refuerza el brief antes de revisión',
      detail: 'Alinea el brief y la revisión interna antes de enviar al cliente, sobre todo en las piezas con más vueltas.',
      tone: 'info',
      isFocus: true
    }
  ] as CausalNode[],

  // The hero chart — the metric that IS the story this period.
  hero: {
    code: 'FTR%',
    name: 'Calidad de primera entrega',
    cadence: 'Mensual · Ene → May 2026',
    value: '44.6%',
    series: [
      { label: 'Ene', value: 99.2 },
      { label: 'Feb', value: 81.1 },
      { label: 'Mar', value: 82.3 },
      { label: 'Abr', value: 95.2 },
      { label: 'May', value: 44.6 }
    ],
    annotation: { atIndex: 4, label: '−50.6 pts' },
    target: 80,
    // HTML caption under the chart (NOT in-SVG — the AppRecharts 13px !important mangles SVG text).
    caption: {
      lead: 'El quiebre de mayo:',
      rest: '−50.6 pts vs abril — más piezas volvieron con cambios del cliente.'
    }
  },

  // Nexa insight — 2nd person, collaborator coaching (NOT commercial).
  nexa: {
    narrative:
      'Tu FTR% cayó a 44.6% este mes (−50.6 pts vs abril). Cerraste a tiempo, pero más piezas volvieron con cambios del cliente. Tu calidad de primera entrega es la palanca de mayo.',
    action: 'Refuerza el brief y la revisión interna antes de enviar al cliente.',
    lastAnalysis: '10 jun 2026, 09:45'
  },

  // The other metrics — flat scannable ribbon, secondary. NOT boxed cards.
  ribbon: [
    { id: 'otd', code: 'OTD%', name: 'A tiempo', value: '100%', delta: '+1.3 pts', deltaGood: true, series: [96, 92, 90, 99, 100], tone: 'success' },
    { id: 'rpa', code: 'RpA', name: 'Rondas/pieza', value: '1.0', delta: '−0.11', deltaGood: true, series: [1.0, 1.0, 1.18, 1.11, 1.0], tone: 'success' },
    { id: 'throughput', code: 'Throughput', name: 'Cierres', value: '74', delta: '+12', deltaGood: true, series: [126, 111, 96, 62, 74], tone: 'info' },
    { id: 'cycle', code: 'Cycle', name: 'Días/pieza', value: '12.0d', delta: '−0.8d', deltaGood: true, series: [14, 13.2, 12.8, 12.4, 12], tone: 'success' },
    { id: 'stuck', code: 'Stuck', name: 'Frenadas', value: '3', delta: '−2', deltaGood: true, series: [8, 6, 5, 5, 3], tone: 'warning' }
  ] as RibbonMetric[]
}
