import type { MetricTrendPoint, MetricTrendTone } from '@/components/greenhouse/primitives'

export type MyPerformanceTone = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary'

export type FocusSignal = {
  id: 'otd' | 'ftr' | 'flow'
  title: string
  value: string
  valueNumber: number
  valueFormat: 'percentage' | 'integer'
  valueSuffix?: string
  helper: string
  icon: string
  tone: MyPerformanceTone
}

export type KpiMetric = {
  id: string
  title: string
  value: string
  valueNumber: number
  valueFormat: 'percentage' | 'integer' | 'decimal'
  valueSuffix?: string
  target: string
  icon: string
  tone: MyPerformanceTone
  status: string
}

export type NexaInsight = {
  title: string
  body: string
  chip: string
  icon: string
  tone: MyPerformanceTone
  mentions: string[]
}

export type NexaHistoryItem = {
  date: string
  time: string
  body: string
  tone: MyPerformanceTone
}

export type ActivityChip = {
  label: string
  value: string
  icon: string
  tone: MyPerformanceTone
}

export type RadarMetric = {
  label: string
  value: number
}

export type CscEntry = {
  label: string
  count: number
  pct: string
  color: string
}

export const focusSignals: FocusSignal[] = [
  {
    id: 'otd',
    title: 'On-Time Delivery',
    value: '86%',
    valueNumber: 86,
    valueFormat: 'percentage',
    helper: 'Estás sobre la meta del período. Cuida los compromisos que vencen esta semana.',
    icon: 'tabler-circle-check',
    tone: 'success'
  },
  {
    id: 'ftr',
    title: 'First Time Right',
    value: '78%',
    valueNumber: 78,
    valueFormat: 'percentage',
    helper: 'Está 2 pts bajo la meta. Revisa criterios de aceptación antes de cerrar.',
    icon: 'tabler-award',
    tone: 'warning'
  },
  {
    id: 'flow',
    title: 'Throughput',
    value: '24 cierres',
    valueNumber: 24,
    valueFormat: 'integer',
    valueSuffix: ' cierres',
    helper: 'Buen ritmo de cierres. Despeja bloqueos antes de sumar nueva carga.',
    icon: 'tabler-hierarchy',
    tone: 'primary'
  }
]

export const nexaInsights: NexaInsight[] = [
  {
    title: 'On-Time Delivery sobre meta',
    body: 'OTD sigue sobre la meta del período. Mantén foco en los compromisos próximos a vencer.',
    chip: 'Sobre meta',
    icon: 'tabler-trending-up',
    tone: 'success',
    mentions: ['Odyssey', 'Equipo Diseño']
  },
  {
    title: 'First Time Right bajo objetivo',
    body: 'FTR está 2 pts bajo la meta. Revisa criterios de aceptación antes del cierre.',
    chip: 'Revisar',
    icon: 'tabler-alert-triangle',
    tone: 'warning',
    mentions: ['Proyecto Delta']
  },
  {
    title: 'Stuck Assets por resolver',
    body: 'Hay 3 activos sin movimiento reciente. Prioriza desbloqueos antes de sumar nueva carga.',
    chip: 'Priorizar',
    icon: 'tabler-info-circle',
    tone: 'info',
    mentions: ['Customer Service Center']
  }
]

export const nexaHistory: NexaHistoryItem[] = [
  { date: '30 may. 2026', time: '09:10', body: 'OTD% cerró sobre la meta semanal.', tone: 'success' },
  { date: '28 may. 2026', time: '16:40', body: 'FTR% quedó bajo el umbral de 80%.', tone: 'warning' },
  { date: '27 may. 2026', time: '11:15', body: 'Stuck Assets detectó 3 activos con más de 5 días sin movimiento.', tone: 'info' }
]

export const kpiMetrics: KpiMetric[] = [
  { id: 'rpa', title: 'RpA', value: '1.42', valueNumber: 1.42, valueFormat: 'decimal', target: 'Meta ≥ 1.20', icon: 'tabler-user-check', tone: 'success', status: 'Estable' },
  { id: 'otd', title: 'OTD%', value: '86%', valueNumber: 86, valueFormat: 'percentage', target: 'Meta ≥ 85%', icon: 'tabler-clock-check', tone: 'success', status: 'Sobre meta' },
  { id: 'ftr', title: 'FTR%', value: '78%', valueNumber: 78, valueFormat: 'percentage', target: 'Meta ≥ 80%', icon: 'tabler-target-arrow', tone: 'warning', status: 'Bajo meta' },
  { id: 'throughput', title: 'Throughput', value: '24', valueNumber: 24, valueFormat: 'integer', target: 'Meta ≥ 20', icon: 'tabler-chart-bar', tone: 'primary', status: 'Buen ritmo' },
  { id: 'cycle', title: 'Cycle Time', value: '4.3 días', valueNumber: 4.3, valueFormat: 'decimal', valueSuffix: ' días', target: 'Meta ≤ 5.0 días', icon: 'tabler-clock', tone: 'info', status: 'En rango' },
  { id: 'stuck', title: 'Stuck Assets', value: '3', valueNumber: 3, valueFormat: 'integer', target: 'Meta ≤ 5', icon: 'tabler-player-pause', tone: 'warning', status: 'Revisar' }
]

export const otdTrend: MetricTrendPoint[] = [
  { label: 'Ene', value: 68 },
  { label: 'Feb', value: 74 },
  { label: 'Mar', value: 81 },
  { label: 'Abr', value: 78 },
  { label: 'May', value: 86 },
  { label: 'Jun', value: 88 }
]

export const ftrTrend: MetricTrendPoint[] = [
  { label: 'Ene', value: 70 },
  { label: 'Feb', value: 76 },
  { label: 'Mar', value: 82 },
  { label: 'Abr', value: 73 },
  { label: 'May', value: 78 },
  { label: 'Jun', value: 79 }
]

export const trendTone: Record<'otd' | 'ftr', MetricTrendTone> = {
  otd: 'success',
  ftr: 'warning'
}

export const activityChips: ActivityChip[] = [
  { label: 'Cierres', value: '24', icon: 'tabler-circle-check', tone: 'success' },
  { label: 'Nuevos activos', value: '7', icon: 'tabler-plus', tone: 'primary' },
  { label: 'En proceso', value: '18', icon: 'tabler-clock', tone: 'warning' },
  { label: 'Stuck Assets', value: '3', icon: 'tabler-player-pause', tone: 'error' }
]

export const radarMetrics: RadarMetric[] = [
  { label: 'OTD', value: 86 },
  { label: 'FTR', value: 78 },
  { label: 'Throughput', value: 80 },
  { label: 'Execution', value: 75 },
  { label: 'Discipline', value: 82 }
]

export const cscEntries: CscEntry[] = [
  { label: 'Customer Service Center 1', count: 9, pct: '37.5%', color: '#0375DB' },
  { label: 'Customer Service Center 2', count: 6, pct: '25.0%', color: '#3691E3' },
  { label: 'Customer Service Center 3', count: 4, pct: '16.7%', color: '#8ABCF0' },
  { label: 'Customer Service Center 4', count: 3, pct: '12.5%', color: '#6EC207' },
  { label: 'Customer Service Center 5', count: 2, pct: '8.3%', color: '#FFB020' }
]
