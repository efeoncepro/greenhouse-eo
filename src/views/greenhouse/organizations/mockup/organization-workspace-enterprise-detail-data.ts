export type EnterpriseFacetKey =
  | 'identity'
  | 'spaces'
  | 'team'
  | 'economics'
  | 'delivery'
  | 'finance'
  | 'crm'
  | 'services'
  | 'staffAug'

export type EnterpriseTone = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary'

export interface EnterpriseFacet {
  key: EnterpriseFacetKey
  label: string
  labelEs: string
  icon: string
  count: string
  health: EnterpriseTone
  summary: string
  recency: string
  state: 'ready' | 'attention' | 'partial' | 'planned'
}

export interface EnterpriseMetric {
  label: string
  value: string
  helper: string
  icon: string
  tone: EnterpriseTone
  delta?: number
  invert?: boolean
}

export interface EnterpriseProjectRow {
  id: string
  name: string
  space: string
  phase: string
  otd: string
  ftr: string
  progress: number
  dueDate: string
  sponsor: string
  tone: EnterpriseTone
}

export interface EnterpriseInvoiceRow {
  id: string
  service: string
  issuedAt: string
  dueAt: string
  amount: string
  balance: string
  status: string
  tone: EnterpriseTone
}

export const workspaceFacets: EnterpriseFacet[] = [
  {
    key: 'identity',
    label: 'Identity',
    labelEs: 'Identidad',
    icon: 'tabler-user-square-rounded',
    count: '10',
    health: 'success',
    summary: 'Legal, brand and integration profile verified.',
    recency: 'May 14',
    state: 'ready'
  },
  {
    key: 'spaces',
    label: 'Spaces',
    labelEs: 'Espacios',
    icon: 'tabler-cube',
    count: '27',
    health: 'success',
    summary: 'Operational workspaces and Notion mappings.',
    recency: 'Today',
    state: 'ready'
  },
  {
    key: 'team',
    label: 'Team',
    labelEs: 'Equipo',
    icon: 'tabler-users',
    count: '216',
    health: 'success',
    summary: 'Internal roster, assignments and capacity anchors.',
    recency: '08:30',
    state: 'ready'
  },
  {
    key: 'economics',
    label: 'Economics',
    labelEs: 'Economía',
    icon: 'tabler-chart-histogram',
    count: '15',
    health: 'warning',
    summary: 'Margin, contribution and cost attribution summary.',
    recency: 'May 2026',
    state: 'attention'
  },
  {
    key: 'delivery',
    label: 'Delivery',
    labelEs: 'Entrega',
    icon: 'tabler-send',
    count: '18',
    health: 'primary',
    summary: 'Delivery quality, throughput and active projects.',
    recency: '08:45',
    state: 'ready'
  },
  {
    key: 'finance',
    label: 'Finance',
    labelEs: 'Finanzas',
    icon: 'tabler-report-money',
    count: '32',
    health: 'success',
    summary: 'Agency financial summary and finance-client bridge.',
    recency: '08:35',
    state: 'attention'
  },
  {
    key: 'crm',
    label: 'CRM',
    labelEs: 'CRM',
    icon: 'tabler-briefcase',
    count: '12',
    health: 'success',
    summary: 'HubSpot company, deals and commercial touchpoints.',
    recency: '08:20',
    state: 'partial'
  },
  {
    key: 'services',
    label: 'Services',
    labelEs: 'Servicios',
    icon: 'tabler-tool',
    count: '41',
    health: 'success',
    summary: 'Active service catalog and engagement coverage.',
    recency: 'May 10',
    state: 'partial'
  },
  {
    key: 'staffAug',
    label: 'Staff Aug.',
    labelEs: 'Staff Aug.',
    icon: 'tabler-user-check',
    count: '8',
    health: 'success',
    summary: 'External capacity, placements and contract coverage.',
    recency: 'May 13',
    state: 'planned'
  }
]

export const topMetrics: EnterpriseMetric[] = [
  { label: 'Revenue (LTM)', value: 'USD 1.24B', helper: '91% del plan', icon: 'tabler-coins', tone: 'secondary', delta: 8.2 },
  { label: 'Gross margin (LTM)', value: '18.7%', helper: 'objetivo 22%', icon: 'tabler-trending-up', tone: 'warning', delta: 1.5 },
  { label: 'FTE total', value: '3,842', helper: '312 disponibles', icon: 'tabler-users', tone: 'info', delta: 3.1 },
  { label: 'Spaces activos', value: '27', helper: '21 membresías core', icon: 'tabler-building', tone: 'primary' }
]

export const deliveryMetrics: EnterpriseMetric[] = [
  { label: 'OTD%', value: '92.1%', helper: 'Objetivo >= 90%', icon: 'tabler-clock-check', tone: 'success', delta: 4.3 },
  { label: 'FTR%', value: '87.4%', helper: 'Objetivo >= 85%', icon: 'tabler-target-arrow', tone: 'success', delta: 3.1 },
  { label: 'Throughput', value: '126', helper: 'pts/mes, objetivo 120', icon: 'tabler-rocket', tone: 'primary', delta: 6.8 },
  { label: 'RpA', value: '8,420', helper: 'USD por activo revisado', icon: 'tabler-route', tone: 'warning', delta: 12.3 }
]

export const financeMetrics: EnterpriseMetric[] = [
  { label: 'Ingreso YTD', value: 'USD 34.5M', helper: '96% del plan', icon: 'tabler-cash-banknote', tone: 'success', delta: 6.2 },
  { label: 'Saldo pendiente', value: 'USD 20.7M', helper: '48 facturas abiertas', icon: 'tabler-alert-circle', tone: 'error', delta: 7, invert: true },
  { label: 'Facturas emitidas', value: '62', helper: 'año comercial', icon: 'tabler-file-invoice', tone: 'info' },
  { label: 'DSO', value: '47 días', helper: 'objetivo 40', icon: 'tabler-calendar-dollar', tone: 'warning', delta: 7, invert: true }
]

export const projectRows: EnterpriseProjectRow[] = [
  { id: 'PRJ-2405', name: 'Migración Core Reservation', space: 'Core Systems', phase: 'Ejecución', otd: '95%', ftr: '90%', progress: 72, dueDate: '30 Jun 2026', sponsor: 'I. Arancibia', tone: 'success' },
  { id: 'PRJ-2407', name: 'Customer 360', space: 'Digital CX', phase: 'Ejecución', otd: '88%', ftr: '80%', progress: 58, dueDate: '15 Jul 2026', sponsor: 'M. Jiménez', tone: 'warning' },
  { id: 'SPR-2409', name: 'Mobile App · Sprint 15', space: 'Digital CX', phase: 'Ejecución', otd: '93%', ftr: '92%', progress: 65, dueDate: '10 Jun 2026', sponsor: 'P. Rojas', tone: 'success' },
  { id: 'PRJ-2410', name: 'Modernización Data Platform', space: 'Data & Analytics', phase: 'Planificación', otd: '—', ftr: '—', progress: 18, dueDate: '31 Aug 2026', sponsor: 'C. Vergara', tone: 'secondary' },
  { id: 'PRJ-2411', name: 'WMS Upgrade', space: 'Operations', phase: 'Ejecución', otd: '79%', ftr: '74%', progress: 43, dueDate: '05 Jul 2026', sponsor: 'R. Soto', tone: 'error' }
]

export const invoiceRows: EnterpriseInvoiceRow[] = [
  { id: 'INV-2026-0547', service: 'Digital Experience · Fase 2', issuedAt: 'May 12', dueAt: 'Jun 11', amount: 'USD 2.45M', balance: 'USD 2.45M', status: 'Pendiente', tone: 'warning' },
  { id: 'INV-2026-0521', service: 'Data Platform · Operación', issuedAt: 'May 02', dueAt: 'Jun 01', amount: 'USD 1.98M', balance: 'USD 1.98M', status: 'Pendiente', tone: 'warning' },
  { id: 'INV-2026-0488', service: 'Mobile App · Sprint 15', issuedAt: 'Apr 28', dueAt: 'May 28', amount: 'USD 1.32M', balance: 'USD 1.32M', status: 'Vencida', tone: 'error' },
  { id: 'INV-2026-0453', service: 'Cloud & Infra · Managed', issuedAt: 'Apr 15', dueAt: 'May 15', amount: 'USD 3.12M', balance: 'USD 1.84M', status: 'Parcial', tone: 'warning' },
  { id: 'INV-2026-0431', service: 'Analytics & Insights', issuedAt: 'Apr 05', dueAt: 'May 05', amount: 'USD 2.21M', balance: 'USD 0', status: 'Pagada', tone: 'success' }
]

export const pipelineData = [
  { month: 'Nov', committed: 82, delivered: 68 },
  { month: 'Dec', committed: 95, delivered: 76 },
  { month: 'Jan', committed: 104, delivered: 88 },
  { month: 'Feb', committed: 118, delivered: 97 },
  { month: 'Mar', committed: 129, delivered: 110 },
  { month: 'Apr', committed: 142, delivered: 126 }
]

export const distributionData = [
  { name: 'Cloud & Infra', value: 26, tone: 'primary' },
  { name: 'Data & Analytics', value: 18, tone: 'secondary' },
  { name: 'Digital Platforms', value: 16, tone: 'info' },
  { name: 'Applications', value: 14, tone: 'warning' },
  { name: 'Security', value: 10, tone: 'success' },
  { name: 'QA & Testing', value: 8, tone: 'error' },
  { name: 'Otros', value: 8, tone: 'secondary' }
]

export const readinessSteps = [
  { label: 'Legal entity verified', state: 'Completed', tone: 'success' as EnterpriseTone },
  { label: 'Financial profile established', state: 'Completed', tone: 'success' as EnterpriseTone },
  { label: 'Spaces mapped', state: 'Completed', tone: 'success' as EnterpriseTone },
  { label: 'Team baseline captured', state: 'Completed', tone: 'success' as EnterpriseTone },
  { label: 'CRM integrated', state: 'Completed', tone: 'success' as EnterpriseTone },
  { label: 'Contracts baseline', state: 'In progress', tone: 'primary' as EnterpriseTone },
  { label: 'Services catalog aligned', state: 'Pending', tone: 'secondary' as EnterpriseTone },
  { label: 'Delivery onboarding', state: 'Pending', tone: 'secondary' as EnterpriseTone },
  { label: 'Staff augmentation setup', state: 'Pending', tone: 'secondary' as EnterpriseTone }
]

export const accountSignals = [
  { title: 'Q1 invoice #INV-2456 paid', helper: 'USD 245,000 · Finanzas', date: 'May 14', icon: 'tabler-currency-dollar', tone: 'success' as EnterpriseTone },
  { title: 'New contract executed', helper: 'MSA-2025-04 · Legal', date: 'May 13', icon: 'tabler-file-check', tone: 'primary' as EnterpriseTone },
  { title: '12 new hires added', helper: 'Engineering & Operations', date: 'May 12', icon: 'tabler-users-plus', tone: 'secondary' as EnterpriseTone },
  { title: 'Service consumption increased', helper: 'Cloud & Data Platform +18%', date: 'May 12', icon: 'tabler-package', tone: 'warning' as EnterpriseTone }
]

export const blockers = [
  { title: 'Dependencia crítica', helper: 'Aprobación presupuesto Q3 2026 · Finanzas', tone: 'error' as EnterpriseTone },
  { title: 'Riesgo de capacidad', helper: 'Data & Analytics con capacidad proyectada > 90%', tone: 'warning' as EnterpriseTone }
]
