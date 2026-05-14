export type ReadinessStatus = 'ready' | 'blocked' | 'attention'

export type ActivationLane = {
  key: string
  label: string
  owner: string
  status: ReadinessStatus
  detail: string
}

export type ActivationMember = {
  id: string
  name: string
  email: string
  initials: string
  intakeStatus: 'pending_intake' | 'in_review' | 'ready_to_complete'
  relationshipType: 'employee' | 'contractor'
  country: string
  roleTitle: string
  source: string
  age: string
  readinessScore: number
  blockers: string[]
  nextAction: string
  lanes: ActivationLane[]
}

export const activationSummary = [
  {
    label: 'Personas por habilitar',
    value: '66',
    trend: '56 pending intake + 10 in review',
    icon: 'tabler-users-group',
    color: 'primary' as const
  },
  {
    label: 'Sin relación activa',
    value: '64',
    trend: 'Bloquea completar ficha',
    icon: 'tabler-briefcase-off',
    color: 'error' as const
  },
  {
    label: 'Sin compensación',
    value: '66',
    trend: 'Falta salario o tarifa',
    icon: 'tabler-cash-off',
    color: 'warning' as const
  },
  {
    label: 'Listos para completar',
    value: '7',
    trend: 'Sin blockers críticos',
    icon: 'tabler-circle-check',
    color: 'success' as const
  }
]

export const activationFilters = [
  { key: 'all', label: 'Todos', icon: 'tabler-list-check' },
  { key: 'ready', label: 'Listos', icon: 'tabler-circle-check' },
  { key: 'compensation', label: 'Sin compensación', icon: 'tabler-cash-off' },
  { key: 'hireDate', label: 'Sin ingreso', icon: 'tabler-calendar-off' },
  { key: 'legal', label: 'Sin relación legal', icon: 'tabler-file-alert' },
  { key: 'payment', label: 'Sin pago', icon: 'tabler-credit-card-off' },
  { key: 'contractor', label: 'Contractors', icon: 'tabler-user-dollar' }
]

const commonBlockedLanes: ActivationLane[] = [
  {
    key: 'identity',
    label: 'Identidad y acceso',
    owner: 'People Ops',
    status: 'ready',
    detail: 'Perfil PG creado; acceso Microsoft conectado.'
  },
  {
    key: 'relationship',
    label: 'Relación laboral',
    owner: 'HR Ops',
    status: 'blocked',
    detail: 'Falta tipo de contrato, fecha de ingreso o vínculo activo.'
  },
  {
    key: 'role',
    label: 'Cargo y organización',
    owner: 'People Ops',
    status: 'blocked',
    detail: 'Cargo vigente y unidad organizacional todavía no confirmados.'
  },
  {
    key: 'compensation',
    label: 'Compensación',
    owner: 'Finance',
    status: 'blocked',
    detail: 'No existe salario, moneda ni periodicidad aprobada.'
  },
  {
    key: 'payment',
    label: 'Perfil de pago',
    owner: 'Payroll',
    status: 'blocked',
    detail: 'Cuenta bancaria y método de pago pendientes de aprobación.'
  },
  {
    key: 'onboarding',
    label: 'Onboarding operativo',
    owner: 'Team Lead',
    status: 'attention',
    detail: 'Checklist sin dueño asignado para el primer día.'
  }
]

export const activationMembers: ActivationMember[] = [
  {
    id: 'maria-camila',
    name: 'Maria Camila Hoyos',
    email: 'mchoyos@efeoncepro.com',
    initials: 'MC',
    intakeStatus: 'pending_intake',
    relationshipType: 'employee',
    country: 'Chile',
    roleTitle: 'Sin cargo vigente',
    source: 'SCIM + Microsoft',
    age: '1 día',
    readinessScore: 28,
    blockers: ['Fecha de ingreso', 'Cargo vigente', 'Compensación', 'Relación legal', 'Perfil de pago'],
    nextAction: 'Completar datos laborales',
    lanes: commonBlockedLanes
  },
  {
    id: 'felipe-zurita',
    name: 'Felipe Zurita',
    email: 'fzurita@efeoncepro.com',
    initials: 'FZ',
    intakeStatus: 'pending_intake',
    relationshipType: 'employee',
    country: 'Chile',
    roleTitle: 'Operations Analyst',
    source: 'SCIM + HubSpot',
    age: '2 días',
    readinessScore: 36,
    blockers: ['Fecha de ingreso', 'Compensación', 'Relación legal', 'Perfil de pago'],
    nextAction: 'Definir vínculo y salario',
    lanes: commonBlockedLanes.map(lane =>
      lane.key === 'role'
        ? { ...lane, status: 'ready', detail: 'Cargo y unidad organizacional confirmados.' }
        : lane
    )
  },
  {
    id: 'valentina-rios',
    name: 'Valentina Rios',
    email: 'vrios@efeoncepro.com',
    initials: 'VR',
    intakeStatus: 'ready_to_complete',
    relationshipType: 'employee',
    country: 'Chile',
    roleTitle: 'People Operations Lead',
    source: 'Manual intake',
    age: '4 horas',
    readinessScore: 100,
    blockers: [],
    nextAction: 'Completar ficha',
    lanes: [
      { key: 'identity', label: 'Identidad y acceso', owner: 'People Ops', status: 'ready', detail: 'Perfil y accesos verificados.' },
      { key: 'relationship', label: 'Relación laboral', owner: 'HR Ops', status: 'ready', detail: 'Contrato indefinido activo desde 13/05/2026.' },
      { key: 'role', label: 'Cargo y organización', owner: 'People Ops', status: 'ready', detail: 'Cargo, manager y centro de costo confirmados.' },
      { key: 'compensation', label: 'Compensación', owner: 'Finance', status: 'ready', detail: 'Salario CLP mensual aprobado.' },
      { key: 'payment', label: 'Perfil de pago', owner: 'Payroll', status: 'ready', detail: 'Cuenta bancaria validada para nómina.' },
      { key: 'onboarding', label: 'Onboarding operativo', owner: 'Team Lead', status: 'ready', detail: 'Checklist asignado y listo para kickoff.' }
    ]
  },
  {
    id: 'andres-morales',
    name: 'Andres Morales',
    email: 'amorales@efeoncepro.com',
    initials: 'AM',
    intakeStatus: 'in_review',
    relationshipType: 'contractor',
    country: 'Colombia',
    roleTitle: 'Automation Consultant',
    source: 'HubSpot engagement',
    age: '5 días',
    readinessScore: 52,
    blockers: ['Engagement vigente', 'Tarifa aprobada', 'Perfil de pago'],
    nextAction: 'Resolver engagement contractor',
    lanes: [
      { key: 'identity', label: 'Identidad y acceso', owner: 'People Ops', status: 'ready', detail: 'Perfil colaborador conectado.' },
      { key: 'contractor', label: 'Engagement contractor', owner: 'Legal Ops', status: 'blocked', detail: 'Falta vigencia, scope y modalidad tributaria.' },
      { key: 'role', label: 'Cargo y organización', owner: 'People Ops', status: 'ready', detail: 'Rol operativo y sponsor asignados.' },
      { key: 'compensation', label: 'Tarifa', owner: 'Finance', status: 'blocked', detail: 'Tarifa mensual y moneda sin aprobación.' },
      { key: 'payment', label: 'Perfil de pago', owner: 'Finance', status: 'blocked', detail: 'Datos de pago internacional pendientes.' },
      { key: 'onboarding', label: 'Onboarding operativo', owner: 'Team Lead', status: 'attention', detail: 'Checklist técnico creado sin fecha de inicio.' }
    ]
  },
  {
    id: 'daniela-ferreira',
    name: 'Daniela Ferreira',
    email: 'dferreira@efeoncepro.com',
    initials: 'DF',
    intakeStatus: 'in_review',
    relationshipType: 'employee',
    country: 'Chile',
    roleTitle: 'Client Success Manager',
    source: 'Manual intake',
    age: '3 días',
    readinessScore: 74,
    blockers: ['Perfil de pago'],
    nextAction: 'Aprobar pago',
    lanes: [
      { key: 'identity', label: 'Identidad y acceso', owner: 'People Ops', status: 'ready', detail: 'Perfil y accesos principales listos.' },
      { key: 'relationship', label: 'Relación laboral', owner: 'HR Ops', status: 'ready', detail: 'Contrato activo con fecha de ingreso confirmada.' },
      { key: 'role', label: 'Cargo y organización', owner: 'People Ops', status: 'ready', detail: 'Cargo, manager y unidad confirmados.' },
      { key: 'compensation', label: 'Compensación', owner: 'Finance', status: 'ready', detail: 'Salario aprobado y vigente.' },
      { key: 'payment', label: 'Perfil de pago', owner: 'Payroll', status: 'blocked', detail: 'Cuenta bancaria pendiente de verificación.' },
      { key: 'onboarding', label: 'Onboarding operativo', owner: 'Team Lead', status: 'ready', detail: 'Checklist asignado.' }
    ]
  }
]
