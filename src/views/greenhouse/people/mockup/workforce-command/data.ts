export type MockupTone = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

export type WorkforceStatus = 'active' | 'not_started' | 'offboarding' | 'inactive'

export type WorkerRegime =
  | 'cl_dependent'
  | 'honorarios'
  | 'contractor_payable'
  | 'deel_provider'
  | 'international_internal'

export type CoverageState = 'available' | 'missing' | 'warning' | 'redacted' | 'not_applicable'

export type ReadinessState = 'ready' | 'warning' | 'blocked' | 'intentional' | 'not_applicable'

export interface WorkforceReadinessSet {
  workforceProfile: ReadinessState
  payrollCalculation: ReadinessState
  paymentRail: ReadinessState
  documentsSignature: ReadinessState
  taxProviderReview: ReadinessState
}

export interface WorkforcePerson {
  id: string
  displayName: string
  initials: string
  role: string
  team: string
  manager: string
  country: string
  status: WorkforceStatus
  regime: WorkerRegime
  regimeLabel: string
  regimeDetail: string
  paymentRail: string
  compensationCoverage: CoverageState
  documents: CoverageState
  readiness: WorkforceReadinessSet
  confidence: 'high' | 'medium' | 'low'
  attentionCodes: string[]
  attentionLabel: string
  nextAction: string
  safeLinks: Array<{ label: string; href: string; icon: string }>
  sourceLineage: string[]
  notes: string
  sensitiveHint: string
}

export interface CommandMetric {
  id: string
  title: string
  value: string
  subtitle: string
  icon: string
  tone: MockupTone
  status: string
  statusTone: MockupTone
}

export interface ExceptionGroup {
  id: string
  title: string
  count: number
  owner: string
  tone: MockupTone
  icon: string
  description: string
  codes: string[]
}

export interface SavedView {
  id: string
  label: string
  description: string
  filter: 'all' | 'attention' | 'international' | 'contractors' | 'missing_comp' | 'payment_setup'
}

export const savedViews: SavedView[] = [
  {
    id: 'all',
    label: 'All workforce',
    description: 'Every non-demo person in the workforce lens.',
    filter: 'all'
  },
  {
    id: 'attention',
    label: 'Needs attention',
    description: 'Open gaps that need owner review.',
    filter: 'attention'
  },
  {
    id: 'international',
    label: 'International rails',
    description: 'Provider-managed and international internal rails.',
    filter: 'international'
  },
  {
    id: 'contractors',
    label: 'Contractors',
    description: 'Contractor payable and honorarios lanes.',
    filter: 'contractors'
  },
  {
    id: 'missing-comp',
    label: 'Missing comp',
    description: 'People without current compensation evidence.',
    filter: 'missing_comp'
  },
  {
    id: 'payment-setup',
    label: 'Payment setup',
    description: 'Payment rail readiness needs owner action.',
    filter: 'payment_setup'
  }
]

export const commandMetrics: CommandMetric[] = [
  {
    id: 'active',
    title: 'Active',
    value: '9',
    subtitle: 'Real active cohort',
    icon: 'tabler-users-group',
    tone: 'primary',
    status: '9/9 relationship coverage',
    statusTone: 'success'
  },
  {
    id: 'attention',
    title: 'Attention',
    value: '5',
    subtitle: 'Evidence or readiness gaps',
    icon: 'tabler-alert-triangle',
    tone: 'warning',
    status: 'No payroll errors',
    statusTone: 'warning'
  },
  {
    id: 'comp',
    title: 'Comp',
    value: '5/9',
    subtitle: 'Current compensation coverage',
    icon: 'tabler-cash-banknote',
    tone: 'success',
    status: 'Coverage signal',
    statusTone: 'secondary'
  },
  {
    id: 'rail',
    title: 'Rails',
    value: '8/9',
    subtitle: 'Evidence attached',
    icon: 'tabler-credit-card',
    tone: 'info',
    status: 'Read-only',
    statusTone: 'primary'
  },
  {
    id: 'readiness',
    title: 'Blockers',
    value: '3',
    subtitle: 'Actionable blockers',
    icon: 'tabler-shield-exclamation',
    tone: 'error',
    status: 'Owner review',
    statusTone: 'error'
  }
]

export const exceptionGroups: ExceptionGroup[] = [
  {
    id: 'missing-comp',
    title: 'Missing current compensation evidence',
    count: 4,
    owner: 'HR + Payroll',
    tone: 'warning',
    icon: 'tabler-cash-off',
    description: 'Coverage gap only. It does not prove underpayment or payroll error.',
    codes: ['compensation.missing_current_version']
  },
  {
    id: 'payment-setup',
    title: 'Payment rail setup',
    count: 1,
    owner: 'Finance',
    tone: 'info',
    icon: 'tabler-credit-card-off',
    description: 'Missing payment evidence or beneficiary route; no payment execution here.',
    codes: ['payment_rail.missing_evidence']
  },
  {
    id: 'documents',
    title: 'Documents/signature pending',
    count: 2,
    owner: 'People + Documents',
    tone: 'secondary',
    icon: 'tabler-file-alert',
    description: 'People shows evidence; EPIC-001 owns documents and signatures.',
    codes: ['documents.signature_pending']
  },
  {
    id: 'intentional',
    title: 'Intentional lifecycle states',
    count: 2,
    owner: 'People',
    tone: 'success',
    icon: 'tabler-calendar-check',
    description: 'Not-started/offboarding states are separated from operational errors.',
    codes: ['lifecycle.intentional_state']
  }
]

export const workforcePeople: WorkforcePerson[] = [
  {
    id: 'daniela-ferreira',
    displayName: 'Daniela Ferreira',
    initials: 'DF',
    role: 'Creative Operations Lead',
    team: 'Creative Operations',
    manager: 'Julio Reyes',
    country: 'Spain',
    status: 'active',
    regime: 'deel_provider',
    regimeLabel: 'EOR/Deel',
    regimeDetail: 'Provider-managed payroll',
    paymentRail: 'Deel payroll evidence',
    compensationCoverage: 'available',
    documents: 'available',
    readiness: {
      workforceProfile: 'ready',
      payrollCalculation: 'not_applicable',
      paymentRail: 'ready',
      documentsSignature: 'ready',
      taxProviderReview: 'warning'
    },
    confidence: 'high',
    attentionCodes: [],
    attentionLabel: 'Healthy',
    nextAction: 'Open Person 360 to inspect workforce history and operational metrics.',
    safeLinks: [
      { label: 'Person 360', href: '/people/mockup/daniela-workforce', icon: 'tabler-user-circle' },
      { label: 'Provider evidence', href: '#', icon: 'tabler-building-bank' }
    ],
    sourceLineage: ['Person 360', 'WorkforceFoundationMap', 'Compensation version v3', 'Deel evidence snapshot'],
    notes: 'Chile statutory payroll is not applicable for provider-managed payroll.',
    sensitiveHint: 'Compensation amount visible only for HR/Finance capability.'
  },
  {
    id: 'melkin-hernandez',
    displayName: 'Melkin Hernandez',
    initials: 'MH',
    role: 'Visual Designer',
    team: 'Design Delivery',
    manager: 'Daniela Ferreira',
    country: 'Nicaragua',
    status: 'active',
    regime: 'honorarios',
    regimeLabel: 'Honorarios',
    regimeDetail: 'SII retention lane',
    paymentRail: 'Pay as you go evidence',
    compensationCoverage: 'available',
    documents: 'available',
    readiness: {
      workforceProfile: 'ready',
      payrollCalculation: 'not_applicable',
      paymentRail: 'ready',
      documentsSignature: 'warning',
      taxProviderReview: 'warning'
    },
    confidence: 'high',
    attentionCodes: ['documents.signature_pending'],
    attentionLabel: 'Signature pending',
    nextAction: 'Review document signature evidence in the EPIC-001 document rail.',
    safeLinks: [
      { label: 'Person profile', href: '#', icon: 'tabler-user' },
      { label: 'Documents', href: '#', icon: 'tabler-file-certificate' }
    ],
    sourceLineage: ['Person profile', 'Contract relationship', 'Honorarios policy', 'Document registry'],
    notes: 'Honorarios is not dependent employment payroll and does not use Chile dependent deductions.',
    sensitiveHint: 'Provider/payment details remain redacted without Finance capability.'
  },
  {
    id: 'valentina-hoyos',
    displayName: 'Valentina Hoyos',
    initials: 'VH',
    role: 'Marketing Specialist',
    team: 'Growth Operations',
    manager: 'Julio Reyes',
    country: 'Chile',
    status: 'offboarding',
    regime: 'cl_dependent',
    regimeLabel: 'CL dependent',
    regimeDetail: 'Internal payroll',
    paymentRail: 'Internal payroll',
    compensationCoverage: 'available',
    documents: 'missing',
    readiness: {
      workforceProfile: 'warning',
      payrollCalculation: 'ready',
      paymentRail: 'ready',
      documentsSignature: 'blocked',
      taxProviderReview: 'ready'
    },
    confidence: 'medium',
    attentionCodes: ['documents.final_settlement_pending'],
    attentionLabel: 'Final settlement doc',
    nextAction: 'Open the offboarding/payroll settlement rail; do not calculate settlement from People.',
    safeLinks: [
      { label: 'Payroll rail', href: '#', icon: 'tabler-receipt' },
      { label: 'Offboarding', href: '#', icon: 'tabler-door-exit' }
    ],
    sourceLineage: ['WorkRelationship offboarding case', 'Payroll final settlement', 'Document registry'],
    notes: 'Finiquito applies only because this lane is Chile dependent internal payroll.',
    sensitiveHint: 'Settlement amount remains Payroll-owned and capability-gated.'
  },
  {
    id: 'andres-carlosama',
    displayName: 'Andres Carlosama',
    initials: 'AC',
    role: 'Motion Designer',
    team: 'Creative Operations',
    manager: 'Daniela Ferreira',
    country: 'Colombia',
    status: 'active',
    regime: 'contractor_payable',
    regimeLabel: 'Contractor',
    regimeDetail: 'Contractor payable',
    paymentRail: 'Contractor payable',
    compensationCoverage: 'missing',
    documents: 'warning',
    readiness: {
      workforceProfile: 'ready',
      payrollCalculation: 'not_applicable',
      paymentRail: 'warning',
      documentsSignature: 'warning',
      taxProviderReview: 'warning'
    },
    confidence: 'medium',
    attentionCodes: ['compensation.missing_current_version', 'payment_rail.review_required'],
    attentionLabel: 'Comp + rail review',
    nextAction: 'Classify missing compensation evidence before opening any payment or payable remediation.',
    safeLinks: [
      { label: 'Engagement', href: '#', icon: 'tabler-briefcase' },
      { label: 'Payables', href: '#', icon: 'tabler-file-dollar' }
    ],
    sourceLineage: ['Contractor engagement', 'WorkforceFoundationMap', 'Payment rail evidence'],
    notes: 'Contractor payables are not payroll entries and do not generate finiquito.',
    sensitiveHint: 'Agreed amount is hidden until Finance/HR capability is present.'
  },
  {
    id: 'felipe-zurita',
    displayName: 'Felipe Zurita',
    initials: 'FZ',
    role: 'Growth Analyst',
    team: 'Growth Operations',
    manager: 'Julio Reyes',
    country: 'Chile',
    status: 'active',
    regime: 'cl_dependent',
    regimeLabel: 'CL dependent',
    regimeDetail: 'Internal payroll',
    paymentRail: 'Internal payroll',
    compensationCoverage: 'missing',
    documents: 'available',
    readiness: {
      workforceProfile: 'ready',
      payrollCalculation: 'blocked',
      paymentRail: 'ready',
      documentsSignature: 'ready',
      taxProviderReview: 'ready'
    },
    confidence: 'medium',
    attentionCodes: ['compensation.missing_current_version'],
    attentionLabel: 'Missing comp evidence',
    nextAction: 'Resolve current compensation evidence before Payroll calculation readiness.',
    safeLinks: [
      { label: 'Person 360', href: '#', icon: 'tabler-user-circle' },
      { label: 'Payroll readiness', href: '#', icon: 'tabler-calculator' }
    ],
    sourceLineage: ['Person 360', 'Compensation versions', 'Payroll readiness'],
    notes: 'Missing compensation blocks payroll calculation readiness only after Payroll confirms the period impact.',
    sensitiveHint: 'No amount is inferred from missing evidence.'
  },
  {
    id: 'camila-rojas',
    displayName: 'Camila Rojas',
    initials: 'CR',
    role: 'Client Operations Coordinator',
    team: 'Client Operations',
    manager: 'Daniela Ferreira',
    country: 'Chile',
    status: 'not_started',
    regime: 'cl_dependent',
    regimeLabel: 'CL dependent',
    regimeDetail: 'Internal payroll candidate',
    paymentRail: 'Pending activation',
    compensationCoverage: 'missing',
    documents: 'missing',
    readiness: {
      workforceProfile: 'intentional',
      payrollCalculation: 'intentional',
      paymentRail: 'intentional',
      documentsSignature: 'warning',
      taxProviderReview: 'intentional'
    },
    confidence: 'low',
    attentionCodes: ['lifecycle.intentional_state', 'documents.signature_pending'],
    attentionLabel: 'Not started',
    nextAction: 'Keep in activation queue; do not treat as production payroll error.',
    safeLinks: [
      { label: 'Activation', href: '#', icon: 'tabler-progress' },
      { label: 'Documents', href: '#', icon: 'tabler-file-certificate' }
    ],
    sourceLineage: ['Workforce activation', 'Document registry', 'Intake readiness'],
    notes: 'Intentional lifecycle state. Readiness gaps are expected before start date.',
    sensitiveHint: 'No compensation amount should be shown until activation is complete.'
  }
]
