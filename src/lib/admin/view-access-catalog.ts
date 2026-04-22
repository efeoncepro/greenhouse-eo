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
    viewCode: 'gestion.staff_augmentation',
    section: 'gestion',
    label: 'Staff Augmentation',
    description: 'Placements comerciales, onboarding y economics sobre assignments canónicos.',
    routePath: '/agency/staff-augmentation',
    routeGroup: 'internal'
  },
  {
    viewCode: 'gestion.spaces',
    section: 'gestion',
    label: 'Spaces',
    description: 'Spaces activos, postura operativa y salud cross-space.',
    routePath: '/agency/spaces',
    routeGroup: 'internal'
  },
  {
    viewCode: 'gestion.economia',
    section: 'gestion',
    label: 'Economía',
    description: 'Rentabilidad, P&L y lectura económica institucional.',
    routePath: '/agency/economics',
    routeGroup: 'internal'
  },
  {
    viewCode: 'gestion.equipo',
    section: 'gestion',
    label: 'Equipo de agencia',
    description: 'Capacidad, dedicación y staffing del equipo Efeonce.',
    routePath: '/agency/team',
    routeGroup: 'internal'
  },
  {
    viewCode: 'gestion.delivery',
    section: 'gestion',
    label: 'Delivery',
    description: 'Seguimiento operativo de producción, ICO y entrega.',
    routePath: '/agency/delivery',
    routeGroup: 'internal'
  },
  {
    viewCode: 'gestion.campanas',
    section: 'gestion',
    label: 'Campañas',
    description: 'Vista cross-space de campañas e iniciativas activas.',
    routePath: '/agency/campaigns',
    routeGroup: 'internal'
  },
  {
    viewCode: 'gestion.operaciones',
    section: 'gestion',
    label: 'Operaciones',
    description: 'Observabilidad operativa, colas y postura del platform interno.',
    routePath: '/agency/operations',
    routeGroup: 'internal'
  },
  {
    viewCode: 'gestion.capacidad',
    section: 'gestion',
    label: 'Capacidad',
    description: 'Carga operativa global y disponibilidad del equipo.',
    routePath: '/agency/capacity',
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
    viewCode: 'equipo.jerarquia',
    section: 'equipo',
    label: 'Jerarquía',
    description: 'Supervisoría, delegaciones y auditoría de cambios del equipo.',
    routePath: '/hr/hierarchy',
    routeGroup: 'hr'
  },
  {
    viewCode: 'equipo.organigrama',
    section: 'equipo',
    label: 'Organigrama',
    description: 'Explorador visual de la jerarquía canónica del equipo.',
    routePath: '/hr/org-chart',
    routeGroup: 'hr'
  },
  {
    viewCode: 'equipo.departamentos',
    section: 'equipo',
    label: 'Departamentos',
    description: 'Estructura organizacional y taxonomía interna del equipo.',
    routePath: '/hr/departments',
    routeGroup: 'hr'
  },
  {
    viewCode: 'equipo.asistencia',
    section: 'equipo',
    label: 'Asistencia',
    description: 'Registros de asistencia y señales operativas del equipo.',
    routePath: '/hr/attendance',
    routeGroup: 'hr'
  },
  {
    viewCode: 'equipo.objetivos',
    section: 'equipo',
    label: 'Objetivos',
    description: 'Ciclos de objetivos y OKRs, seguimiento de progreso por colaborador y departamento.',
    routePath: '/hr/goals',
    routeGroup: 'hr'
  },
  {
    viewCode: 'equipo.evaluaciones',
    section: 'equipo',
    label: 'Evaluaciones',
    description: 'Ciclos de evaluacion de desempeno, asignaciones y calibracion.',
    routePath: '/hr/evaluations',
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
    label: 'Ventas',
    description: 'Documentos de venta, devengo y cobros.',
    routePath: '/finance/income',
    routeGroup: 'finance'
  },
  {
    viewCode: 'finanzas.egresos',
    section: 'finanzas',
    label: 'Compras',
    description: 'Documentos de compra, obligaciones y pagos.',
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
    viewCode: 'finanzas.banco',
    section: 'finanzas',
    label: 'Banco',
    description: 'Tesorería por instrumento, transferencias internas y saldos conciliables por cuenta.',
    routePath: '/finance/bank',
    routeGroup: 'finance'
  },
  {
    viewCode: 'finanzas.cuenta_corriente_accionista',
    section: 'finanzas',
    label: 'Cuenta corriente accionista',
    description: 'Posición bilateral entre empresa y accionistas con trazabilidad de movimientos.',
    routePath: '/finance/shareholder-account',
    routeGroup: 'finance'
  },
  {
    viewCode: 'finanzas.clientes',
    section: 'finanzas',
    label: 'Clientes',
    description: 'Maestro de clientes, coberturas y contexto comercial financiero.',
    routePath: '/finance/clients',
    routeGroup: 'finance'
  },
  {
    viewCode: 'finanzas.proveedores',
    section: 'finanzas',
    label: 'Proveedores',
    description: 'Directorio de suppliers y contrapartes de gasto.',
    routePath: '/finance/suppliers',
    routeGroup: 'finance'
  },
  {
    viewCode: 'finanzas.inteligencia',
    section: 'finanzas',
    label: 'Inteligencia financiera',
    description: 'Economics, tendencias y lectura ejecutiva del negocio.',
    routePath: '/finance/intelligence',
    routeGroup: 'finance'
  },
  {
    viewCode: 'finanzas.asignaciones_costos',
    section: 'finanzas',
    label: 'Asignaciones de costos',
    description: 'Reparto de costos y lógica de imputación financiera.',
    routePath: '/finance/cost-allocations',
    routeGroup: 'finance'
  },
  {
    viewCode: 'finanzas.cotizaciones',
    section: 'finanzas',
    label: 'Cotizaciones',
    description: 'Cotizaciones emitidas y seguimiento.',
    routePath: '/finance/quotes',
    routeGroup: 'finance'
  },
  {
    viewCode: 'finanzas.ordenes_compra',
    section: 'finanzas',
    label: 'Órdenes de compra',
    description: 'OC de clientes, saldos y consumo.',
    routePath: '/finance/purchase-orders',
    routeGroup: 'finance'
  },
  {
    viewCode: 'finanzas.hes',
    section: 'finanzas',
    label: 'HES',
    description: 'Hojas de entrada de servicio.',
    routePath: '/finance/hes',
    routeGroup: 'finance'
  },
  {
    viewCode: 'equipo.nomina_proyectada',
    section: 'equipo',
    label: 'Nómina proyectada',
    description: 'Simulación y previsión de compensaciones.',
    routePath: '/hr/payroll/projected',
    routeGroup: 'hr'
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
    viewCode: 'administracion.cuentas',
    section: 'administracion',
    label: 'Cuentas',
    description: 'Organizaciones, spaces y gobierno de identidad.',
    routePath: '/admin/accounts',
    routeGroup: 'admin'
  },
  {
    viewCode: 'administracion.commercial_parties',
    section: 'administracion',
    label: 'Commercial Parties',
    description: 'Embudo, adopción HubSpot, conflictos de sync y drill-down del party lifecycle.',
    routePath: '/admin/commercial/parties',
    routeGroup: 'admin'
  },
  {
    viewCode: 'administracion.product_sync_conflicts',
    section: 'administracion',
    label: 'Product Sync Conflicts',
    description: 'Drift del catálogo comercial, auto-heal y resolución operativa de conflictos con HubSpot Products.',
    routePath: '/admin/commercial/product-sync-conflicts',
    routeGroup: 'admin'
  },
  {
    viewCode: 'administracion.instrumentos_pago',
    section: 'administracion',
    label: 'Instrumentos de pago',
    description: 'Cuentas bancarias, tarjetas, fintech y medios de pago.',
    routePath: '/admin/payment-instruments',
    routeGroup: 'finance'
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
    viewCode: 'administracion.cloud_integrations',
    section: 'administracion',
    label: 'Cloud & Integrations',
    description: 'Estado operativo de cloud, observability e integraciones críticas.',
    routePath: '/admin/integrations',
    routeGroup: 'admin'
  },
  {
    viewCode: 'administracion.email_delivery',
    section: 'administracion',
    label: 'Email delivery',
    description: 'Entregabilidad, retries y salud del carril de correo.',
    routePath: '/admin/email-delivery',
    routeGroup: 'admin'
  },
  {
    viewCode: 'administracion.notifications',
    section: 'administracion',
    label: 'Notificaciones',
    description: 'Postura y overview del sistema de notificaciones del portal.',
    routePath: '/admin/notifications',
    routeGroup: 'admin'
  },
  {
    viewCode: 'administracion.calendario_operativo',
    section: 'administracion',
    label: 'Calendario operativo',
    description: 'Calendario institucional y ritmo operativo de payroll.',
    routePath: '/admin/operational-calendar',
    routeGroup: 'admin'
  },
  {
    viewCode: 'administracion.equipo',
    section: 'administracion',
    label: 'Equipo admin',
    description: 'Vista operativa del equipo interno desde Admin Center.',
    routePath: '/admin/team',
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
    viewCode: 'mi_ficha.mi_inicio',
    section: 'mi_ficha',
    label: 'Mi Greenhouse',
    description: 'Resumen personal de trabajo, foco y actividad.',
    routePath: '/my',
    routeGroup: 'my'
  },
  {
    viewCode: 'mi_ficha.mis_asignaciones',
    section: 'mi_ficha',
    label: 'Mis asignaciones',
    description: 'Clientes, FTE y capacidad asignada a la persona.',
    routePath: '/my/assignments',
    routeGroup: 'my'
  },
  {
    viewCode: 'mi_ficha.mi_desempeno',
    section: 'mi_ficha',
    label: 'Mi desempeño',
    description: 'Métricas personales, ICO y lectura de rendimiento.',
    routePath: '/my/performance',
    routeGroup: 'my'
  },
  {
    viewCode: 'mi_ficha.mi_delivery',
    section: 'mi_ficha',
    label: 'Mi delivery',
    description: 'Tareas, proyectos y foco operativo personal.',
    routePath: '/my/delivery',
    routeGroup: 'my'
  },
  {
    viewCode: 'mi_ficha.mis_permisos',
    section: 'mi_ficha',
    label: 'Mis permisos',
    description: 'Saldos, solicitudes y visibilidad de permisos personales.',
    routePath: '/my/leave',
    routeGroup: 'my'
  },
  {
    viewCode: 'mi_ficha.mis_objetivos',
    section: 'mi_ficha',
    label: 'Mis objetivos',
    description: 'Mis objetivos y key results del ciclo activo, con registro de avance.',
    routePath: '/my/goals',
    routeGroup: 'my'
  },
  {
    viewCode: 'mi_ficha.mis_evaluaciones',
    section: 'mi_ficha',
    label: 'Mis evaluaciones',
    description: 'Evaluaciones pendientes, feedback recibido y resultados.',
    routePath: '/my/evaluations',
    routeGroup: 'my'
  },
  {
    viewCode: 'mi_ficha.mi_organizacion',
    section: 'mi_ficha',
    label: 'Mi organización',
    description: 'Directorio, colegas y contexto organizacional cercano.',
    routePath: '/my/organization',
    routeGroup: 'my'
  },
  {
    viewCode: 'cliente.pulse',
    section: 'cliente',
    label: 'Pulse',
    description: 'Vista general del space cliente.',
    routePath: '/home',
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
  },
  {
    viewCode: 'cliente.equipo',
    section: 'cliente',
    label: 'Equipo',
    description: 'Equipo asignado, perfiles y visibilidad del roster del cliente.',
    routePath: '/equipo',
    routeGroup: 'client'
  },
  {
    viewCode: 'cliente.analytics',
    section: 'cliente',
    label: 'Analytics',
    description: 'Lectura analítica de delivery, actividad y rendimiento del servicio.',
    routePath: '/analytics',
    routeGroup: 'client'
  },
  {
    viewCode: 'cliente.revisiones',
    section: 'cliente',
    label: 'Revisiones',
    description: 'Queue de revisiones y seguimiento de feedback en curso.',
    routePath: '/reviews',
    routeGroup: 'client'
  },
  {
    viewCode: 'cliente.actualizaciones',
    section: 'cliente',
    label: 'Novedades',
    description: 'Novedades, cambios y comunicación continua del ecosistema.',
    routePath: '/updates',
    routeGroup: 'client'
  },
  {
    viewCode: 'cliente.campanas',
    section: 'cliente',
    label: 'Campañas',
    description: 'Lectura client-facing de campañas, iniciativas y contexto asociado.',
    routePath: '/campanas',
    routeGroup: 'client'
  },
  {
    viewCode: 'cliente.modulos',
    section: 'cliente',
    label: 'Módulos',
    description: 'Acceso a capability modules visibles para la cuenta cliente.',
    routePath: '/capabilities',
    routeGroup: 'client'
  },
  {
    viewCode: 'cliente.notificaciones',
    section: 'cliente',
    label: 'Notificaciones',
    description: 'Inbox y preferencias de avisos visibles para la sesión.',
    routePath: '/notifications',
    routeGroup: 'client'
  }
]

export const SECTION_ACCENT: Record<string, 'primary' | 'info' | 'success' | 'warning' | 'secondary'> = {
  gestion: 'info',
  equipo: 'success',
  finanzas: 'warning',
  ia: 'secondary',
  administracion: 'primary',
  mi_ficha: 'secondary',
  cliente: 'success'
}

// ── Build-time uniqueness validation (TASK-229) ──
// Prevents duplicate viewCodes from being introduced silently.

const viewCodeCounts = new Map<string, number>()

for (const entry of VIEW_REGISTRY) {
  viewCodeCounts.set(entry.viewCode, (viewCodeCounts.get(entry.viewCode) ?? 0) + 1)
}

const duplicates = [...viewCodeCounts.entries()].filter(([, count]) => count > 1)

if (duplicates.length > 0) {
  throw new Error(
    `VIEW_REGISTRY has duplicate viewCodes: ${duplicates.map(([code]) => code).join(', ')}. Each viewCode must be unique.`
  )
}
