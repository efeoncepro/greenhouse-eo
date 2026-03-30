export type GovernanceSection =
  | 'gestion'
  | 'equipo'
  | 'finanzas'
  | 'ia'
  | 'administracion'
  | 'mi_ficha'
  | 'cliente'

export type GovernanceViewRegistryEntry = {
  viewCode: string
  section: GovernanceSection
  label: string
  description: string
  routePath: string
  routeGroup: string
}

export const GOVERNANCE_SECTIONS = [
  { key: 'gestion', label: 'Gestión', description: 'Superficies cross-space y contexto operativo institucional.' },
  { key: 'equipo', label: 'Equipo', description: 'Personas, nómina y operaciones de HR.' },
  { key: 'finanzas', label: 'Finanzas', description: 'Resumen financiero, ingresos, egresos y conciliación.' },
  { key: 'ia', label: 'IA', description: 'Gobernanza de herramientas, licencias y créditos.' },
  { key: 'administracion', label: 'Administración', description: 'Admin Center, Spaces, usuarios y gobierno del portal.' },
  { key: 'mi_ficha', label: 'Mi Ficha', description: 'Experiencia personal del colaborador interno.' },
  { key: 'cliente', label: 'Portal cliente', description: 'Pulse, proyectos, ciclos y settings del cliente.' }
] as const satisfies Array<{
  key: GovernanceSection
  label: string
  description: string
}>

export const VIEW_REGISTRY: GovernanceViewRegistryEntry[] = [
  {
    viewCode: 'gestion.agencia',
    section: 'gestion',
    label: 'Agencia',
    description: 'Workspace interno con command center institucional.',
    routePath: '/agency',
    routeGroup: 'internal'
  },
  {
    viewCode: 'gestion.organizaciones',
    section: 'gestion',
    label: 'Organizaciones',
    description: 'Estructura de cuentas, relaciones y ownership comercial.',
    routePath: '/agency/organizations',
    routeGroup: 'internal'
  },
  {
    viewCode: 'gestion.servicios',
    section: 'gestion',
    label: 'Servicios',
    description: 'Inventario de servicios contratados por space.',
    routePath: '/agency/services',
    routeGroup: 'internal'
  },
  {
    viewCode: 'equipo.personas',
    section: 'equipo',
    label: 'Personas',
    description: 'People directory y Person 360.',
    routePath: '/people',
    routeGroup: 'people'
  },
  {
    viewCode: 'equipo.nomina',
    section: 'equipo',
    label: 'Nómina',
    description: 'Compensación, cálculos y períodos oficiales.',
    routePath: '/hr/payroll',
    routeGroup: 'hr'
  },
  {
    viewCode: 'equipo.permisos',
    section: 'equipo',
    label: 'Permisos',
    description: 'Leave balances, solicitudes y saldos.',
    routePath: '/hr/leave',
    routeGroup: 'hr'
  },
  {
    viewCode: 'finanzas.resumen',
    section: 'finanzas',
    label: 'Resumen financiero',
    description: 'Dashboard financiero consolidado.',
    routePath: '/finance',
    routeGroup: 'finance'
  },
  {
    viewCode: 'finanzas.ingresos',
    section: 'finanzas',
    label: 'Ingresos',
    description: 'Facturación y cobros.',
    routePath: '/finance/income',
    routeGroup: 'finance'
  },
  {
    viewCode: 'finanzas.egresos',
    section: 'finanzas',
    label: 'Egresos',
    description: 'Pagos, costos y obligaciones.',
    routePath: '/finance/expenses',
    routeGroup: 'finance'
  },
  {
    viewCode: 'finanzas.conciliacion',
    section: 'finanzas',
    label: 'Conciliación',
    description: 'Conciliación bancaria y matching operativo.',
    routePath: '/finance/reconciliation',
    routeGroup: 'finance'
  },
  {
    viewCode: 'ia.herramientas',
    section: 'ia',
    label: 'Herramientas IA',
    description: 'Catálogo, licencias y wallets.',
    routePath: '/admin/ai-tools',
    routeGroup: 'ai_tooling'
  },
  {
    viewCode: 'administracion.admin_center',
    section: 'administracion',
    label: 'Admin Center',
    description: 'Gobernanza institucional del portal.',
    routePath: '/admin',
    routeGroup: 'admin'
  },
  {
    viewCode: 'administracion.spaces',
    section: 'administracion',
    label: 'Spaces',
    description: 'Gestión de tenants, capabilities y access posture.',
    routePath: '/admin/tenants',
    routeGroup: 'admin'
  },
  {
    viewCode: 'administracion.usuarios',
    section: 'administracion',
    label: 'Usuarios',
    description: 'Acceso, roles y scopes visibles.',
    routePath: '/admin/users',
    routeGroup: 'admin'
  },
  {
    viewCode: 'administracion.roles',
    section: 'administracion',
    label: 'Roles y permisos',
    description: 'Roles, route groups y gobierno de acceso.',
    routePath: '/admin/roles',
    routeGroup: 'admin'
  },
  {
    viewCode: 'administracion.vistas',
    section: 'administracion',
    label: 'Vistas y acceso',
    description: 'Gobernanza por vista del portal.',
    routePath: '/admin/views',
    routeGroup: 'admin'
  },
  {
    viewCode: 'administracion.ops_health',
    section: 'administracion',
    label: 'Ops Health',
    description: 'Outbox, proyecciones y freshness del serving.',
    routePath: '/admin/ops-health',
    routeGroup: 'admin'
  },
  {
    viewCode: 'mi_ficha.mi_perfil',
    section: 'mi_ficha',
    label: 'Mi Perfil',
    description: 'Perfil, identidad y datos personales.',
    routePath: '/my/profile',
    routeGroup: 'my'
  },
  {
    viewCode: 'mi_ficha.mi_nomina',
    section: 'mi_ficha',
    label: 'Mi Nómina',
    description: 'Liquidaciones y compensación personal.',
    routePath: '/my/payroll',
    routeGroup: 'my'
  },
  {
    viewCode: 'cliente.pulse',
    section: 'cliente',
    label: 'Pulse',
    description: 'Vista general del space cliente.',
    routePath: '/dashboard',
    routeGroup: 'client'
  },
  {
    viewCode: 'cliente.proyectos',
    section: 'cliente',
    label: 'Proyectos',
    description: 'Inventario activo de proyectos visibles.',
    routePath: '/proyectos',
    routeGroup: 'client'
  },
  {
    viewCode: 'cliente.ciclos',
    section: 'cliente',
    label: 'Ciclos',
    description: 'Seguimiento de sprints y producción.',
    routePath: '/sprints',
    routeGroup: 'client'
  },
  {
    viewCode: 'cliente.configuracion',
    section: 'cliente',
    label: 'Configuración',
    description: 'Perfil y preferencias del portal cliente.',
    routePath: '/settings',
    routeGroup: 'client'
  }
]
