export type OrganizationLifecycle = 'active_client' | 'opportunity' | 'prospect' | 'inactive'
export type OrganizationStatus = 'active' | 'inactive' | 'churned'
export type OrganizationOnboarding = 'draft' | 'in_progress' | 'blocked' | 'complete' | null
export type OrganizationSource = 'hubspot' | 'manual' | 'wizard'
export type OrganizationRisk = 'none' | 'attention' | 'blocked'

export interface OrganizationEnterpriseMock {
  organizationId: string
  publicId: string
  name: string
  legalName?: string
  countryCode?: string
  countryLabel?: string
  lifecycle: OrganizationLifecycle
  status: OrganizationStatus
  onboarding: OrganizationOnboarding
  spaceCount: number
  peopleCount: number
  membershipCount: number
  industry?: string
  source: OrganizationSource
  lastActivityLabel: string
  risk: OrganizationRisk
  owner: string
  avatarTone: 'primary' | 'info' | 'success' | 'warning' | 'secondary' | 'error'
  initials: string
  readiness: Array<{
    label: string
    state: 'complete' | 'warning' | 'blocked' | 'empty'
  }>
  timeline: Array<{
    label: string
    detail: string
    tone: 'primary' | 'info' | 'success' | 'warning' | 'error' | 'secondary'
  }>
}

export type OrganizationWorkbenchFilter = 'all' | 'attention' | 'onboarding' | 'no_space' | 'no_people' | 'active'

export const organizationEnterpriseMockData: OrganizationEnterpriseMock[] = [
  {
    organizationId: 'org-berel',
    publicId: 'EO-ORG-0091',
    name: 'Grupo Berel',
    legalName: 'Berel Pinturas S.A. de C.V.',
    countryCode: 'MX',
    countryLabel: 'Mexico',
    lifecycle: 'active_client',
    status: 'active',
    onboarding: 'in_progress',
    spaceCount: 1,
    peopleCount: 6,
    membershipCount: 8,
    industry: 'Manufactura',
    source: 'wizard',
    lastActivityLabel: 'Preflight Notion verde hace 2 h',
    risk: 'attention',
    owner: 'Operaciones',
    avatarTone: 'primary',
    initials: 'GB',
    readiness: [
      { label: 'Cliente activo', state: 'complete' },
      { label: 'Space operativo', state: 'complete' },
      { label: 'Onboarding abierto', state: 'warning' },
      { label: 'Logo pendiente', state: 'empty' }
    ],
    timeline: [
      { label: 'Onboarding', detail: 'Checklist 7/9 completado', tone: 'warning' },
      { label: 'Notion', detail: '80 tareas fluyendo al portal', tone: 'success' },
      { label: 'Finanzas', detail: 'MXN persistido en perfil', tone: 'info' }
    ]
  },
  {
    organizationId: 'org-aguas',
    publicId: 'EO-ORG-0027',
    name: 'Aguas Andinas',
    countryCode: 'CL',
    countryLabel: 'Chile',
    lifecycle: 'active_client',
    status: 'active',
    onboarding: null,
    spaceCount: 1,
    peopleCount: 9,
    membershipCount: 11,
    industry: 'Utilities',
    source: 'hubspot',
    lastActivityLabel: 'Services sync hace 15 min',
    risk: 'none',
    owner: 'Account',
    avatarTone: 'info',
    initials: 'AA',
    readiness: [
      { label: 'Cliente activo', state: 'complete' },
      { label: 'Space operativo', state: 'complete' },
      { label: 'Equipo vinculado', state: 'complete' },
      { label: 'Brand asset', state: 'warning' }
    ],
    timeline: [
      { label: 'HubSpot', detail: '4 services materializados', tone: 'info' },
      { label: 'Equipo', detail: '9 perfiles asociados', tone: 'success' },
      { label: 'Delivery', detail: 'ICO listo para revisar', tone: 'primary' }
    ]
  },
  {
    organizationId: 'org-anam',
    publicId: 'EO-ORG-0002',
    name: 'ANAM',
    legalName: 'Asociacion Nacional Automotriz',
    countryCode: 'CL',
    countryLabel: 'Chile',
    lifecycle: 'active_client',
    status: 'active',
    onboarding: 'draft',
    spaceCount: 1,
    peopleCount: 7,
    membershipCount: 7,
    industry: 'Gremio',
    source: 'hubspot',
    lastActivityLabel: 'Deal closed-won creo caso draft',
    risk: 'attention',
    owner: 'Sistema',
    avatarTone: 'secondary',
    initials: 'AN',
    readiness: [
      { label: 'Caso draft', state: 'warning' },
      { label: 'Space heredado', state: 'complete' },
      { label: 'Contactos por revisar', state: 'warning' },
      { label: 'Notion no verificado', state: 'empty' }
    ],
    timeline: [
      { label: 'Lifecycle', detail: 'Caso draft esperando activacion', tone: 'warning' },
      { label: 'HubSpot', detail: 'Company vinculada', tone: 'info' },
      { label: 'Portal', detail: 'Invitaciones pendientes', tone: 'secondary' }
    ]
  },
  {
    organizationId: 'org-accountscout',
    publicId: 'EO-ORG-0078',
    name: 'AccountScout',
    countryCode: 'CL',
    countryLabel: 'Chile',
    lifecycle: 'opportunity',
    status: 'active',
    onboarding: 'blocked',
    spaceCount: 0,
    peopleCount: 0,
    membershipCount: 0,
    industry: 'SaaS',
    source: 'manual',
    lastActivityLabel: 'Bloqueado por falta de Space',
    risk: 'blocked',
    owner: 'Comercial',
    avatarTone: 'error',
    initials: 'AS',
    readiness: [
      { label: 'Sin Space', state: 'blocked' },
      { label: 'Sin personas', state: 'blocked' },
      { label: 'Onboarding bloqueado', state: 'blocked' },
      { label: 'Origen manual', state: 'warning' }
    ],
    timeline: [
      { label: 'Atencion', detail: 'No hay Space para operar', tone: 'error' },
      { label: 'Personas', detail: 'Sin contactos asociados', tone: 'error' },
      { label: 'Siguiente paso', detail: 'Crear alta desde wizard', tone: 'warning' }
    ]
  },
  {
    organizationId: 'org-agrospec',
    publicId: 'EO-ORG-0064',
    name: 'Agrospec',
    countryCode: 'CL',
    countryLabel: 'Chile',
    lifecycle: 'prospect',
    status: 'active',
    onboarding: null,
    spaceCount: 0,
    peopleCount: 2,
    membershipCount: 2,
    industry: 'Agroindustria',
    source: 'hubspot',
    lastActivityLabel: 'Prospecto sincronizado hace 1 dia',
    risk: 'attention',
    owner: 'Comercial',
    avatarTone: 'success',
    initials: 'AG',
    readiness: [
      { label: 'Prospecto', state: 'warning' },
      { label: 'Sin Space', state: 'warning' },
      { label: '2 contactos', state: 'complete' },
      { label: 'Sin onboarding', state: 'empty' }
    ],
    timeline: [
      { label: 'HubSpot', detail: 'Prospecto con contactos', tone: 'info' },
      { label: 'Cuenta', detail: 'Aun no clientizada', tone: 'warning' },
      { label: 'Brand', detail: 'Logo pendiente TASK-999', tone: 'secondary' }
    ]
  },
  {
    organizationId: 'org-apollo',
    publicId: 'EO-ORG-0088',
    name: 'Apollo',
    countryCode: 'US',
    countryLabel: 'Estados Unidos',
    lifecycle: 'inactive',
    status: 'inactive',
    onboarding: 'complete',
    spaceCount: 0,
    peopleCount: 0,
    membershipCount: 0,
    industry: 'Technology',
    source: 'hubspot',
    lastActivityLabel: 'Sin actividad reciente',
    risk: 'none',
    owner: 'Historico',
    avatarTone: 'secondary',
    initials: 'AP',
    readiness: [
      { label: 'Inactiva', state: 'empty' },
      { label: 'Sin Space activo', state: 'empty' },
      { label: 'Onboarding cerrado', state: 'complete' },
      { label: 'Sin equipo vigente', state: 'empty' }
    ],
    timeline: [
      { label: 'Estado', detail: 'Cuenta inactiva', tone: 'secondary' },
      { label: 'Historial', detail: 'Sin acciones pendientes', tone: 'success' },
      { label: 'Archivo', detail: 'Disponible como referencia', tone: 'secondary' }
    ]
  }
]

export const organizationFilterLabels: Record<OrganizationWorkbenchFilter, string> = {
  all: 'Todas',
  attention: 'Atencion',
  onboarding: 'Onboarding',
  no_space: 'Sin Space',
  no_people: 'Sin equipo',
  active: 'Activos'
}
