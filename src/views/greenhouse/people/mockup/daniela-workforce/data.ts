export type MockupTone = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

export interface WorkforceNavSection {
  id: string
  label: string
  icon: string
}

export interface WorkforceSnapshotItem {
  id: string
  title: string
  value: string
  subtitle: string
  icon: string
  iconColor: MockupTone
  statusLabel: string
  statusTone: MockupTone
  statusIcon: string
  tooltip: string
}

export interface WorkforceFact {
  label: string
  value: string
  meta?: string
  tone?: MockupTone
}

export interface WorkforceDocument {
  id: string
  name: string
  type: string
  owner: string
  status: string
  statusTone: MockupTone
  lastEvent: string
}

export interface WorkforceTimelineEvent {
  id: string
  date: string
  title: string
  description: string
  source: string
  tone: MockupTone
  icon: string
  detail: string
}

export interface WorkforceSignal {
  id: string
  title: string
  description: string
  statusLabel: string
  statusTone: MockupTone
  statusIcon: string
  code: string
  action: string
}

export interface OperationalMetric {
  id: string
  title: string
  value: string
  subtitle: string
  icon: string
  iconColor: MockupTone
  statusLabel: string
  statusTone: MockupTone
  statusIcon: string
  tooltip: string
}

export interface PreservedPeopleSurface {
  id: string
  currentTab: string
  futurePlacement: string
  mustKeep: string[]
  icon: string
  tone: MockupTone
}

export const danielaProfile = {
  name: 'Daniela Alejandra Ferreira Toro',
  shortName: 'Daniela Ferreira',
  initials: 'DF',
  avatarPath: '/images/greenhouse/team/EO_Avatar-Daniela.png',
  roleTitle: 'Creative Operations Lead',
  location: 'Barcelona, Spain',
  country: 'Spain',
  legalEntity: 'Efeonce Group SpA',
  publicEmail: 'dferreira@efeoncepro.com',
  workerId: 'ECG-006',
  startDate: 'Apr 1st 2024',
  manager: 'Julio Reyes',
  team: 'Creative Operations',
  readinessScore: 94,
  lastUpdated: 'May 31st 2026, 10:42',
  confidenceSummary: '6 verified sources · no blocking drift'
}

export const navSections: WorkforceNavSection[] = [
  { id: 'overview', label: 'Overview', icon: 'tabler-layout-dashboard' },
  { id: 'operations', label: 'ICO & operations', icon: 'tabler-activity-heartbeat' },
  { id: 'workforce', label: 'Workforce', icon: 'tabler-users-group' },
  { id: 'compensation', label: 'Compensation', icon: 'tabler-cash-banknote' },
  { id: 'documents', label: 'Documents', icon: 'tabler-file-certificate' },
  { id: 'payments', label: 'Payroll & payments', icon: 'tabler-credit-card' },
  { id: 'history', label: 'History', icon: 'tabler-history' },
  { id: 'compliance', label: 'Compliance', icon: 'tabler-shield-check' }
]

export const operationalMetrics: OperationalMetric[] = [
  {
    id: 'rpa',
    title: 'RpA promedio',
    value: '1.18',
    subtitle: 'Último período ICO · healthy',
    icon: 'tabler-eye-check',
    iconColor: 'success',
    statusLabel: 'Óptimo',
    statusTone: 'success',
    statusIcon: 'tabler-circle-check',
    tooltip: 'Métrica operacional ICO existente. El nuevo perfil no la reemplaza.'
  },
  {
    id: 'otd',
    title: 'OTD%',
    value: '92%',
    subtitle: 'Entrega a tiempo',
    icon: 'tabler-clock-check',
    iconColor: 'success',
    statusLabel: 'Óptimo',
    statusTone: 'success',
    statusIcon: 'tabler-circle-check',
    tooltip: 'Se conserva desde la vista Activity/ICO actual.'
  },
  {
    id: 'ftr',
    title: 'FTR%',
    value: '87%',
    subtitle: 'Primera entrega correcta',
    icon: 'tabler-thumb-up',
    iconColor: 'warning',
    statusLabel: 'Atención',
    statusTone: 'warning',
    statusIcon: 'tabler-alert-circle',
    tooltip: 'Indicador operativo, no laboral ni payroll.'
  },
  {
    id: 'throughput',
    title: 'Throughput',
    value: '41',
    subtitle: 'Assets completados',
    icon: 'tabler-bolt',
    iconColor: 'primary',
    statusLabel: 'Balanceado',
    statusTone: 'success',
    statusIcon: 'tabler-gauge',
    tooltip: 'Mantiene continuidad con el motor ICO.'
  },
  {
    id: 'cycle',
    title: 'Ciclo promedio',
    value: '3.6d',
    subtitle: 'Tiempo medio de ciclo',
    icon: 'tabler-hourglass',
    iconColor: 'info',
    statusLabel: 'Current',
    statusTone: 'primary',
    statusIcon: 'tabler-chart-dots',
    tooltip: 'La lectura temporal queda en la capa operacional.'
  },
  {
    id: 'stuck',
    title: 'Stuck assets',
    value: '2',
    subtitle: 'Activos con atención requerida',
    icon: 'tabler-alert-triangle',
    iconColor: 'warning',
    statusLabel: 'Watch',
    statusTone: 'warning',
    statusIcon: 'tabler-alert-triangle',
    tooltip: 'Señal operativa que debe seguir visible en Person 360.'
  }
]

export const operationalContext: WorkforceFact[] = [
  { label: 'Quality index', value: '91/100', meta: 'Derived ICO metric', tone: 'success' },
  { label: 'Dedication index', value: '86/100', meta: 'Derived ICO metric', tone: 'success' },
  { label: 'Utilization', value: '78%', meta: 'Capacity context', tone: 'primary' },
  { label: 'Capacity health', value: 'Balanced', meta: 'No overcommitment', tone: 'success' },
  { label: 'Active assignments', value: '3', meta: 'Agency workload', tone: 'info' },
  { label: 'Nexa insights', value: '4 active', meta: 'Operational guidance', tone: 'warning' }
]

export const nexaMockInsights = [
  {
    id: 'nexa-rpa-watch',
    signalType: 'recommendation',
    metricId: 'rpa',
    severity: 'medium',
    explanation: 'RpA is healthy overall, but two active review loops are trending above the expected range.',
    rootCauseNarrative: 'The spike is concentrated in high-context creative assets where client feedback arrived after internal review.',
    recommendedAction: 'Keep Daniela as reviewer, but move the late-feedback assets into a separate client-change lane before the next delivery checkpoint.'
  },
  {
    id: 'nexa-ftr-watch',
    signalType: 'root_cause',
    metricId: 'ftr_pct',
    severity: 'medium',
    explanation: 'FTR is below the team target for this period.',
    rootCauseNarrative: 'Most corrections come from brief ambiguity rather than execution quality.',
    recommendedAction: 'Ask Account to lock acceptance criteria before assigning similar assets.'
  }
]

export const preservedPeopleSurfaces: PreservedPeopleSurface[] = [
  {
    id: 'profile',
    currentTab: 'Perfil',
    futurePlacement: 'Identity + HR profile + workforce relationship',
    icon: 'tabler-user',
    tone: 'primary',
    mustKeep: [
      'HR consolidated profile',
      'legal profile readiness',
      'current work classification',
      'role/title governance',
      'lifecycle and access state'
    ]
  },
  {
    id: 'activity',
    currentTab: 'Actividad',
    futurePlacement: 'ICO & operations',
    icon: 'tabler-chart-dots',
    tone: 'success',
    mustKeep: [
      'Nexa Insights block',
      'period selector',
      'ICO KPIs',
      'task summary chips',
      'health radar',
      'CSC distribution',
      'pipeline velocity'
    ]
  },
  {
    id: 'memberships',
    currentTab: 'Organizaciones',
    futurePlacement: 'Assignments and org context',
    icon: 'tabler-building',
    tone: 'info',
    mustKeep: ['memberships', 'assignments', 'space/client context', 'edit membership workflow']
  },
  {
    id: 'economy',
    currentTab: 'Economía',
    futurePlacement: 'Compensation + cost + payroll history',
    icon: 'tabler-wallet',
    tone: 'warning',
    mustKeep: [
      'current compensation',
      'payroll history',
      'finance cost panel',
      'labor cost distribution',
      'recent payroll receipts'
    ]
  },
  {
    id: 'payment',
    currentTab: 'Pago',
    futurePlacement: 'Payment rail and beneficiary profiles',
    icon: 'tabler-id-badge',
    tone: 'secondary',
    mustKeep: ['payment profiles', 'currency rails', 'maker-checker state']
  },
  {
    id: 'ai-tools',
    currentTab: 'Herramientas',
    futurePlacement: 'Apps and AI tooling',
    icon: 'tabler-wand',
    tone: 'secondary',
    mustKeep: ['assigned AI licenses', 'attributed AI usage', 'license status']
  }
]

export const workforceSnapshot: WorkforceSnapshotItem[] = [
  {
    id: 'relationship',
    title: 'Relationship',
    value: 'International employee',
    subtitle: 'Active work relationship · Spain',
    icon: 'tabler-id-badge-2',
    iconColor: 'primary',
    statusLabel: 'Verified',
    statusTone: 'success',
    statusIcon: 'tabler-circle-check',
    tooltip: 'Resolved from Person, WorkRelationship and legal profile evidence.'
  },
  {
    id: 'assignment',
    title: 'Assignment',
    value: 'Creative Ops Lead',
    subtitle: 'Effective since Jan 1st 2026',
    icon: 'tabler-briefcase',
    iconColor: 'info',
    statusLabel: 'Current',
    statusTone: 'success',
    statusIcon: 'tabler-calendar-check',
    tooltip: 'Current assignment candidate after TASK-788 effective dating.'
  },
  {
    id: 'compensation',
    title: 'Compensation',
    value: 'EUR 4,850',
    subtitle: 'Monthly base · TTC EUR 63,050',
    icon: 'tabler-coins',
    iconColor: 'success',
    statusLabel: 'Versioned',
    statusTone: 'success',
    statusIcon: 'tabler-git-branch',
    tooltip: 'CompensationProfile read model with active version tuple.'
  },
  {
    id: 'payment',
    title: 'Payment rail',
    value: 'Deel payroll',
    subtitle: 'External payroll evidence attached',
    icon: 'tabler-building-bank',
    iconColor: 'warning',
    statusLabel: 'Ready',
    statusTone: 'success',
    statusIcon: 'tabler-link',
    tooltip: 'Read-only payment rail evidence. Payroll remains its own operational view.'
  }
]

export const relationshipFacts: WorkforceFact[] = [
  { label: 'Worker type', value: 'Employee', meta: 'International rail', tone: 'success' },
  { label: 'Country', value: 'Spain', meta: 'Declared + legal profile', tone: 'primary' },
  { label: 'Legal entity', value: 'Efeonce Group SpA', meta: 'Employer of record policy', tone: 'secondary' },
  { label: 'Manager', value: 'Julio Reyes', meta: 'Org chart source', tone: 'info' },
  { label: 'Team', value: 'Creative Operations', meta: 'Cost center aligned', tone: 'primary' },
  { label: 'Work email', value: 'dferreira@efeoncepro.com', meta: 'Microsoft linked', tone: 'success' }
]

export const compensationFacts: WorkforceFact[] = [
  { label: 'Base compensation', value: 'EUR 4,850.00', meta: 'Monthly' },
  { label: 'Total target compensation', value: 'EUR 63,050.00', meta: 'Annual' },
  { label: 'Variable component', value: 'EUR 4,850.00', meta: 'Target bonus' },
  { label: 'Effective date', value: 'Jan 1st 2026', meta: 'Version v3' },
  { label: 'Data source', value: 'CompensationProfile', meta: 'No tuple drift' },
  { label: 'Finance visibility', value: 'Redacted for viewers', meta: 'Role-gated' }
]

export const documents: WorkforceDocument[] = [
  {
    id: 'contract',
    name: 'International employment agreement',
    type: 'Contract',
    owner: 'HR',
    status: 'Signed',
    statusTone: 'success',
    lastEvent: 'Signed on Apr 1st 2024'
  },
  {
    id: 'role-addendum',
    name: 'Role and title addendum',
    type: 'Addendum',
    owner: 'People Ops',
    status: 'Signed',
    statusTone: 'success',
    lastEvent: 'Effective Jan 1st 2026'
  },
  {
    id: 'privacy',
    name: 'Remote work and data policy',
    type: 'Policy',
    owner: 'Compliance',
    status: 'Acknowledged',
    statusTone: 'success',
    lastEvent: 'Acknowledged May 12th 2026'
  },
  {
    id: 'payroll-evidence',
    name: 'External payroll evidence',
    type: 'Payroll support',
    owner: 'Finance',
    status: 'Needs renewal',
    statusTone: 'warning',
    lastEvent: 'Next renewal Jun 5th 2026'
  }
]

export const timeline: WorkforceTimelineEvent[] = [
  {
    id: 'joined',
    date: 'Apr 2024',
    title: 'Worker profile activated',
    description: 'Person, legal profile and active work relationship were linked.',
    source: 'Workforce activation',
    tone: 'success',
    icon: 'tabler-user-check',
    detail: 'The original activation case closed after contract signature and identity reconciliation.'
  },
  {
    id: 'role-change',
    date: 'Jan 2026',
    title: 'Role promoted to Creative Operations Lead',
    description: 'Assignment effective dating captured the title and reporting line change.',
    source: 'WorkAssignment',
    tone: 'primary',
    icon: 'tabler-briefcase',
    detail: 'The change is modeled as an assignment event, not as free text on the member row.'
  },
  {
    id: 'comp-version',
    date: 'Jan 2026',
    title: 'Compensation version v3 became current',
    description: 'Base compensation and TTC moved under the same effective version.',
    source: 'CompensationProfile',
    tone: 'success',
    icon: 'tabler-coins',
    detail: 'This removes tuple drift between contract type, pay regime and payment rail evidence.'
  },
  {
    id: 'docs',
    date: 'May 2026',
    title: 'Document rail reached coverage threshold',
    description: 'Contract, role addendum and policy acknowledgements are available from the document vault.',
    source: 'Document Vault',
    tone: 'info',
    icon: 'tabler-file-check',
    detail: 'People consumes document evidence from EPIC-001 instead of creating a local document store.'
  }
]

export const readinessSignals: WorkforceSignal[] = [
  {
    id: 'documents',
    title: 'Payroll evidence renewal',
    description: 'External payroll evidence is valid, but the next renewal checkpoint is approaching.',
    statusLabel: 'Warning',
    statusTone: 'warning',
    statusIcon: 'tabler-alert-triangle',
    code: 'documents.payroll_evidence_renewal_due',
    action: 'Request updated evidence from Finance before Jun 5th.'
  },
  {
    id: 'assignment',
    title: 'Assignment coverage',
    description: 'Current title, manager, org unit and effective date are present.',
    statusLabel: 'Ready',
    statusTone: 'success',
    statusIcon: 'tabler-circle-check',
    code: 'workforce.assignment.current_version_present',
    action: 'No action required.'
  },
  {
    id: 'payment',
    title: 'Payment rail evidence',
    description: 'The active rail is external payroll. Greenhouse stores evidence, not the external payroll run.',
    statusLabel: 'Ready',
    statusTone: 'success',
    statusIcon: 'tabler-link',
    code: 'payment_rail.external_payroll_evidence_present',
    action: 'Keep payroll operations in the Payroll view.'
  }
]

export const quickActions = [
  { id: 'edit-worker', label: 'Edit worker details', icon: 'tabler-pencil', tone: 'primary' as MockupTone },
  { id: 'schedule-change', label: 'Schedule workforce change', icon: 'tabler-calendar-plus', tone: 'info' as MockupTone },
  { id: 'request-doc', label: 'Request document', icon: 'tabler-file-plus', tone: 'warning' as MockupTone },
  { id: 'view-org', label: 'View org chart', icon: 'tabler-hierarchy-3', tone: 'secondary' as MockupTone }
]
