export type ReadinessTone = 'primary' | 'success' | 'warning' | 'error' | 'secondary'

export type ReadinessScope = 'real' | 'with-fixtures'

export type GapSeverity = 'info' | 'warning' | 'error'

export type GapDisposition =
  | 'source_data_debt'
  | 'intentional_lifecycle'
  | 'domain_follow_up'
  | 'fixture_excluded'
  | 'steady_state'

export interface CoverageMetric {
  id: string
  label: string
  value: number
  total: number
  caption: string
  trend: string
  tone: ReadinessTone
  source: string
}

export interface DispositionCard {
  id: GapDisposition
  label: string
  count: number
  owner: string
  severity: GapSeverity
  tone: ReadinessTone
  summary: string
  nextAction: string
  sourceCodes: string[]
  samples: GapSample[]
}

export interface GapSample {
  id: string
  person: string
  maskedRef: string
  rail: string
  state: string
  evidence: string
}

export interface RemediationStep {
  id: string
  task: string
  label: string
  owner: string
  status: 'ready' | 'blocked' | 'planned'
  reason: string
}

export const headerChips = [
  { label: '9 real active workers', status: 'success', icon: 'tabler-users-group' },
  { label: '0 error gaps', status: 'success', icon: 'tabler-shield-check' },
  { label: '4 source debt', status: 'warning', icon: 'tabler-database-exclamation' },
  { label: 'Payroll read-only', status: 'info', icon: 'tabler-lock' }
] as const

export const readinessAria = {
  toggleEvidenceDetails: 'Toggle evidence details',
  closeReadinessDetail: 'Close readiness detail'
} as const

export const baselineMetrics: CoverageMetric[] = [
  {
    id: 'relationship',
    label: 'Relationship coverage',
    value: 9,
    total: 9,
    caption: 'Active real workers mapped',
    trend: 'No relationship blockers',
    tone: 'success',
    source: 'WorkforceFoundationMap'
  },
  {
    id: 'classification',
    label: 'Classification parity',
    value: 9,
    total: 9,
    caption: 'Matches current work resolver',
    trend: 'TASK-957 parity intact',
    tone: 'success',
    source: 'CurrentWorkClassification'
  },
  {
    id: 'compensation',
    label: 'Current compensation',
    value: 5,
    total: 9,
    caption: 'Approved current version present',
    trend: '4 need source cleanup',
    tone: 'warning',
    source: 'compensation_versions'
  },
  {
    id: 'payment-rail',
    label: 'Payment rail evidence',
    value: 8,
    total: 9,
    caption: 'Payroll/provider/payable evidence',
    trend: '1 rail setup pending',
    tone: 'warning',
    source: 'Payroll + Contractor + Finance'
  },
  {
    id: 'errors',
    label: 'Error severity gaps',
    value: 0,
    total: 9,
    caption: 'No production error blockers',
    trend: 'Warnings only',
    tone: 'success',
    source: 'Gap taxonomy'
  }
]

export const dispositionCards: DispositionCard[] = [
  {
    id: 'source_data_debt',
    label: 'Source data debt',
    count: 4,
    owner: 'People + Payroll',
    severity: 'warning',
    tone: 'warning',
    summary: 'Current compensation evidence is missing or stale, but no payroll amount is recalculated here.',
    nextAction: 'Open compensation coverage remediation after TASK-962 confirms owners.',
    sourceCodes: ['compensation.missing_current_version', 'compensation.current_tuple_drift'],
    samples: [
      {
        id: 'melkin-comp',
        person: 'Melkin Hernandez',
        maskedRef: 'GH-MEM-00**',
        rail: 'Honorarios',
        state: 'Review',
        evidence: 'Pay-as-you-go rail exists; current compensation version needs owner confirmation.'
      },
      {
        id: 'camila-comp',
        person: 'Camila Rojas',
        maskedRef: 'GH-MEM-00**',
        rail: 'Internal payroll candidate',
        state: 'Missing',
        evidence: 'Assignment exists; compensation evidence not yet promoted to current profile.'
      }
    ]
  },
  {
    id: 'domain_follow_up',
    label: 'Domain follow-up',
    count: 2,
    owner: 'Finance + Documents',
    severity: 'warning',
    tone: 'warning',
    summary: 'Evidence exists in an owning rail, but the People read model needs a safer link or status mapping.',
    nextAction: 'Link follow-ups to EPIC-001 documents and Finance payment rail evidence.',
    sourceCodes: ['payment_rail.provider_evidence_incomplete', 'documents.signature_pending'],
    samples: [
      {
        id: 'andres-doc',
        person: 'Andres Carlosama',
        maskedRef: 'GH-MEM-00**',
        rail: 'Contractor payable',
        state: 'Docs review',
        evidence: 'Contractor payable exists; signed support should resolve through Document Vault.'
      },
      {
        id: 'felipe-doc',
        person: 'Felipe Zurita',
        maskedRef: 'GH-MEM-00**',
        rail: 'Internal payroll',
        state: 'Final settlement doc',
        evidence: 'Offboarding rail owns settlement evidence; People should show lineage only.'
      }
    ]
  },
  {
    id: 'intentional_lifecycle',
    label: 'Intentional lifecycle',
    count: 2,
    owner: 'People',
    severity: 'info',
    tone: 'primary',
    summary: 'Not-started or offboarding states are expected and should not be counted as production errors.',
    nextAction: 'Keep visible as lifecycle state; do not create remediation tasks unless the state misses owner/date evidence.',
    sourceCodes: ['lifecycle.not_started', 'lifecycle.offboarding_in_progress'],
    samples: [
      {
        id: 'valentina-start',
        person: 'Valentina Hoyos',
        maskedRef: 'GH-MEM-00**',
        rail: 'Chile dependent',
        state: 'Not started',
        evidence: 'Start date is future; readiness is intentionally pending.'
      },
      {
        id: 'felipe-offboarding',
        person: 'Felipe Zurita',
        maskedRef: 'GH-MEM-00**',
        rail: 'Chile dependent',
        state: 'Offboarding',
        evidence: 'Final settlement document is pending in the owning offboarding rail.'
      }
    ]
  },
  {
    id: 'fixture_excluded',
    label: 'Fixture excluded',
    count: 3,
    owner: 'Platform',
    severity: 'info',
    tone: 'secondary',
    summary: 'Demo/test residue is separated from the active real-worker cohort so operators do not chase false gaps.',
    nextAction: 'Keep out of production readiness counts; clean with platform data hygiene if it reappears.',
    sourceCodes: ['data.demo_or_fixture_tolerated_gap'],
    samples: [
      {
        id: 'demo-one',
        person: 'DEMO Workforce User',
        maskedRef: 'fixture:***',
        rail: 'Excluded',
        state: 'Ignored',
        evidence: 'Fixture marker detected; not counted in 9 active real workers.'
      }
    ]
  },
  {
    id: 'steady_state',
    label: 'Steady state',
    count: 0,
    owner: 'All rails',
    severity: 'info',
    tone: 'success',
    summary: 'Filtered view with zero unresolved blockers. Use this to validate empty-state language and calm operations.',
    nextAction: 'No action required.',
    sourceCodes: ['steady_state.no_open_gap'],
    samples: []
  }
]

export const remediationSteps: RemediationStep[] = [
  {
    id: 'task-962',
    task: 'TASK-962',
    label: 'Finalize coverage dispositions',
    owner: 'People + Payroll',
    status: 'ready',
    reason: 'This control room is the execution surface for that classification.'
  },
  {
    id: 'task-963',
    task: 'TASK-963',
    label: 'Feed command center row states',
    owner: 'People',
    status: 'planned',
    reason: 'Only after dispositions stop noisy false blockers.'
  },
  {
    id: 'task-964',
    task: 'TASK-964',
    label: 'Route document gaps to EPIC-001',
    owner: 'Documents',
    status: 'planned',
    reason: 'People consumes document evidence; it does not own signing.'
  },
  {
    id: 'task-967',
    task: 'TASK-967',
    label: 'Promote stable gaps to signals',
    owner: 'Reliability',
    status: 'blocked',
    reason: 'Signal keys wait for this taxonomy to stabilize.'
  }
]
