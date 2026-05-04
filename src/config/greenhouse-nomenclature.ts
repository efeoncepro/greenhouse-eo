export const GH_CLIENT_NAV = {
  dashboard: { label: 'Pulse', subtitle: 'Vista general de tu operacion' },
  projects: { label: 'Proyectos', subtitle: 'Proyectos activos' },
  sprints: { label: 'Ciclos', subtitle: 'Sprints de produccion' },
  settings: { label: 'Mi Greenhouse', subtitle: 'Perfil y preferencias' },
  updates: { label: 'Novedades', subtitle: 'Novedades del ecosistema' },
  team: { label: 'Mi Equipo', subtitle: 'Equipo asignado a tu operación' },
  reviews: { label: 'Revisiones', subtitle: 'Queue de feedback en curso' },
  analytics: { label: 'Analytics', subtitle: 'Rendimiento y métricas del servicio' },
  campaigns: { label: 'Campañas', subtitle: 'Iniciativas y campañas activas' },
  notifications: { label: 'Notificaciones', subtitle: 'Avisos y preferencias' }
} as const

// Internal/admin surfaces are operational runtime, not part of the client portal
// nomenclature contract defined in Greenhouse_Nomenclatura_Portal_v3.md.
export const GH_INTERNAL_NAV = {
  home: { label: 'Home', subtitle: 'Nexa y operación de hoy' },
  internalDashboard: { label: 'Torre de control', subtitle: 'Operacion interna de spaces' },
  adminCenter: { label: 'Admin Center', subtitle: 'Gobernanza institucional del portal' },
  adminTenants: { label: 'Spaces', subtitle: 'Spaces, acceso y gobierno del portal' },
  adminTeam: { label: 'Equipo', subtitle: 'Colaboradores, activación y asignaciones' },
  adminUsers: { label: 'Usuarios', subtitle: 'Acceso, roles y scopes visibles' },
  adminRoles: { label: 'Roles y permisos', subtitle: 'Gobernanza operativa del portal' },
  adminViews: { label: 'Vistas y acceso', subtitle: 'Gobernanza por vista y lectura efectiva del portal' },
  adminOperationalCalendar: { label: 'Calendario operativo', subtitle: 'Feriados, cierre y hitos del mes operativo' },
  adminAiTools: { label: 'Herramientas IA', subtitle: 'Catálogo, licencias y créditos IA' },
  adminCorreos: { label: 'Correos', subtitle: 'Historial de envíos y suscripciones' },
  adminEmailPreview: { label: 'Preview de correos', subtitle: 'Previsualizar y probar templates de email' },
  adminCloudIntegrations: { label: 'Cloud & Integrations', subtitle: 'Syncs, webhooks, auth y runtime operativo' },
  adminNotifications: { label: 'Notificaciones', subtitle: 'Sistema de notificaciones in-app y email' },
  adminOpsHealth: { label: 'Ops Health', subtitle: 'Outbox, proyecciones y freshness del serving' },
  adminUntitledNotionPages: { label: 'Páginas sin título Notion', subtitle: 'Tareas, proyectos y sprints sin título — fix directo en Notion' },
  adminBusinessLines: { label: 'Business Lines', subtitle: 'Metadata canonica de las lineas de negocio' },
  adminServiceSlas: { label: 'SLA de servicios', subtitle: 'Gobernanza contractual por servicio y cumplimiento' },
  adminIntegrationGovernance: { label: 'Integration Governance', subtitle: 'Registro, taxonomia, readiness y ownership de integraciones nativas' },
  adminAccounts: { label: 'Cuentas', subtitle: 'Organizaciones, spaces y gobierno de identidad' },
  adminCommercialParties: { label: 'Commercial Parties', subtitle: 'Embudo, adopción HubSpot y conflictos del party lifecycle' },
  adminProductSyncConflicts: { label: 'Product Sync Conflicts', subtitle: 'Drift del catálogo comercial, auto-heal y resolución operativa con HubSpot Products' },
  adminPaymentInstruments: { label: 'Instrumentos de pago', subtitle: 'Cuentas bancarias, tarjetas, fintech y plataformas' },
  adminPricingCatalog: { label: 'Catálogo de pricing', subtitle: 'Roles, tools, overheads y gobierno comercial' },
  adminTalentReview: { label: 'Verificación de talento', subtitle: 'Skills, herramientas y certificaciones por revisar' },
  adminTalentOps: { label: 'Salud del talento', subtitle: 'Metricas y mantenimiento del sistema' },
  adminIdentityAccess: { label: 'Identidad y acceso', subtitle: 'Usuarios, roles, vistas y cuentas' },
  adminTeamOps: { label: 'Equipo y operaciones', subtitle: 'Talento, líneas de negocio e instrumentos' }
} as const

export const GH_PEOPLE_NAV = {
  people: { label: 'Personas', subtitle: 'Vista operativa del equipo Efeonce' }
} as const

export const GH_AGENCY_NAV = {
  workspace: { label: 'Agencia', subtitle: 'Pulse, Spaces y capacidad del equipo' },
  pulseGlobal: { label: 'Pulse Global', subtitle: 'KPIs agregados de todos los Spaces' },
  spaces: { label: 'Spaces', subtitle: 'Lista de clientes activos' },
  capacity: { label: 'Capacidad', subtitle: 'Carga operativa global del equipo' },
  organizations: { label: 'Organizaciones', subtitle: 'Cuentas, relaciones y estructura' },
  services: { label: 'Servicios', subtitle: 'Servicios contratados por Space' },
  staffAugmentation: { label: 'Staff Augmentation', subtitle: 'Placements, onboarding y economía por assignment' },
  economics: { label: 'Economía', subtitle: 'P&L y rentabilidad' },
  team: { label: 'Capacidad', subtitle: 'Carga operativa y dedicación del equipo' },
  talentDiscovery: { label: 'Talento', subtitle: 'Descubrimiento y ranking' },
  delivery: { label: 'Delivery', subtitle: 'ICO, sprints y producción' },
  campaigns: { label: 'Campañas', subtitle: 'Iniciativas cross-space' },
  operations: { label: 'Operaciones', subtitle: 'Salud del platform' },
  structure: { label: 'Estructura', subtitle: 'Organizaciones, servicios y operaciones' },
  teamAndTalent: { label: 'Equipo y talento', subtitle: 'Capacidad, descubrimiento y staffing' },
  operationsGroup: { label: 'Operaciones', subtitle: 'Delivery, campañas y estructura' }
} as const

export const GH_FINANCE_NAV = {
  dashboard: { label: 'Resumen', subtitle: 'Vista consolidada' },
  income: { label: 'Ventas', subtitle: 'Documentos de venta, devengo y cobros' },
  expenses: { label: 'Compras', subtitle: 'Documentos de compra, obligaciones y pagos' },
  suppliers: { label: 'Proveedores', subtitle: 'Directorio de proveedores' },
  reconciliation: { label: 'Conciliación', subtitle: 'Conciliación bancaria' },
  paymentOrders: { label: 'Órdenes de pago', subtitle: 'Obligaciones, ordenes y calendario de pagos' },
  paymentProfiles: { label: 'Perfiles de pago', subtitle: 'Cola de aprobación y drift cross-entity' },
  intelligence: { label: 'Economía', subtitle: 'Cierre de período y P&L operativo' },
  quotes: { label: 'Cotizaciones', subtitle: 'Cotizaciones de Nubox y HubSpot en un solo lugar' },
  contracts: { label: 'Contratos', subtitle: 'SOWs, renovaciones y ejecución comercial activa' },
  masterAgreements: { label: 'Acuerdos marco', subtitle: 'MSAs, cláusulas maestras y contratos vinculados' },
  products: { label: 'Productos', subtitle: 'Catalogo de productos y servicios sincronizado con HubSpot' },
  purchaseOrders: { label: 'Órdenes de compra', subtitle: 'OC de clientes, saldos y consumo' },
  hes: { label: 'HES', subtitle: 'Hojas de entrada de servicio' },
  clients: { label: 'Clientes', subtitle: 'Maestro de clientes y coberturas' },
  costAllocations: { label: 'Asignaciones', subtitle: 'Reparto e imputación de costos' },
  flow: { label: 'Flujo operativo', subtitle: 'Ventas, compras y maestros' },
  cashIn: { label: 'Cobros', subtitle: 'Pagos recibidos contra facturas de venta' },
  cashOut: { label: 'Pagos', subtitle: 'Pagos ejecutados contra compromisos' },
  bank: { label: 'Banco', subtitle: 'Tesorería por cuenta, fintech e instrumentos' },
  shareholderAccount: { label: 'Cuenta accionista', subtitle: 'Saldo empresa ↔ accionista' },
  cashPosition: { label: 'Posición de caja', subtitle: 'Saldo real, cuentas por cobrar y por pagar' },
  documents: { label: 'Documentos', subtitle: 'Cotizaciones, OC, HES y conciliación' },
  analytics: { label: 'Inteligencia', subtitle: 'Economía y asignaciones de costos' },
  treasury: { label: 'Tesorería', subtitle: 'Cobros, pagos, banco y posición de caja' }
} as const

export const GH_HR_NAV = {
  payroll: { label: 'Nómina mensual', subtitle: 'Compensaciones y liquidación' },
  payrollProjected: { label: 'Nómina proyectada', subtitle: 'Simulación y previsión' },
  team: { label: 'Mi equipo', subtitle: 'Workspace operativo de tu subárbol visible' },
  approvals: { label: 'Aprobaciones', subtitle: 'Cola operativa del equipo visible' },
  hierarchy: { label: 'Jerarquía', subtitle: 'Supervisoría, delegaciones y cambios' },
  orgChart: { label: 'Organigrama', subtitle: 'Explorador visual de la jerarquía' },
  departments: { label: 'Departamentos', subtitle: 'Estructura organizacional' },
  offboarding: { label: 'Offboarding', subtitle: 'Casos de salida laboral y contractual' },
  leave: { label: 'Permisos', subtitle: 'Solicitudes y saldos de permisos' },
  attendance: { label: 'Asistencia', subtitle: 'Registros de asistencia del equipo' },
  goals: { label: 'Objetivos', subtitle: 'OKRs, ciclos y seguimiento de avance' },
  evaluations: { label: 'Evaluaciones', subtitle: 'Ciclos 360, asignaciones y calibracion' }
} as const

export const GH_MY_NAV = {
  dashboard: { label: 'Mi Greenhouse', subtitle: 'Tu operación personal' },
  assignments: { label: 'Mis Asignaciones', subtitle: 'Clientes, FTE y capacidad' },
  performance: { label: 'Mi Desempeño', subtitle: 'ICO, OTD y métricas' },
  delivery: { label: 'Mi Delivery', subtitle: 'Tareas, proyectos y CRM' },
  profile: { label: 'Mi Perfil', subtitle: 'Identidad y datos personales' },
  payroll: { label: 'Mi Nómina', subtitle: 'Liquidaciones y compensación' },
  leave: { label: 'Mis Permisos', subtitle: 'Saldos y solicitudes' },
  goals: { label: 'Mis Objetivos', subtitle: 'OKRs y key results del ciclo' },
  evaluations: { label: 'Mis Evaluaciones', subtitle: 'Feedback 360 y resultados' },
  organization: { label: 'Mi Organización', subtitle: 'Directorio y colegas' },
  settings: { label: 'Configuración', subtitle: 'Notificaciones y preferencias' }
} as const

export const GH_AGENCY = {
  pulse_title: 'Pulse Global',
  pulse_subtitle: 'La operación completa de Efeonce, en un vistazo',
  spaces_title: 'Spaces',
  spaces_subtitle: 'Lista de clientes y su estado operativo',
  capacity_title: 'Capacidad',
  capacity_subtitle: 'Carga operativa global del equipo Efeonce',
  chip_interno: 'Interno',
  kpi_rpa: 'RpA Global',
  kpi_assets: 'Assets activos',
  kpi_otd: 'OTD% Global',
  kpi_feedback: 'Feedback pendiente',
  kpi_fte: 'FTE Total',
  kpi_utilization: 'Utilización',
  kpi_hours: 'Horas mes',
  rpa_semaphore: (rpa: number | null) => rpa === null ? 'Sin data' : rpa <= 1.5 ? 'Óptimo' : rpa <= 2.5 ? 'Atención' : 'Alerta',
  otd_semaphore: (pct: number | null) => pct === null ? 'Sin data' : pct >= 90 ? 'Óptimo' : pct >= 70 ? 'Atención' : 'Alerta',
  space_filter_all: 'Todos los Spaces',
  space_filter_active: 'Activos',
  space_filter_inactive: 'Inactivos',
  search_placeholder: 'Buscar por nombre o ID…',
  empty_spaces: 'No hay Spaces que coincidan con tu búsqueda.',
  empty_pulse: 'Se necesitan al menos 2 semanas de actividad para generar esta gráfica.',
  capacity_empty: 'Los datos de capacidad se están configurando. Estarán disponibles cuando el sistema de equipo esté activo.',
  col_space: 'Space',
  col_service_line: 'Línea',
  col_rpa: 'RpA',
  col_otd: 'OTD%',
  col_assets: 'Assets',
  col_feedback: 'Feedback',
  meta_spaces: (n: number) => `${n} Space${n !== 1 ? 's' : ''} activo${n !== 1 ? 's' : ''}`,
  meta_projects: (n: number) => `${n} proyecto${n !== 1 ? 's' : ''}`,
  meta_sync: (label: string) => `Última sync: ${label}`,

  // Spaces view — enhanced labels with data storytelling
  spaces_kpi_total: 'Spaces activos',
  spaces_kpi_rpa: 'RpA promedio',
  spaces_kpi_otd: 'OTD promedio',
  spaces_kpi_team: 'Equipo asignado',
  spaces_kpi_total_detail: (n: number) =>
    `${n} Space${n !== 1 ? 's' : ''} con operación activa`,
  spaces_kpi_rpa_detail: (v: number | null) =>
    v === null ? 'Sin datos de revisiones'
    : v <= 1.5 ? 'Dentro del rango óptimo'
    : v <= 2.5 ? 'Atención: sobre 1.5 revisiones'
    : 'Crítico: sobre 2.5 revisiones',
  spaces_kpi_otd_detail: (v: number | null) =>
    v === null ? 'Sin datos de entrega'
    : v >= 90 ? 'Cumplimiento dentro de meta'
    : v >= 70 ? 'Atención: bajo 90%'
    : 'Crítico: bajo 70%',
  spaces_kpi_team_detail: (members: number, fte: number) =>
    `${members} persona${members !== 1 ? 's' : ''} · ${fte.toFixed(1)} FTE dedicados`,
  spaces_chart_rpa_title: 'RpA por Space',
  spaces_chart_rpa_subtitle: 'Revisiones promedio por activo. Menos es mejor.',
  spaces_chart_health_title: 'Salud operativa',
  spaces_chart_health_subtitle: 'Spaces según su semáforo de salud',
  spaces_filter_health: 'Salud',
  spaces_filter_health_all: 'Todos',
  spaces_filter_health_optimal: 'Óptimo',
  spaces_filter_health_attention: 'Atención',
  spaces_filter_health_critical: 'Crítico',
  spaces_view_table: 'Tabla',
  spaces_view_cards: 'Tarjetas',
  spaces_col_projects: 'Proyectos',
  spaces_col_team: 'Equipo',
  spaces_col_health: 'Salud',

  // ICO Engine tab
  ico_title: 'ICO Engine',
  ico_subtitle: 'Métricas de Intelligent Creative Operations por Space',
  ico_kpi_rpa: 'RpA Promedio',
  ico_kpi_otd: 'OTD%',
  ico_kpi_ftr: 'FTR%',
  ico_kpi_throughput: 'Throughput',
  ico_kpi_cycle_time: 'Ciclo promedio',
  ico_kpi_stuck: 'Activos estancados',
  ico_kpi_velocity: 'Velocidad pipeline',
  ico_empty_title: 'Aún no hay métricas ICO',
  ico_empty_description: 'El engine calculará las métricas automáticamente después de la próxima sincronización nocturna. También puedes calcular en vivo.',
  ico_compute_live: 'Calcular en vivo',
  ico_col_space: 'Space',
  ico_col_rpa: 'RpA',
  ico_col_otd: 'OTD%',
  ico_col_ftr: 'FTR%',
  ico_col_throughput: 'Throughput',
  ico_col_cycle: 'Ciclo (días)',
  ico_col_stuck: 'Estancados',
  ico_col_zone: 'Estado',
  ico_period_label: (month: number, year: number) => {
    const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

    return `${MONTHS[month - 1]} ${year}`
  },

  // Stuck assets drawer
  ico_stuck_drawer_title: 'Activos estancados',
  ico_stuck_col_task: 'Activo',
  ico_stuck_col_phase: 'Fase CSC',
  ico_stuck_col_days: 'Días detenido',
  ico_stuck_col_severity: 'Severidad',
  ico_stuck_severity_warning: 'Advertencia',
  ico_stuck_severity_danger: 'Crítico',
  ico_stuck_empty: 'No hay activos estancados en este Space',

  // RPA trend
  ico_rpa_trend_title: 'Evolución RpA',
  ico_rpa_trend_subtitle: 'Promedio mensual de revisiones por activo por Space',
  ico_rpa_trend_empty: 'Aún no hay suficiente historial para mostrar tendencias.',

  // Metric tooltips
  tooltip_rpa: 'Revisiones por activo — promedio de ciclos de revisión por pieza entregada',
  tooltip_otd: 'On-Time Delivery — porcentaje de tareas completadas dentro del plazo',
  tooltip_ftr: 'First Time Right — porcentaje de tareas aprobadas sin correcciones',
  tooltip_throughput: 'Tareas completadas en el período activo',
  tooltip_cycle_time: 'Días promedio desde inicio hasta entrega de cada activo',
  tooltip_stuck: 'Activos detenidos que requieren atención inmediata',

  // Nexa Insights (legacy alias — see GH_NEXA for the canonical namespace)
  advisory_title: 'Nexa Insights'
} as const

export const GH_LABELS = {
  kpi_rpa: 'RpA promedio',
  kpi_active: 'Assets activos',
  kpi_completed: 'Deliveries del periodo',
  kpi_feedback: 'Feedback pendiente',
  kpi_otd: 'OTD%',

  semaphore_green: 'Óptimo',
  semaphore_yellow: 'Atención',
  semaphore_red: 'Alerta',

  chart_status: 'Status de assets',
  chart_rpa: 'RpA por proyecto',
  chart_velocity: 'Avance del ciclo actual',
  chart_timeline: 'Activity timeline',
  chart_total_assets: 'Assets',

  col_asset: 'Asset',
  col_status: 'Status',
  col_rounds: 'Rondas',
  col_feedback: 'Feedback',
  col_last_activity: 'Ultima actividad',

  sprint_active: 'Ciclo activo',
  sprint_history: 'Ciclos anteriores',
  sprint_velocity: 'Velocity por ciclo',
  sprint_burndown: 'Burndown',
  col_review: 'Revision'
} as const

export const GH_TEAM = {
  section_title: 'Tu equipo de cuenta',
  section_subtitle: 'Las personas asignadas a tu operacion. Contacto directo, sin intermediarios.',
  pulse_title: 'Tu equipo asignado',
  pulse_subtitle: 'Las personas asignadas a tu operacion creativa',
  section_people_subtitle: 'Roster activo visible en tu operacion.',
  section_identity_subtitle: 'Personas con identidad externa enlazada.',
  label_fte: 'Dedicacion',
  label_people: 'Personas',
  label_identity: 'Identidad conectada',
  label_profession: 'Profesion u oficio',
  label_role_internal: 'Rol en Efeonce',
  label_profile: 'Perfil profesional',
  label_location: 'Ubicacion',
  label_experience: 'Experiencia',
  label_tenure_efeonce: 'Tiempo en Efeonce',
  label_tenure_client: 'Tiempo con tu cuenta',
  label_languages: 'Idiomas',
  label_phone: 'Telefono',
  label_completeness: 'Perfil cargado',
  label_service_line: 'Linea de servicio',
  label_modality: 'Modalidad',
  footer_team_total: 'Equipo',
  expand_title: 'Ampliar equipo',
  expand_subtitle: 'Agrega capacidad creativa, de medios o tecnologia.',
  modality_pending: 'Por definir',
  relevance_pending: 'La nota de relevancia de esta persona se esta configurando.',
  profile_pending: 'Perfil ampliado en configuracion',
  location_pending: 'Ubicacion pendiente',
  profession_pending: 'Profesion pendiente',
  experience_pending: 'Experiencia pendiente',
  tenure_pending: 'Antiguedad pendiente',
  biography_pending: 'Bio profesional pendiente',
  contact_pending: 'Canal en configuracion',
  contact_channel_teams: 'Microsoft Teams',
  contact_channel_slack: 'Slack',
  contact_channel_email: 'Email',
  provider_notion: 'Notion',
  provider_microsoft: 'Microsoft',
  provider_google: 'Google',
  provider_hubspot: 'HubSpot',
  provider_deel: 'Deel',
  identity_confidence_strong: 'Match robusto',
  identity_confidence_partial: 'Match parcial',
  identity_confidence_basic: 'Match en configuracion',

  capacity_title: 'Capacidad del equipo',
  capacity_subtitle: 'Carga operativa basada en proyectos y tareas activas',
  label_contracted: 'Capacidad contratada',
  label_hours: 'Horas este mes',
  label_utilization: 'Utilizacion',
  label_load: 'Carga por persona',
  label_committed_capacity: 'Dedicacion contratada',
  pulse_summary_title: 'Capacidad contratada',
  pulse_summary_fte: (fte: number) => `${fte.toFixed(1)} FTE de ${fte.toFixed(1)} FTE contratados`,
  pulse_summary_hours: (hours: number) => `${hours} horas mensuales`,
  pulse_service_lines_more: (count: number) => `+${count} linea${count === 1 ? '' : 's'} adicional${count === 1 ? '' : 'es'}`,
  active_assets_short: 'assets activos',
  projects_short: 'proyectos',
  capacity_contract_only: 'Por ahora mostramos la dedicacion contratada por persona.',
  capacity_summary_subtitle: 'Resumen de capacidad contratada y uso estimado del mes',
  capacity_utilization_help: 'La utilizacion se calcula sobre la capacidad total visible del equipo.',
  capacity_people_assigned: (count: number) => `${count} ${count === 1 ? 'persona asignada' : 'personas asignadas'}`,
  capacity_people_helper: 'Cobertura visible hoy para tu operacion.',
  capacity_uniform_allocation: 'Todo el equipo visible tiene la misma dedicacion contratada.',
  capacity_operational_live: 'La carga real por persona ya esta visible.',
  capacity_member_hours: (hours: number) => `${hours}h/mes`,
  capacity_member_fte: (fte: number) => `${fte.toFixed(1)} FTE`,
  capacity_overloaded: 'Carga alta',
  capacity_available: 'Carga visible',
  capacity_projects_label: (count: number) => `${count} ${count === 1 ? 'proyecto' : 'proyectos'}`,
  capacity_assets_label: (count: number) => `${count} ${count === 1 ? 'asset activo' : 'assets activos'}`,
  capacity_no_breakdown: 'Sin desglose operativo por persona',

  project_team_title: 'Equipo en este proyecto',
  project_team_subtitle: 'Quienes estan trabajando hoy en este proyecto y como se mueve su carga.',
  project_people_summary: '{count} personas trabajando en este proyecto',
  project_people_summary_label: (count: number) =>
    `${count} ${count === 1 ? 'persona trabajando en este proyecto' : 'personas trabajando en este proyecto'}`,
  project_detail_title: 'Detalle del equipo',
  project_person_column: 'Persona',
  project_active_column: 'Assets activos',
  project_completed_column: 'Completados',
  project_review_column: 'En revision',
  project_changes_column: 'Con cambios',
  project_expand_label: 'Ver detalle por persona',
  project_collapse_label: 'Ocultar detalle por persona',
  project_people_subtitle: 'Personas activas dentro del proyecto.',
  project_load_subtitle: 'Carga activa hoy en el proyecto.',
  project_review_subtitle: 'Entregables listos para revision.',
  project_chip_active: 'activos',
  project_chip_completed: 'completados',
  project_chip_review: 'en revision',
  project_chip_changes: 'con cambios',

  sprint_vel_title: 'Velocity por persona',
  sprint_vel_subtitle: 'Rendimiento del equipo en este ciclo',
  sprint_tasks_title: 'Tareas del ciclo',
  sprint_tasks_subtitle: 'personas activas',
  sprint_completed_title: 'Completado',
  sprint_completed_subtitle: 'cerradas',
  sprint_pace_title: 'Ritmo del sprint',
  sprint_pace_pending: 'Estado en configuracion',
  sprint_global_progress: 'Avance global del ciclo',
  sprint_baseline_missing: 'Sin baseline',
  sprint_plan_prefix: 'Plan',
  sprint_progress_personal: (percent: number) => `${percent}% personal`,
  sprint_chip_completed: 'completadas',
  sprint_chip_pending: 'pendientes',
  sprint_chip_total: 'totales',
  assigned_since: (date: string) => `Asignado desde ${date}`,
  experience_years: (years: number) => `${years.toFixed(1)} anos`,
  rpa_label: (value: number) => `RpA ${value.toFixed(1)}`,
  rpa_empty: 'RpA --',
  capacity_people_active: (count: number) => `${count} ${count === 1 ? 'persona activa' : 'personas activas'}`,
  sprint_people_active: (count: number) => `${count} ${count === 1 ? 'persona activa' : 'personas activas'}`,
  sprint_completed_total: (count: number) => `${count} ${count === 1 ? 'cerrada' : 'cerradas'}`,
  label_signal: 'Senal operativa',
  label_rpa: 'RpA',

  cta_title: 'Tu equipo esta al {percent}% de capacidad este mes',
  cta_subtitle: 'Si tienes necesidades adicionales, puedes sumar capacidad On-Demand sin afectar tu equipo actual.',
  cta_button: 'Ampliar capacidad',
  cta_signal_high: 'Capacidad ajustada',
  cta_signal_balanced: 'Cobertura saludable',

  service_lines_title: 'Lineas activas',
  service_lines_empty: 'Lineas en configuracion',
  role_note_account: 'Punto de contacto principal para briefs, prioridades y escalamientos.',
  role_note_operations: 'Coordina el ritmo operativo y la ejecucion diaria de tu cuenta.',
  role_note_strategy: 'Orienta decisiones de enfoque, alcance y lectura ejecutiva.',
  role_note_design: 'Lidera la ejecucion creativa y la calidad visual de los assets.',
  role_note_development: 'Soporta la implementacion tecnica y el delivery digital del servicio.',
  role_note_media: 'Acompana activacion, distribucion y lectura de performance.',
  dedication_pending: 'Asignacion en definicion'
} as const

export const GH_MESSAGES = {
  login_title: 'Entra a tu Greenhouse',
  login_subtitle: 'Accede con tu cuenta',
  login_button: 'Entrar',
  logout_button: 'Salir del Greenhouse',
  login_with_microsoft: 'Entrar con Microsoft',
  login_with_google: 'Entrar con Google',
  login_with_email: 'Entrar con email',
  login_validating: 'Validando acceso...',
  login_redirecting_microsoft: 'Redirigiendo a Microsoft...',
  login_redirecting_google: 'Redirigiendo a Google...',
  login_preparing_workspace: 'Preparando tu espacio de trabajo...',
  login_email_placeholder: 'Tu email corporativo',
  login_password_placeholder: 'Password',
  login_forgot_password: '\u00bfOlvidaste tu contrase\u00f1a?',
  login_error_credentials:
    'Email o contraseña incorrectos. Verifica tus datos e intenta de nuevo.',
  login_error_provider_unavailable:
    'El proveedor de autenticación no respondió. Intenta de nuevo en unos segundos.',
  login_error_account_disabled:
    'Tu cuenta no tiene acceso al portal. Contacta a tu administrador.',
  login_error_session_expired: 'Tu sesión expiró. Ingresa tus credenciales nuevamente.',
  login_error_network: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
  login_access_note:
    'El acceso se provisiona internamente. \u00bfNo tienes cuenta? Contacta a tu administrador.',
  login_hero_title: 'Todo tu ecosistema.\nUn solo lugar.',
  login_hero_subtitle: 'La plataforma de Efeonce donde todo se conecta y todo se mide.',
  login_vp_1_title: 'Visibilidad en tiempo real',
  login_vp_1_subtitle: 'Lo que necesitas ver, siempre actualizado',
  login_vp_2_title: 'Datos que importan',
  login_vp_2_subtitle: 'Las m\u00e9tricas correctas para tus decisiones',
  login_vp_3_title: 'Mejora continua',
  login_vp_3_subtitle: 'Cada mes es mejor que el anterior',
  login_footer: 'Greenhouse\u2122 \u00b7 Efeonce Group \u00b7 2026',
  login_microsoft_unavailable:
    'Microsoft SSO aun no esta configurado en este ambiente. Puedes usar credenciales mientras se cargan AZURE_AD_CLIENT_ID y AZURE_AD_CLIENT_SECRET.',
  login_google_unavailable:
    'Google SSO aun no esta configurado en este ambiente. Puedes usar credenciales mientras se cargan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.',

  welcome_first: (name: string) => `Bienvenido al Greenhouse, ${name}`,
  welcome_return: (name: string) => `${name}, tu Greenhouse esta actualizado`,

  subtitle_pulse: 'El ritmo de tu operacion creativa',
  subtitle_projects: 'Todo lo que esta en movimiento',
  subtitle_sprints: 'El ritmo de cada sprint de produccion',
  subtitle_settings: 'Perfil y preferencias',
  subtitle_updates: 'Updates relevantes de tu ecosistema',

  loading_initial: 'Preparando tu Greenhouse...',
  loading_data: 'Cargando datos...',
  error_connection: 'No pudimos conectar con tus datos. Intenta de nuevo en unos minutos.',
  error_no_data: 'Sin datos para este periodo',
  error_projects_live: 'No pudimos cargar datos live de proyectos para tu space.',
  error_project_detail: 'No pudimos cargar este proyecto. Intenta de nuevo en unos minutos.',
  error_team_members: 'No pudimos cargar tu equipo de cuenta. Intenta de nuevo en unos minutos.',
  error_team_capacity: 'No pudimos cargar la capacidad del equipo en este momento.',
  error_team_project: 'No pudimos cargar el equipo de este proyecto.',
  error_team_sprint: 'No pudimos cargar la velocity por persona de este ciclo.',
  error_updates: 'No pudimos cargar los updates del ecosistema en este momento.',

  empty_dashboard:
    'Tu Greenhouse esta listo. Los datos apareceran cuando tu primer proyecto este en marcha.',
  empty_projects:
    'No hay proyectos activos en este momento. Cuando un nuevo proyecto arranque, aparecera aqui.',
  empty_sprints:
    'No hay ciclos activos. Cuando tu equipo de cuenta inicie un nuevo sprint, lo veras aqui.',
  empty_updates: 'Todo al dia. Cuando haya updates del ecosistema, apareceran aqui.',
  empty_team:
    'Tu equipo de cuenta esta siendo configurado. Cuando este listo, veras aqui a cada persona asignada a tu operacion.',
  empty_capacity: 'Los datos de capacidad apareceran cuando tu primer proyecto este en marcha.',
  empty_team_project: 'Todavia no hay trazabilidad suficiente para mostrar el equipo de este proyecto.',
  empty_project_assets:
    'Aun no hay assets visibles para este proyecto. Cuando la produccion se active, apareceran aqui.',
  empty_project_cycle:
    'Este proyecto aun no tiene un ciclo activo visible. Cuando tu equipo de cuenta lo asigne, aparecera aqui.',
  empty_sprint_velocity:
    'La lectura de velocity aparecera cuando el ciclo tenga suficiente actividad visible.',
  empty_sprint_burndown:
    'El burndown estara disponible cuando el ciclo tenga base suficiente de tareas activas y cerradas.',
  empty_sprint_team:
    'La lectura por persona aparecera cuando exista trazabilidad suficiente del ciclo actual.',

  tooltip_rpa: 'Rounds per Asset: promedio de rondas de revision por pieza. Menos es mejor.',
  tooltip_otd: 'On-Time Delivery: porcentaje de entregas realizadas en la fecha comprometida.',
  tooltip_semaphore_green: 'Óptimo: la operación está dentro de los estándares ICO.',
  tooltip_semaphore_yellow:
    'Atención: algunos indicadores se acercan al límite. Tu equipo de cuenta ya está al tanto.',
  tooltip_semaphore_red:
    'Alerta: indicadores fuera de rango. Tu equipo de cuenta te contactará con un action plan.',
  tooltip_utilization: 'Estimacion de uso basada en la carga operativa actual del equipo.',
  team_operational_pending:
    'La trazabilidad operativa de responsables aun no esta completa en BigQuery. El roster contractual sigue visible mientras termina ese sync.',
  team_project_breakdown_empty: 'Sin distribucion visible por proyecto todavia.',
  team_no_visible_activity: 'Sin actividad este mes',

  footer: 'Efeonce Greenhouse™ · El ambiente diseñado para que tu marca crezca',
  footer_portal_link: 'Portal',

  hero_activity_prefix: 'Ultima actividad',
  hero_active_projects: (count: number) => `${count} ${count === 1 ? 'proyecto activo.' : 'proyectos activos.'}`,

  dashboard_kpi_rpa_subtitle: 'Promedio de rondas de revision por pieza',
  dashboard_kpi_monthly_empty: 'Aun sin actividad este mes.',
  dashboard_kpi_completed_subtitle: 'Ultimos 30 dias',
  dashboard_kpi_completed_tooltip: 'Total de assets que pasaron a estado Listo en los ultimos 30 dias.',
  dashboard_kpi_completed_footer_active: 'Actividad reciente visible en la cuenta.',
  dashboard_kpi_completed_status_active: 'Actividad mensual',
  dashboard_kpi_completed_status_empty: 'Sin actividad este mes',
  dashboard_kpi_otd_subtitle: 'Deliveries dentro de plazo',
  dashboard_kpi_otd_footer: 'Promedio del portafolio visible.',
  dashboard_kpi_feedback_subtitle: 'Assets esperando tu feedback',
  dashboard_kpi_feedback_tooltip: 'Assets en estado Listo para revision o con comentarios abiertos en Frame.io.',
  dashboard_kpi_feedback_footer: (count: number) => `${count} comentarios abiertos.`,

  chart_empty_title: 'Aun no hay suficiente actividad',
  chart_empty_description: 'Este grafico necesita al menos 2 semanas de datos para ser util.',
  chart_status_subtitle: 'Assets activos de tu cuenta',
  chart_cadence_title: 'Cadencia de deliveries',
  chart_cadence_subtitle: 'Assets completados por semana - ultimos 3 meses',
  chart_rpa_subtitle: 'Linea de referencia: 2,0 (maximo ICO)',
  chart_otd_title: 'OTD% mensual',
  chart_otd_subtitle: 'Tendencia de los ultimos 6 meses - meta: 90%',
  chart_goal_rpa: 'Meta 2,0',
  chart_goal_otd: 'Meta 90%',
  chart_tooltip_assets: (value: number) => `${value} assets`,
  chart_tooltip_weekly_assets: (value: number) => `${value} assets`,

  portfolio_title: 'Salud del portafolio',
  portfolio_summary: (healthy: number, risk: number) => `${healthy} proyectos saludables, ${risk} bajo observacion.`,
  portfolio_healthy_chip: (count: number) => `${count} saludables`,
  portfolio_risk_chip: (count: number) => `${count} bajo observacion`,
  portfolio_feedback_chip: (count: number) => `${count} comentarios abiertos`,
  portfolio_metric_otd: 'OTD% promedio',
  portfolio_metric_delivered: 'Deliveries del periodo',
  portfolio_metric_feedback: 'Feedback pendiente',
  portfolio_metric_otd_detail: 'Deliveries dentro del plazo definido en el brief.',
  portfolio_metric_delivered_detail: 'Ultimos 30 dias del alcance visible.',
  portfolio_metric_feedback_detail: 'Friccion activa de revision sobre la cuenta.',

  attention_title: 'Proyectos bajo atencion',
  attention_alerts_chip: (count: number) => `${count} alertas`,
  attention_all_clear: 'Todos los proyectos operan normalmente.',
  attention_blocked_chip: (count: number) => `${count} bloqueadas`,
  attention_review_chip: (count: number) => `${count} en revision`,
  attention_otd_chip: (value: number | null) => `OTD ${value === null ? 'Sin dato' : `${Math.round(value)}%`}`,
  attention_open_project: 'Abrir proyecto',

  ecosystem_stack_title: 'Tu stack',
  ecosystem_stack_subtitle: 'Herramientas activas en tu cuenta',
  ecosystem_stack_empty_title: 'Tu stack esta en configuracion.',
  ecosystem_stack_empty_description: 'Pronto tendras acceso directo a tus herramientas desde aqui.',
  ecosystem_stack_request: 'Necesitas una herramienta adicional? Solicitar',
  ecosystem_ai_title: 'AI en tu cuenta',
  ecosystem_ai_subtitle: 'Inteligencia artificial activa en tu operacion',
  ecosystem_ai_empty_title: 'Las herramientas AI se activaran con tu primer proyecto creativo.',
  ecosystem_ai_empty_description: 'Esta seccion mostrara la capacidad AI activa de tu cuenta cuando este habilitada.',
  ecosystem_ai_request: 'Necesitas otra capacidad AI? Solicitar',
  ecosystem_open_tool: 'Abrir herramienta',

  projects_scope_metric: 'Proyectos en scope',
  projects_active_metric: 'Assets activos',
  projects_review_metric: 'Feedback pendiente',
  projects_total_metric: 'Assets',
  projects_progress_label: 'Progreso',
  projects_delivery_label: 'Deliveries del periodo',
  projects_detail_button: 'Ver detalle del proyecto',
  projects_dates_pending: 'Fechas por definir',
  projects_dates_open: 'Abierto',

  project_back: 'Volver a Proyectos',
  project_workspace_button: 'Abrir workspace fuente',
  project_summary_empty:
    'Este proyecto aun no tiene un resumen visible. La lectura ejecutiva se esta construyendo desde la actividad real.',
  project_delivery_window: 'Ventana de trabajo',
  project_status_summary: 'Status operativo',
  project_assets_title: 'Assets',
  project_assets_subtitle:
    'Assets visibles del proyecto, ordenados por la actividad mas reciente y con foco en revision y friccion.',
  project_cycle_title: 'Ciclo activo',
  project_cycle_subtitle:
    'Lectura del ciclo visible para este proyecto. Si no existe asignacion, el modulo se mantiene en estado explicativo.',
  project_cycle_progress: 'Avance del ciclo',
  project_cycle_assets: 'Assets en ciclo',
  project_cycle_completed: 'Completados',
  project_cycle_source: 'Abrir ciclo fuente',
  project_cycle_detail: 'Ver detalle del ciclo',
  project_review_title: 'Presion de feedback',
  project_review_subtitle:
    'Usa esta lectura para decidir si la siguiente conversacion debe enfocarse en aprobaciones, retrabajo o bloqueos.',
  project_review_open: 'Assets con feedback abierto',
  project_review_ready: 'Listos para revision',
  project_review_changes: 'En cambios cliente',
  project_review_blocked: 'Assets bloqueados',
  project_task_cycle_unassigned: 'Sin ciclo asignado',
  project_last_comment_prefix: 'Ultimo comentario',
  project_review_open_chip: 'Feedback abierto',
  project_review_blocked_chip: 'Bloqueado',
  project_review_clear_chip: 'Sin friccion',

  settings_identity_title: 'Tu perfil',
  settings_identity_subtitle:
    'Revisa como esta vinculada tu identidad de acceso dentro de Greenhouse.',
  settings_preferences_title: 'Preferences',
  settings_preferences_subtitle: 'Ajusta tus preferencias de visibilidad del servicio.',
  settings_digest_title: 'Resumen semanal del cliente',
  settings_digest_description:
    'Recibe cada viernes un resumen breve del status del ciclo, la presion de revision y el feedback pendiente.',
  settings_alerts_title: 'Alertas de escalamiento de feedback',
  settings_alerts_description:
    'Marca cuando el feedback sin resolver supera el umbral acordado con tu equipo de cuenta.',
  settings_risk_title: 'Indicador de salud de delivery',
  settings_risk_description:
    'Muestra un indicador ejecutivo que combina throughput, rondas de revision y trabajo vencido.',
  settings_account_linked: 'Cuenta SSO vinculada',
  settings_account_unlinked: 'Sin cuentas SSO vinculadas',
  settings_verified: 'Verificado',
  settings_microsoft_unlinked: 'Sin vinculo Microsoft',
  settings_google_unlinked: 'Sin vinculo Google',
  settings_link_microsoft: 'Vincular cuenta Microsoft',
  settings_link_google: 'Vincular cuenta Google',
  settings_microsoft_unavailable:
    'El provider Microsoft no esta configurado en este ambiente, por lo que el vinculo SSO no se puede iniciar desde aqui todavia.',
  settings_google_unavailable:
    'El provider Google no esta configurado en este ambiente, por lo que el vinculo SSO no se puede iniciar desde aqui todavia.',
  settings_access_method_label: 'Metodo de acceso activo',
  settings_provider_credentials: 'Email y password',
  settings_provider_microsoft: 'Microsoft SSO',
  settings_provider_google: 'Google SSO',

  sprints_cycle_active_title: 'Ciclo activo',
  sprints_cycle_active_description:
    'Lectura operativa del ciclo visible hoy para tu cuenta. Muestra deliveries, feedback y bloqueos del periodo activo.',
  sprints_progress_label: 'Avance',
  sprints_deliveries_metric: 'Deliveries del periodo',
  sprints_blocked_metric: 'Items bloqueados',
  sprints_history_title: 'Ciclos anteriores',
  sprints_dates_label: 'Inicio / Cierre',
  sprints_velocity_title: 'Velocity por ciclo',
  sprints_velocity_subtitle: 'Comparativo reciente del ritmo operativo visible.',
  sprints_burndown_title: 'Burndown',
  sprints_burndown_subtitle: 'Curva esperada de cierre del ciclo actual.',
  sprints_team_title: 'Velocity por persona',
  sprints_team_subtitle: 'Rendimiento del equipo en este ciclo',
  sprints_completion_format: (completed: number, total: number) => `${completed} / ${total}`,

  updates_title: 'Updates del ecosistema',
  updates_subtitle: 'Novedades relevantes del servicio y la operacion de tu cuenta.',
  updates_new_badge: 'New',
  updates_empty_title: 'Todo al dia',

  request_dialog_title: 'Que necesitas?',
  request_dialog_description:
    'Describe el perfil, la capacidad o la herramienta que buscas. Podras copiar este mensaje y compartirlo con tu equipo de cuenta.',
  request_dialog_placeholder:
    'Describe el perfil o la capacidad que buscas. Tu equipo de cuenta te contactara.',
  request_dialog_prefill: (intent: string) => `Necesito apoyo en: ${intent}.`,
  request_dialog_fallback: 'Necesito apoyo con mi operacion en Greenhouse.',
  request_dialog_copied: 'Solicitud lista para compartir con tu equipo de cuenta.',
  request_dialog_close: 'Cerrar',
  request_dialog_copy: 'Copiar solicitud'
} as const

export const GH_INTERNAL_MESSAGES = {
  internal_dashboard_clients: 'Clientes',
  internal_dashboard_active_users: 'Usuarios activos',
  internal_dashboard_pending_users: 'Pendientes de activacion',
  internal_dashboard_internal_admins: 'Admins internos',
  internal_dashboard_spaces_without_activity: 'Spaces sin actividad',
  internal_dashboard_global_otd: 'OTD global',
  internal_dashboard_no_new_clients: 'Sin altas nuevas este mes.',
  internal_dashboard_active_subtitle: (active: number, total: number) => `${active} de ${total} con al menos 1 login`,
  internal_dashboard_active_status_low: 'Activacion baja',
  internal_dashboard_active_status_healthy: 'Base activa',
  internal_dashboard_active_footer: 'Semaforo de activacion efectiva del portal.',
  internal_dashboard_global_subtitle: 'Promedio ponderado de OTD visible',
  internal_dashboard_title: 'Control Tower',
  internal_dashboard_requires_attention: (count: number) => `${count} requieren atencion`,
  internal_dashboard_onboarding: (count: number) => `${count} en onboarding`,
  internal_dashboard_inactive: (count: number) => `${count} inactivos`,
  internal_dashboard_create_space: 'Crear space',
  internal_dashboard_export: 'Exportar',
  internal_dashboard_summary: (activeClients: number, invitedUsers: number, lastActivity: string) =>
    `${activeClients} clientes activos. ${invitedUsers} usuarios pendientes de activacion. Ultima actividad: ${lastActivity}.`,
  internal_dashboard_pending_subtitle: 'Usuarios invitados sin login visible',
  internal_dashboard_pending_status_risk: 'Onboarding en riesgo',
  internal_dashboard_pending_status_ok: 'Bajo control',
  internal_dashboard_pending_footer: 'Si supera 80% hay friccion de activacion.',
  internal_dashboard_admins_subtitle: 'Equipo Efeonce con acceso visible',
  internal_dashboard_admins_footer: 'Sin semaforo: sirve como control de cobertura interna.',
  internal_dashboard_spaces_without_activity_subtitle: '0 scopes o sin actividad en los ultimos 30 dias',
  internal_dashboard_spaces_without_activity_status_alert: 'Revisar hoy',
  internal_dashboard_spaces_without_activity_status_clear: 'Sin alertas',
  internal_dashboard_spaces_without_activity_footer: 'Indicador directo de clientes que necesitan intervencion.',
  internal_dashboard_otd_status_empty: 'Sin data',
  internal_dashboard_otd_status_healthy: 'Saludable',
  internal_dashboard_otd_status_watch: 'Bajo observacion',
  internal_dashboard_otd_status_alert: 'Requiere atencion',
  internal_dashboard_otd_footer: (projects: number) =>
    projects > 0 ? `${projects} proyectos con OTD visible.` : 'Sin proyectos con OTD visible todavia.',
  internal_dashboard_create_space_tooltip: 'El flujo de creacion de spaces aun no existe como mutacion dedicada en el repo.',
  internal_dashboard_kpis_error_title: 'No pudimos cargar los indicadores del control tower',
  internal_dashboard_kpis_error_description: 'Reintenta la lectura de la capa ejecutiva en unos segundos.',
  internal_dashboard_table_error_title: 'No pudimos cargar la lista de clientes',
  internal_dashboard_table_error_description: 'Intenta de nuevo. Si persiste, revisa la consulta interna del control tower.',
  internal_dashboard_table_title: 'Clientes',
  internal_dashboard_table_subtitle:
    'Control operativo de spaces con prioridad visual para onboarding trabado, baja activacion y falta de scope.',
  internal_dashboard_table_search_placeholder: 'Buscar por cliente o email',
  internal_dashboard_table_filter_all: 'Todos',
  internal_dashboard_table_filter_active: 'Activos',
  internal_dashboard_table_filter_onboarding: 'Onboarding',
  internal_dashboard_table_filter_attention: 'Requiere atencion',
  internal_dashboard_table_filter_inactive: 'Inactivos',
  internal_dashboard_table_client_header: 'Cliente',
  internal_dashboard_table_status_header: 'Estado',
  internal_dashboard_table_users_header: 'Usuarios',
  internal_dashboard_table_projects_header: 'Proyectos',
  internal_dashboard_table_capabilities_header: 'Modulos',
  internal_dashboard_table_last_activity_header: 'Ultima actividad',
  internal_dashboard_table_actions_header: 'Acciones',
  internal_dashboard_table_no_contact: 'Sin contacto principal',
  internal_dashboard_table_active_users_summary: (active: number, total: number) => `${active} activos / ${total} total`,
  internal_dashboard_table_pending_users_summary: (pending: number) => `${pending} pendientes de activacion`,
  internal_dashboard_table_projects_base: (count: number) => `${count} base`,
  internal_dashboard_table_no_capabilities: 'Sin modulos activos',
  internal_dashboard_table_last_login_recorded: 'Ultimo login registrado',
  internal_dashboard_table_no_login: 'Sin login visible',
  internal_dashboard_table_view: 'Ver',
  internal_dashboard_table_view_detail: 'Ver detalle',
  internal_dashboard_table_view_as_client: 'Ver como cliente',
  internal_dashboard_table_edit: 'Editar',
  internal_dashboard_table_deactivate: 'Desactivar',
  internal_dashboard_table_empty_title: 'Sin clientes configurados.',
  internal_dashboard_table_empty_description: 'Crea tu primer space para comenzar.',
  internal_dashboard_table_empty_filtered_title: 'Sin resultados para este filtro.',
  internal_dashboard_table_empty_filtered_description: 'Prueba con otro filtro o busca por nombre.',

  admin_tenants_chip: 'Gobernanza de spaces',
  admin_tenants_hero_title: 'Administra spaces como empresas, con su postura de acceso, modulos y usuarios asociados.',
  admin_tenants_hero_subtitle:
    'Cada space representa una empresa cliente del portal. Esta vista consolida estado comercial y operativo sin colapsar metadata del cliente con identidad de usuario.',
  admin_tenants_total_spaces: 'Spaces',
  admin_tenants_active_spaces: 'Activos',
  admin_tenants_with_credentials: 'Con credenciales',
  admin_tenants_pending_reset: 'Pendientes reset',
  admin_tenants_with_projects: 'Con proyectos en scope',
  admin_tenants_table_subtitle:
    'Cada fila representa un cliente visible como space. El detalle agrupa usuarios, proyectos visibles, modulos contratados y feature flags activos.',
  admin_tenants_no_record: 'Sin registro',
  admin_tenants_no_contact: 'Sin contacto principal',
  admin_tenants_home_label: 'Home',
  admin_tenants_no_modules: 'Sin modulos activos',
  admin_tenants_features_label: 'Feature flags',
  admin_tenants_updated_label: 'Actualizacion',
  admin_tenants_last_login_label: 'Ultimo login',

  admin_users_total: 'Usuarios',
  admin_users_total_subtitle: 'Usuarios cliente sobre el total visible',
  admin_users_active: 'Activos',
  admin_users_active_subtitle: 'Base operativa con acceso habilitado',
  admin_users_invited: 'Invitados',
  admin_users_invited_subtitle: 'Onboarding pendiente o acceso en curso',
  admin_users_internal: 'Internos',
  admin_users_internal_subtitle: 'Staff Efeonce habilitado en la plataforma',
  admin_users_table_subtitle: 'Usuarios, roles y scopes visibles del portal.',
  admin_users_filters_title: 'Filtros',
  admin_users_filter_role: 'Filtrar rol',
  admin_users_filter_role_all: 'Todos los roles',
  admin_users_filter_tenant: 'Filtrar tipo de space',
  admin_users_filter_tenant_all: 'Todos los spaces',
  admin_users_filter_status: 'Filtrar status',
  admin_users_filter_status_all: 'Todos los status',
  admin_users_search_placeholder: 'Buscar usuario',
  admin_users_export: 'Exportar',
  admin_users_roles_button: 'Roles y permisos',
  admin_users_no_data: 'Sin datos disponibles',
  admin_users_user_header: 'Usuario',
  admin_users_role_header: 'Rol',
  admin_users_space_header: 'Space',
  admin_users_access_header: 'Acceso',
  admin_users_home_header: 'Home',
  admin_users_last_login_header: 'Ultimo login',
  admin_users_actions_header: 'Acciones',
  admin_users_no_role: 'Sin rol',
  admin_users_primary_role: 'Rol primario',
  admin_users_extra_roles: (count: number) => `+${count} roles extra`,
  admin_users_access_detail: (projects: number, routeGroups: number) => `${projects} proyectos · ${routeGroups} route groups`,
  admin_users_tenant_client: 'Cliente',
  admin_users_tenant_internal: 'Efeonce interno',
  admin_users_view: 'Ver',
  admin_users_open_detail: 'Abrir detalle',
  admin_users_open_roles: 'Ir a roles',

  admin_roles_subtitle:
    'Patron Vuexy Roles reinterpretado sobre roles reales de Greenhouse y sus scopes operativos.',
  admin_roles_assigned_summary: (users: number, clients: number) => `${users} usuarios asignados en ${clients} spaces.`,
  admin_roles_matrix_title: 'Matriz de roles actual',
  admin_roles_role_header: 'Rol',
  admin_roles_tenant_type_header: 'Tipo de space',
  admin_roles_route_groups_header: 'Grupos de ruta',
  admin_roles_users_header: 'Usuarios',
  admin_roles_spaces_header: 'Spaces',

  admin_tenant_users_active: 'Activos',
  admin_tenant_users_active_subtitle: 'Con acceso operativo',
  admin_tenant_users_invited: 'Invitados',
  admin_tenant_users_invited_subtitle: 'Pendientes de activacion',
  admin_tenant_users_total: 'Total',
  admin_tenant_users_total_subtitle: 'Usuarios del space',
  admin_tenant_users_title: 'Usuarios del space',
  admin_tenant_users_subtitle: 'Patron Vuexy User Management adaptado a client_users, roles y scopes reales del tenant.',
  admin_tenant_users_search_placeholder: 'Buscar usuario',
  admin_tenant_users_status_label: 'Estado',
  admin_tenant_users_status_all: 'Todos',
  admin_tenant_users_invite: 'Invitar usuario',
  admin_tenant_users_resend: 'Reenviar pendientes',
  admin_tenant_users_no_data: 'No hay usuarios para este filtro.',
  admin_tenant_users_user_header: 'Usuario',
  admin_tenant_users_role_header: 'Rol',
  admin_tenant_users_access_header: 'Acceso',
  admin_tenant_users_scopes_header: 'Scopes',
  admin_tenant_users_last_login_header: 'Ultimo login',
  admin_tenant_users_actions_header: 'Acciones',
  admin_tenant_users_no_role: 'Sin rol',
  admin_tenant_users_extra_roles: (count: number) => `+${count} roles extra`,
  admin_tenant_users_manual_source: 'Manual o interno',
  admin_tenant_users_no_route_groups: 'Sin route groups',
  admin_tenant_users_view: 'Ver',
  admin_tenant_users_resend_invite: 'Reenviar invitacion',
  admin_tenant_users_change_role: 'Cambiar rol',
  admin_tenant_users_deactivate: 'Desactivar',

  // ── Admin User Detail: Header ──
  admin_user_detail_job_title_empty: 'Sin cargo asignado',
  admin_user_detail_avatar_helper: 'PNG, JPG, WEBP o SVG hasta 5 MB. Visible en admin y en la sesion autenticada del usuario.',
  admin_user_detail_resend_onboarding: 'Reenviar onboarding',
  admin_user_detail_review_access: 'Revisar acceso',
  admin_user_detail_member_since: (date: string) => `Activo desde ${date}`,
  admin_user_detail_project_count: (count: number) => `${count} ${count === 1 ? 'proyecto' : 'proyectos'}`,
  admin_user_detail_campaign_count: (count: number) => `${count} ${count === 1 ? 'campana' : 'campanas'}`,

  // ── Admin User Detail: Tabs ──
  admin_user_detail_tab_profile: 'Perfil',
  admin_user_detail_tab_security: 'Seguridad',
  admin_user_detail_tab_organization: 'Organizacion',
  admin_user_detail_tab_roles: 'Roles',
  admin_user_detail_tab_access: 'Accesos',

  // ── Admin User Detail: Tab Accesos ──
  admin_user_access_roles_title: 'Roles asignados',
  admin_user_access_roles_description: 'Roles activos del usuario y los módulos que habilitan.',
  admin_user_access_no_roles: 'Sin roles asignados.',
  admin_user_access_sets_title: 'Sets de permisos',
  admin_user_access_sets_description: 'Conjuntos de vistas adicionales asignados al usuario.',
  admin_user_access_no_sets: 'Sin sets de permisos asignados.',
  admin_user_access_overrides_title: 'Ajustes manuales',
  admin_user_access_overrides_description: 'Vistas otorgadas o revocadas individualmente al usuario.',
  admin_user_access_col_view_code: 'Codigo de vista',
  admin_user_access_col_label: 'Nombre',
  admin_user_access_col_source: 'Origen',
  admin_user_access_effective_title: 'Vistas efectivas',
  admin_user_access_effective_description: 'Todas las vistas a las que tiene acceso este usuario, agrupadas por seccion.',
  admin_user_access_no_views: 'Este usuario no tiene vistas efectivas.',

  // ── Admin User Detail: Tab Perfil — Sobre el usuario (AboutOverview) ──
  admin_user_detail_about_title: 'Sobre el usuario',
  admin_user_detail_section_personal: 'Informacion personal',
  admin_user_detail_section_contact: 'Contacto',
  admin_user_detail_section_identifiers: 'Identificadores',
  admin_user_detail_label_name: 'Nombre completo:',
  admin_user_detail_label_email: 'Correo electronico:',
  admin_user_detail_label_job_title: 'Cargo:',
  admin_user_detail_label_username: 'Usuario:',
  admin_user_detail_label_status: 'Estado:',
  admin_user_detail_label_timezone: 'Zona horaria:',
  admin_user_detail_label_locale: 'Idioma:',
  admin_user_detail_label_public_id: 'ID de colaborador:',
  admin_user_detail_label_identity_id: 'EO-ID:',
  admin_user_detail_no_job_title: 'Sin cargo asignado',
  admin_user_detail_no_timezone: 'No configurada',
  admin_user_detail_no_locale: 'No configurado',

  // ── Admin User Detail: Tab Perfil — Actividad y alcance ──
  admin_user_detail_activity_title: 'Actividad reciente',
  admin_user_detail_scope_title: 'Alcance operativo',
  admin_user_detail_campaign_context_title: 'Campanas asignadas',
  admin_user_detail_campaign_context_description: (count: number) =>
    count === 0
      ? 'Este usuario no tiene campanas asignadas.'
      : `Este usuario tiene acceso a ${count} ${count === 1 ? 'campana' : 'campanas'}.`,
  admin_user_detail_no_campaign_scopes: 'Sin campanas asignadas.',

  // ── Admin User Detail: Tab Seguridad ──
  admin_user_detail_auth_title: 'Perfil de autenticacion',
  admin_user_detail_auth_description: 'Configuracion de acceso y metodo de autenticacion del usuario.',
  admin_user_detail_label_auth_mode: 'Metodo de autenticacion:',
  admin_user_detail_label_password_algorithm: 'Algoritmo:',
  admin_user_detail_label_last_login: 'Ultimo acceso:',
  admin_user_detail_label_invited_at: 'Fecha de invitacion:',
  admin_user_detail_no_password_algorithm: 'No disponible',
  admin_user_detail_never_logged_in: 'Nunca ha iniciado sesion',
  admin_user_detail_not_invited: 'Sin invitacion registrada',

  admin_user_detail_roles_overview_title: 'Roles y permisos',
  admin_user_detail_roles_overview_description:
    'Vista rapida de los roles asignados y los modulos habilitados. Para modificar roles, ve a la pestana Roles.',
  admin_user_detail_no_roles: 'Sin roles asignados.',
  admin_user_detail_route_groups: 'Modulos habilitados',
  admin_user_detail_no_route_groups: 'Sin modulos habilitados.',

  admin_user_detail_audit_title: 'Auditoria',
  admin_user_detail_audit_description: 'Fechas de creacion y ultima actualizacion del registro.',
  admin_user_detail_label_created: 'Fecha de creacion:',
  admin_user_detail_label_updated: 'Ultima actualizacion:',

  // ── Admin User Detail: Tab Organizacion ──
  admin_user_detail_tenant_title: 'Relacion con el tenant',
  admin_user_detail_tenant_description: 'Datos de la organizacion y el espacio al que pertenece este usuario.',
  admin_user_detail_label_client: 'Organizacion:',
  admin_user_detail_label_contact: 'Contacto principal:',
  admin_user_detail_label_hubspot: 'HubSpot:',
  admin_user_detail_label_space_id: 'Space ID:',
  admin_user_detail_label_internal_key: 'Clave interna:',
  admin_user_detail_label_tenant_type: 'Tipo de tenant:',
  admin_user_detail_no_contact: 'Sin contacto registrado',
  admin_user_detail_no_hubspot: 'Sin integracion HubSpot',

  admin_user_detail_features_title: 'Funcionalidades activas',
  admin_user_detail_features_description:
    'Modulos y funcionalidades habilitadas para el tenant de este usuario. Los flags controlan la experiencia dentro del portal.',
  admin_user_detail_feature_flags: 'Feature flags',
  admin_user_detail_no_feature_flags: 'Sin funcionalidades especiales activadas.',
  admin_user_detail_label_home: 'Pagina de inicio del portal:',

  admin_user_detail_commercial_title: 'Preparacion comercial',
  admin_user_detail_commercial_description:
    'Contexto comercial del cliente. Este espacio se habilitara con la integracion de facturacion y planes contratados.',
  admin_user_detail_commercial_chip: 'Contexto comercial',
  admin_user_detail_commercial_pending: 'Pendiente',
  admin_user_detail_commercial_ready: 'Conectado',
  admin_user_detail_commercial_readiness: 'Preparacion comercial',
  admin_user_detail_commercial_readiness_value: (hasContact: boolean) => hasContact ? '65%' : '35%',

  admin_user_detail_resend_onboarding_success: 'Invitacion de onboarding reenviada.',
  admin_user_detail_resend_onboarding_error: 'No se pudo reenviar la invitacion.',
  admin_user_detail_resend_onboarding_not_eligible: 'Este usuario no es elegible para reenvio de onboarding.',

  // Cross-links Person 360
  admin_user_detail_link_people: 'Ver perfil operativo',
  people_detail_link_admin: 'Ver acceso y permisos',

  admin_tenant_preview_title: 'Ver como cliente',
  admin_tenant_preview_subtitle: (clientName: string) =>
    `Estas viendo el dashboard del space cliente ${clientName} desde tu sesion de administrador.`,
  admin_tenant_preview_back: 'Volver al space',
  admin_tenant_preview_spaces: 'Ir a spaces',

  admin_tenant_detail_header_summary:
    'Estado completo de la cuenta: modulos, usuarios, CRM y visibilidad operativa del space en una sola vista.',
  admin_tenant_detail_header_meta: (publicId: string, hubspotCompanyId: string | null, timezone: string | null, fetchedAt: string) =>
    `Space ID ${publicId}  |  CRM ${hubspotCompanyId || '--'}  |  Timezone ${timezone || '--'}  |  Ultima lectura HubSpot ${fetchedAt}`,
  admin_tenant_detail_logo_helper: 'PNG, JPG, WEBP o SVG hasta 5 MB. Visible en admin, internal y superficies autenticadas del space.',
  admin_tenant_detail_view_as_client: 'Ver como cliente',
  admin_tenant_detail_save_manual: 'Guardar seleccion manual',
  admin_tenant_detail_refresh_hubspot: 'Refrescar lectura HubSpot',
  admin_tenant_detail_open_preview: 'Abrir preview cliente',
  admin_tenant_detail_deactivate_space: 'Desactivar space',
  admin_tenant_detail_kpi_users: 'Usuarios',
  admin_tenant_detail_kpi_users_subtitle: (invited: number) => `${invited} invitados pendientes`,
  admin_tenant_detail_kpi_business_lines: 'Business lines',
  admin_tenant_detail_kpi_business_lines_subtitle: 'Activas para este space',
  admin_tenant_detail_kpi_projects: 'Proyectos',
  admin_tenant_detail_kpi_projects_subtitle: (count: number) => `${count} detectados en Notion`,
  admin_tenant_detail_kpi_modules: 'Service modules',
  admin_tenant_detail_kpi_modules_subtitle: 'Habilitados en governance',

  admin_tenant_capabilities_business_lines_title: 'Business lines',
  admin_tenant_capabilities_business_lines_subtitle:
    'Familias comerciales activas del space con color operativo y origen de asignacion.',
  admin_tenant_capabilities_service_modules_title: 'Service modules',
  admin_tenant_capabilities_service_modules_subtitle:
    'Tabla compacta de modulos activos o disponibles para este tenant, con sorting y filtro local.',
  admin_tenant_capabilities_feature_flags_title: 'Feature flags',
  admin_tenant_capabilities_feature_flags_empty: 'Sin feature flags activos.',
  admin_tenant_capabilities_company_record: 'Registro de empresa',
  admin_tenant_capabilities_company_record_empty: 'Sin company mapping',
  admin_tenant_capabilities_edit_title: 'Editar governance manual',
  admin_tenant_capabilities_edit_subtitle:
    'Mantiene la logica actual de precedencia manual vs sync externo, pero ahora dentro del tab correcto.',
  admin_tenant_capability_state_active: 'Activo',
  admin_tenant_capability_state_available: 'Disponible',
  admin_tenant_capability_description_empty: 'Sin descripcion operativa',
  admin_tenant_service_modules_search: 'Buscar modulo',
  admin_tenant_service_modules_active_count: (count: number) => `${count} activos`,
  admin_tenant_service_modules_empty: 'Sin service modules registrados para este filtro',
  admin_tenant_service_modules_header_module: 'Modulo',
  admin_tenant_service_modules_header_code: 'Codigo',
  admin_tenant_service_modules_header_family: 'Familia',
  admin_tenant_service_modules_header_state: 'Estado',
  admin_tenant_service_modules_header_updated: 'Actualizado',
  admin_tenant_service_modules_no_date: 'Sin fecha',

  admin_tenant_governance_eyebrow: 'Capability governance',
  admin_tenant_governance_title: 'Capabilities activas del space',
  admin_tenant_governance_subtitle:
    'Define que lineas de negocio y modulos quedan habilitados para este cliente. Admin fija el estado operativo y las integraciones externas solo pueden actualizarlo si envian payload explicito desde el registro de empresa.',
  admin_tenant_governance_business_lines_active: 'Business lines activas',
  admin_tenant_governance_service_modules_active: 'Service modules activos',
  admin_tenant_governance_company_record: 'Registro de empresa',
  admin_tenant_governance_ready: 'Listo',
  admin_tenant_governance_pending: 'Pendiente',
  admin_tenant_governance_rule_button: 'Regla de precedencia manual',
  admin_tenant_governance_rule_body:
    'La edicion manual tiene precedencia. La sincronizacion externa se admite via API con `businessLines` y `serviceModules` explicitos; no se deriva desde deals.',
  admin_tenant_governance_business_lines_title: 'Business lines',
  admin_tenant_governance_business_lines_subtitle:
    'Activa solo las familias comerciales que deben estar disponibles en este tenant.',
  admin_tenant_governance_service_modules_title: 'Service modules',
  admin_tenant_governance_service_modules_subtitle:
    'Habilita los modulos concretos que el space puede usar y reportar.',
  admin_tenant_governance_company_mapping_empty: 'Sin company mapping',
  admin_tenant_governance_company_mapping_with_id:
    'Las integraciones externas deben sincronizar capabilities desde el objeto empresa.',
  admin_tenant_governance_company_mapping_without_id:
    'Sin una empresa asociada, este tenant solo puede gobernarse manualmente desde admin.',
  admin_tenant_governance_tenant_label: (clientId: string) => `Tenant: ${clientId}`,
  admin_tenant_governance_save: 'Guardar seleccion manual',
  admin_tenant_governance_save_error: 'No pudimos guardar las capabilities del tenant.',
  admin_tenant_governance_save_success: 'Capabilities guardadas desde admin.',
  admin_tenant_governance_source_controlled: 'Controlled',
  admin_tenant_governance_source_admin_off: 'Admin off',
  admin_tenant_governance_source_hubspot: 'HubSpot',
  admin_tenant_governance_source_hubspot_off: 'HubSpot off',
  admin_tenant_governance_source_active: 'Active',
  admin_tenant_governance_source_available: 'Available',

  admin_tenant_crm_no_contacts: 'No habia contactos CRM por provisionar.',
  admin_tenant_crm_provision_error_partial: (processed: number, total: number) =>
    `No pudimos completar el provisioning de contactos CRM. Se procesaron ${processed} de ${total} contactos antes del corte.`,
  admin_tenant_crm_provision_error:
    'No pudimos completar el provisioning de contactos CRM. Reintenta en unos segundos.',
  admin_tenant_crm_config_title: 'Configuracion comercial',
  admin_tenant_crm_config_subtitle: 'Contexto compacto del registro comercial y la relacion actual con HubSpot.',
  admin_tenant_crm_business_lines: 'Business lines',
  admin_tenant_crm_business_lines_empty: 'Sin business lines.',
  admin_tenant_crm_service_modules: 'Service modules',
  admin_tenant_crm_service_modules_empty: 'Sin service modules.',
  admin_tenant_crm_lifecycle: 'Lifecycle',
  admin_tenant_crm_lifecycle_empty: 'Sin lifecycle',
  admin_tenant_crm_live_ok: 'Lectura live de HubSpot operativa para company, owner y contactos asociados.',
  admin_tenant_crm_retry_live: 'Reintentar lectura live',
  admin_tenant_crm_contacts_title: 'Contactos CRM',
  admin_tenant_crm_contacts_subtitle: 'Lectura live de HubSpot reconciliada contra los accesos reales del space.',
  admin_tenant_crm_chip_hubspot: (count: number) => `${count} en HubSpot`,
  admin_tenant_crm_chip_reconciled: (count: number) => `${count} reconciliados`,
  admin_tenant_crm_chip_pending: (count: number) => `${count} pendientes`,
  admin_tenant_crm_chip_ambiguous: (count: number) => `${count} ambiguos`,
  admin_tenant_crm_chip_no_email: (count: number) => `${count} sin email`,
  admin_tenant_crm_provision_action: (count: number) => `Provisionar ${count}`,
  admin_tenant_crm_provision_progress: (processed: number, total: number) => `Provisionando ${processed}/${total}`,
  admin_tenant_crm_provision_info:
    'Provisionar crea o reconcilia accesos `invited` en `greenhouse.client_users` con rol base `client_executive`.',
  admin_tenant_crm_provision_batches: (size: number) => `Los lotes se ejecutan de a ${size} contactos por request.`,
  admin_tenant_crm_reconciliation_warning:
    'Hay brechas de reconciliacion que conviene resolver antes de nuevas invitaciones.',
  admin_tenant_crm_batch_progress: (current: number, total: number, processed: number, contacts: number) =>
    `Ejecutando lote ${current} de ${total}. Procesados ${processed} de ${contacts} contactos.`,
  admin_tenant_crm_empty_load_title: 'No pudimos cargar los contactos CRM',
  admin_tenant_crm_empty_load_description:
    'La lectura live de HubSpot devolvio una incidencia. Reintenta la consulta antes de provisionar contactos.',
  admin_tenant_crm_empty_no_contacts_title: 'No hay contactos asociados en HubSpot',
  admin_tenant_crm_empty_no_contacts_description:
    'Este space no tiene contactos company-level visibles en la lectura actual. Reintenta o revisa la asociacion CRM.',
  admin_tenant_crm_sync_now: 'Sincronizar ahora',
  admin_tenant_crm_tab_contact: 'Contacto',
  admin_tenant_crm_tab_body: 'Cuerpo',
  admin_tenant_crm_tab_cycle: 'Ciclo',
  admin_tenant_crm_tab_provider: 'Proveedor',
  admin_tenant_crm_header_contact: 'Contacto',
  admin_tenant_crm_header_channels: 'Canales',
  admin_tenant_crm_header_role: 'Cargo',
  admin_tenant_crm_header_cycle: 'Ciclo',
  admin_tenant_crm_header_provider: 'Proveedor',
  admin_tenant_crm_header_user: 'Usuario Greenhouse',
  admin_tenant_crm_header_status: 'Estado',
  admin_tenant_crm_status_ambiguous: 'Ambiguo',
  admin_tenant_crm_status_provisioned: 'Provisionado',
  admin_tenant_crm_status_pending: 'Pendiente',
  admin_tenant_crm_status_no_email: 'Sin email',
  admin_tenant_crm_phone_empty: 'Sin telefono',
  admin_tenant_crm_company_empty: 'Sin company',
  admin_tenant_crm_job_empty: 'Sin cargo',
  admin_tenant_crm_lead_stage_empty: 'Sin lifecycle',
  admin_tenant_crm_lead_status_empty: 'Sin lead status',
  admin_tenant_crm_exact_match: 'Match exacto HubSpot',
  admin_tenant_crm_reconciled_email: 'Reconciliacion por email',
  admin_tenant_crm_expected_id: (publicId: string) => `ID esperado: ${publicId}`,
  admin_tenant_crm_reconciled_label_exact: 'Match exacto HubSpot',
  admin_tenant_crm_reconciled_label_email: 'Reconciliado por email',
  admin_tenant_crm_no_access: 'Aun no existe acceso Greenhouse para este contacto.',
  admin_tenant_crm_hubspot_read_title: 'Lectura HubSpot',
  admin_tenant_crm_hubspot_read_subtitle:
    'Detalle tecnico y operativo del sync bajo demanda. Colapsado por defecto para no contaminar la lectura principal.',
  admin_tenant_crm_company_profile: 'Company profile',
  admin_tenant_crm_company_profile_empty: 'Sin lectura live',
  admin_tenant_crm_owner: 'Owner',
  admin_tenant_crm_owner_empty: 'Sin owner asignado',
  admin_tenant_crm_sync: 'Sync',
  admin_tenant_crm_sync_connected: 'Servicio conectado',
  admin_tenant_crm_sync_disconnected: 'Servicio no configurado',
  admin_tenant_crm_last_read: (value: string) => `Ultima lectura: ${value}`,
  admin_tenant_crm_base_url: (value: string) => `Base URL: ${value}`,

  admin_tenant_projects_title: 'Visibilidad de proyectos',
  admin_tenant_projects_subtitle: 'Proyectos visibles en scope para este space y su cobertura actual.',
  admin_tenant_projects_add: 'Agregar proyecto al scope',
  admin_tenant_projects_empty_title: 'No hay proyectos visibles en scope',
  admin_tenant_projects_empty_description:
    'Este space aun no tiene proyectos conectados a la visibilidad del tenant o no existen scopes activos.',
  admin_tenant_projects_users: (count: number) => `${count} usuarios`,
  admin_tenant_projects_open_source: 'Abrir origen en Notion',
  admin_tenant_projects_header_project: 'Proyecto',
  admin_tenant_projects_header_id: 'ID',
  admin_tenant_projects_header_users: 'Usuarios asignados',
  admin_tenant_projects_header_state: 'Estado',
  admin_tenant_projects_state_scoped: 'Scoped',

  admin_tenant_settings_identity_title: 'Identidad del space',
  admin_tenant_settings_label_space_id: 'Space ID',
  admin_tenant_settings_label_internal_key: 'Internal key',
  admin_tenant_settings_label_hubspot: 'HubSpot company',
  admin_tenant_settings_label_home: 'Portal home',
  admin_tenant_settings_label_timezone: 'Timezone',
  admin_tenant_settings_access_title: 'Estado de acceso',
  admin_tenant_settings_active_users: 'Usuarios activos',
  admin_tenant_settings_active_users_subtitle: (count: number) => `${count} invitados`,
  admin_tenant_settings_scoped_projects: 'Proyectos scoped',
  admin_tenant_settings_scoped_projects_subtitle: (count: number) => `${count} detectados`,
  admin_tenant_settings_company_record_title: 'Registro de empresa',
  admin_tenant_settings_company_connected: 'Integrado con HubSpot',
  admin_tenant_settings_company_disconnected: 'Sin integracion activa',
  admin_tenant_settings_live_sync: 'Ultima sync live',
  admin_tenant_settings_tenant_updated: 'Ultima actualizacion del tenant',
  admin_tenant_settings_created: 'Creado',
  admin_tenant_settings_notes_title: 'Notas operativas',
  admin_tenant_settings_notes_empty: 'Sin nota operativa registrada para este space.',
  admin_tenant_settings_notes_helper: 'La mutacion de notas internas aun no esta expuesta en esta superficie.',

  admin_tenant_tabs_capabilities: 'Capabilities',
  admin_tenant_tabs_users: 'Usuarios',
  admin_tenant_tabs_crm: 'CRM',
  admin_tenant_tabs_projects: 'Proyectos',
  admin_tenant_tabs_notion: 'Notion',
  admin_tenant_tabs_settings: 'Configuracion',
  admin_tenant_error_title: 'No pudimos renderizar esta seccion',
  admin_tenant_error_description:
    'Reintenta la carga. Si el problema persiste, revisa la integracion o el payload de este space.',
  admin_tenant_error_retry: 'Reintentar',
  admin_media_upload_cta: 'Subir imagen',
  admin_media_upload_replace: 'Cambiar imagen',
  admin_media_upload_progress: 'Guardando imagen...',
  admin_media_upload_success: 'Imagen guardada.',
  admin_media_upload_error: 'No pudimos guardar la imagen. Reintenta en unos segundos.',
  admin_media_upload_invalid_type: 'Selecciona un PNG, JPG, WEBP o SVG.',
  admin_media_upload_invalid_size: 'La imagen supera 5 MB.'
} as const

export const GH_COLORS = {
  role: {
    account: {
      source: '#023c70',
      bg: '#eaeff3',
      bgHover: '#d9e1e9',
      text: '#023c70',
      textDark: '#012a4e'
    },
    operations: {
      source: '#024c8f',
      bg: '#eaf0f6',
      bgHover: '#d9e4ee',
      text: '#024c8f',
      textDark: '#013564'
    },
    strategy: {
      source: '#633f93',
      bg: '#f2eff6',
      bgHover: '#e7e2ee',
      text: '#633f93',
      textDark: '#452c66'
    },
    design: {
      source: '#bb1954',
      bg: '#f9ecf1',
      bgHover: '#f4dce5',
      text: '#bb1954',
      textDark: '#82113a'
    },
    development: {
      source: '#0375db',
      bg: '#eaf3fc',
      bgHover: '#d9eaf9',
      text: '#0375db',
      textDark: '#025199'
    },
    media: {
      source: '#ff6500',
      bg: '#fff2ea',
      bgHover: '#ffe7d8',
      text: '#ff6500',
      textDark: '#b24600'
    }
  },

  semaphore: {
    green: { source: '#6ec207', bg: '#f3faeb', text: '#6ec207' },
    yellow: { source: '#ff6500', bg: '#fff2ea', text: '#ff6500' },
    red: { source: '#bb1954', bg: '#f9ecf1', text: '#bb1954' }
  },

  /**
   * @deprecated Use theme.palette.{success,warning,error,info} instead.
   * Kept temporarily for backwards compat — will be removed when all consumers migrate.
   * See GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md §3.2
   */
  semantic: {
    success: { source: '#6ec207', bg: '#f3faeb', text: '#6ec207' },
    warning: { source: '#ff6500', bg: '#fff2ea', text: '#ff6500' },
    danger: { source: '#bb1954', bg: '#f9ecf1', text: '#bb1954' },
    info: { source: '#0375db', bg: '#eaf3fc', text: '#0375db' }
  },

  brand: {
    midnightNavy: '#022a4e',
    greenhouseGreen: '#1B7A4E',
    leaf: '#4CAF6E',
    coreBlue: '#0375db',
    softBlue: '#85B7EB'
  },

  /**
   * @deprecated Use theme.palette equivalents instead:
   *   textPrimary  → theme.palette.customColors.midnight
   *   textSecondary → theme.palette.text.secondary
   *   border       → theme.palette.customColors.lightAlloy
   *   bgSurface    → theme.palette.background.default
   * See GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md §4.2
   */
  neutral: {
    textPrimary: '#022a4e',
    textSecondary: '#667085',
    border: '#dbdbdb',
    bgSurface: '#F8F9FA'
  },

  service: {
    globe: { source: '#bb1954', bg: '#f9ecf1', text: '#bb1954' },
    efeonce_digital: { source: '#023c70', bg: '#eaeff3', text: '#023c70' },
    reach: { source: '#ff6500', bg: '#fff2ea', text: '#ff6500' },
    wave: { source: '#0375db', bg: '#eaf3fc', text: '#0375db' },
    crm_solutions: { source: '#633f93', bg: '#f2eff6', text: '#633f93' }
  },

  chart: {
    primary: '#0375db',
    secondary: '#024c8f',
    success: '#6ec207',
    warning: '#ff6500',
    error: '#bb1954',
    info: '#023c70',
    neutral: '#dbdbdb'
  },

  cscPhase: {
    planning:   { source: '#633f93', bg: '#f2eff6', text: '#633f93' },
    briefing:   { source: '#024c8f', bg: '#eaf0f6', text: '#024c8f' },
    production: { source: '#bb1954', bg: '#f9ecf1', text: '#bb1954' },
    approval:   { source: '#ff6500', bg: '#fff2ea', text: '#ff6500' },
    assetMgmt:  { source: '#0375db', bg: '#eaf3fc', text: '#0375db' },
    activation: { source: '#023c70', bg: '#eaeff3', text: '#023c70' },
    completed:  { source: '#6ec207', bg: '#f3faeb', text: '#6ec207' }
  },

  /** Capability module brand palettes (admin/tenant context). Distinct from service (operational context). */
  capability: {
    globe:  { accent: '#7C3AED', soft: 'rgba(124,58,237,0.12)', contrast: '#F5F3FF' },
    reach:  { accent: '#4F46E5', soft: 'rgba(79,70,229,0.12)',  contrast: '#EEF2FF' },
    wave:   { accent: '#0891B2', soft: 'rgba(8,145,178,0.12)',  contrast: '#ECFEFF' },
    crm:    { accent: '#FF7A59', soft: 'rgba(255,122,89,0.14)', contrast: '#FFF7F4' },
    core:   { accent: '#1E3A5F', soft: 'rgba(30,58,95,0.12)',   contrast: '#EFF6FF' }
  }
} as const

export const GH_COMPENSATION = {
  baseSalary: { label: 'Salario base' },
  connectivityBonus: { label: 'Bono conectividad' },
  bonusOtd: { label: 'Bono On-Time' },
  bonusRpa: { label: 'Bono RpA' },
  bonusHelperText: 'Monto al 100% de cumplimiento'
} as const

// ─── Payroll Projected View — domain aria-labels ───────────────────────────
//
// aria-labels parametrizados específicos del flujo de nómina proyectada.
// Genérico vive en src/lib/copy aria.previousMonth/nextMonth; estos son
// dominio Payroll y combinan acción + período mensual.
export const GH_PAYROLL_PROJECTED_ARIA = {
  promoteToOfficial: ({ hasOfficial, monthLabel, year }: { hasOfficial: boolean; monthLabel: string; year: number }) =>
    hasOfficial
      ? `Recalcular nómina oficial para ${monthLabel} ${year}`
      : `Crear borrador oficial para ${monthLabel} ${year}`
} as const

// ─── Nexa Insights Namespace ──────────────────────────────────────────────

export const GH_NEXA = {
  // Branding
  brand: 'Nexa',
  brand_full: 'Nexa Insights',
  disclaimer: 'Generado por Nexa con IA. Verifica la información antes de actuar.',

  // Insights block
  insights_title: 'Nexa Insights',
  insights_subtitle: 'Señales operativas analizadas por Nexa',
  insights_chip_ready: 'Análisis listo',
  insights_chip_partial: 'Análisis parcial',
  insights_chip_failed: 'Sin análisis',
  insights_chip_no_data: 'Sin datos',
  insights_list_title: 'Señales recientes',
  insights_action_label: 'Acción sugerida',
  insights_root_cause_label: 'Causa raíz',
  insights_root_cause_expand: 'Ver causa raíz',
  insights_root_cause_collapse: 'Ocultar causa raíz',
  insights_last_analysis: (label: string) => `Último análisis: ${label}`,

  // View mode toggle (Recientes vs Historial)
  insights_view_mode_aria: 'Modo de visualización',
  insights_view_mode_recent: 'Recientes',
  insights_view_mode_timeline: 'Historial',
  insights_timeline_title: 'Historial de señales',
  insights_timeline_subtitle: (n: number) => `${n} ${n === 1 ? 'señal registrada' : 'señales registradas'}`,
  insights_timeline_empty_title: 'Aún no hay señales analizadas',
  insights_timeline_empty_description:
    'Cuando Nexa procese nuevas señales, aparecerán aquí ordenadas por fecha.',
  insights_timeline_day_today: 'Hoy',
  insights_timeline_day_yesterday: 'Ayer',
  insights_timeline_time_at: (label: string) => `a las ${label}`,

  // KPIs
  kpi_analyzed: 'Señales analizadas',
  kpi_analyzed_tooltip: 'Señales del ICO Engine que Nexa analizó este período',
  kpi_analyzed_subtitle: (n: number) => `${n} señal${n !== 1 ? 'es' : ''} este período`,
  kpi_actionable: 'Con acción sugerida',
  kpi_actionable_tooltip: 'Señales donde Nexa identificó una acción concreta',
  kpi_actionable_subtitle: (n: number, total: number) => `${n} de ${total} señales`,

  // Signal types
  signal_type: {
    anomaly: 'Anomalía',
    prediction: 'Predicción',
    root_cause: 'Causa raíz',
    recommendation: 'Recomendación'
  } as Record<string, string>,

  // Severity colors
  severity_color: {
    critical: 'error',
    warning: 'warning',
    info: 'info'
  } as Record<string, 'error' | 'warning' | 'info' | 'secondary'>,

  // Run status
  run_status: {
    succeeded: 'Análisis listo',
    partial: 'Análisis parcial',
    failed: 'Sin análisis'
  } as Record<string, string>,

  run_status_color: {
    succeeded: 'success',
    partial: 'warning',
    failed: 'error'
  } as Record<string, 'success' | 'warning' | 'error'>,

  // Empty state
  empty_title: 'Aún no hay señales analizadas',
  empty_description: 'Nexa analiza automáticamente las señales del ICO Engine después de cada sincronización. Las señales aparecerán aquí cuando estén listas.'
} as const

/* ─────────────────── Skills & Certifications ─────────────────── */

export const GH_SKILLS_CERTS = {
  tab_label: 'Skills y certificaciones',
  tab_label_short: 'Skills',

  // Section headings
  section_skills: 'Skills',
  section_tools: 'Herramientas',
  section_certifications: 'Certificaciones',
  section_languages: 'Idiomas',
  section_professional_links: 'Links profesionales',
  section_about_me: 'Sobre mí',
  section_headline: 'Titular profesional',
  section_contact: 'Contacto',

  // Skills
  skill_add: 'Agregar skill',
  skill_edit: 'Editar skill',
  skill_remove: 'Eliminar skill',
  skill_seniority: 'Nivel',
  skill_category: 'Categoría',
  skill_status_self_declared: 'Autodeclarada',
  skill_status_verified: 'Verificada',
  skill_visibility_internal: 'Interna',
  skill_visibility_client: 'Visible para cliente',

  // Certifications
  cert_add: 'Agregar certificación',
  cert_edit: 'Editar certificación',
  cert_remove: 'Eliminar certificación',
  cert_issuer: 'Emisor',
  cert_issued_date: 'Fecha de emisión',
  cert_expiry_date: 'Fecha de vencimiento',
  cert_validation_url: 'Link de validación',
  cert_view: 'Ver certificado',
  cert_upload: 'Subir evidencia',
  cert_upload_helper: 'PDF, JPG, PNG o WebP. Máximo 10 MB.',
  cert_status_self_declared: 'Autodeclarada',
  cert_status_pending_review: 'Por revisar',
  cert_status_verified: 'Verificada',
  cert_status_rejected: 'Rechazada',
  cert_expired: 'Vencida',

  // Verification
  verify_action: 'Verificar',
  unverify_action: 'Quitar verificación',
  reject_action: 'Rechazar',
  verified_badge_label: 'Verificado por Efeonce',
  verification_date: 'Verificado el',

  // Links
  link_linkedin: 'LinkedIn',
  link_portfolio: 'Portfolio',
  link_twitter: 'X / Twitter',
  link_threads: 'Threads',
  link_behance: 'Behance',
  link_github: 'GitHub',
  link_dribbble: 'Dribbble',

  // Tools
  tool_add: 'Agregar herramienta',
  tool_edit: 'Editar herramienta',
  tool_remove: 'Eliminar herramienta',
  tool_proficiency: 'Dominio',
  tool_proficiency_beginner: 'Basico',
  tool_proficiency_intermediate: 'Intermedio',
  tool_proficiency_advanced: 'Avanzado',
  tool_proficiency_expert: 'Experto',

  // Languages
  lang_add: 'Agregar idioma',
  lang_edit: 'Editar idioma',
  lang_remove: 'Eliminar idioma',
  lang_proficiency: 'Nivel',
  lang_proficiency_basic: 'Basico',
  lang_proficiency_conversational: 'Conversacional',
  lang_proficiency_professional: 'Profesional',
  lang_proficiency_fluent: 'Fluido',
  lang_proficiency_native: 'Nativo',

  // Headline
  headline_placeholder: 'Ej: Senior UX Designer | Motion & Brand',

  // About me
  about_me_placeholder: 'Describe tu perfil profesional, especialidades y experiencia relevante.',

  // Summary counters
  summary_skills: (n: number) => `${n} skill${n === 1 ? '' : 's'}`,
  summary_certs_active: (n: number) => `${n} certificación${n === 1 ? '' : 'es'} activa${n === 1 ? '' : 's'}`,
  summary_verified: (n: number) => `${n} verificada${n === 1 ? '' : 's'}`,
  summary_expiring_soon: (n: number) => `${n} por vencer`,

  // Summary counters (tools + languages)
  summary_tools: (n: number) => `${n} herramienta${n === 1 ? '' : 's'}`,
  summary_languages: (n: number) => `${n} idioma${n === 1 ? '' : 's'}`,

  // Empty states
  empty_skills_title: 'Sin skills registradas',
  empty_skills_description: 'Agrega tus capacidades profesionales para que sean visibles en tu perfil.',
  empty_tools_title: 'Sin herramientas registradas',
  empty_tools_description: 'Agrega las herramientas y plataformas que dominas.',
  empty_certs_title: 'Sin certificaciones',
  empty_certs_description: 'Agrega tus certificaciones profesionales y sube la evidencia para que puedan ser verificadas.',
  empty_languages_title: 'Sin idiomas registrados',
  empty_languages_description: 'Agrega los idiomas que dominas y tu nivel de competencia.',
  empty_links_title: 'Sin links profesionales',
  empty_links_description: 'Agrega tus perfiles en plataformas profesionales.',
  empty_about_me: 'Aún no has escrito tu biografía profesional.',

  // Evidence
  section_evidence: 'Evidencia y portafolio',
  evidence_add: 'Agregar evidencia',
  evidence_view: 'Ver',
  evidence_remove: 'Eliminar evidencia',
  evidence_type_project_highlight: 'Proyecto',
  evidence_type_work_sample: 'Muestra',
  evidence_type_case_study: 'Caso',
  evidence_type_publication: 'Publicación',
  evidence_type_award: 'Premio',
  evidence_type_other: 'Otro',
  empty_evidence_title: 'Sin evidencia registrada',
  empty_evidence_description: 'Agrega proyectos, casos o muestras de trabajo para enriquecer tu perfil.',

  // Evidence dialog
  evidence_dialog_title: 'Agregar evidencia',
  evidence_field_title: 'Título',
  evidence_field_description: 'Descripción',
  evidence_field_type: 'Tipo de evidencia',
  evidence_field_skill: 'Skill relacionada',
  evidence_field_tool: 'Herramienta relacionada',
  evidence_field_url: 'URL externa',
  evidence_field_url_placeholder: 'https://...',

  // Endorsements
  section_endorsements: 'Endorsements',
  endorsement_empty_title: 'Sin endorsements',
  endorsement_empty_description: 'Tus colegas pueden respaldar tus skills y herramientas.',
  endorsement_moderate: 'Moderar',
  endorsement_remove: 'Eliminar',

  // Summary (evidence + endorsements)
  summary_evidence: (n: number) => `${n} evidencia${n === 1 ? '' : 's'}`,
  summary_endorsements: (n: number) => `${n} endorsement${n === 1 ? '' : 's'}`
} as const

/* ─────────────────── Talent Discovery ─────────────────── */

export const GH_TALENT_DISCOVERY = {
  page_title: 'Descubrimiento de talento',
  page_subtitle: 'Busca y filtra personas por skills, herramientas, certificaciones e idiomas',

  // Search & filters
  search_placeholder: 'Buscar por nombre, cargo o titular...',
  filter_skills: 'Skills',
  filter_tools: 'Herramientas',
  filter_verification: 'Verificación',
  filter_sort: 'Ordenar por',

  // Sort options
  sort_relevance: 'Relevancia',
  sort_availability: 'Mayor disponibilidad',
  sort_verified: 'Más verificados',

  // Verification filter options
  verification_all: 'Todos',
  verification_only_verified: 'Solo verificados',
  verification_with_verifications: 'Con verificaciones',

  // Summary cards
  summary_total: 'Total personas',
  summary_verified: 'Con skills verificadas',
  summary_availability: 'Disponibilidad promedio',
  summary_categories: 'Categorías',

  // Card labels
  card_available: 'disponibles',
  card_skills: 'skills',
  card_tools: 'herramientas',
  card_certifications: 'certificaciones',
  card_languages: 'idiomas',
  card_view_profile: 'Ver perfil',

  // Discovery score
  score_label: 'Score',

  // Empty state
  empty_title: 'No se encontraron personas con los filtros aplicados',
  empty_description: 'Ajusta los filtros o amplía tu búsqueda para encontrar talento.',

  // Loading
  loading: 'Cargando talento...',

  // Error
  error_message: 'No pudimos cargar los datos de talento. Verifica tu conexión e intenta de nuevo.'
} as const

/* ─────────────────── Client Talent Profile ─────────────────── */

export const GH_CLIENT_TALENT = {
  // Dialog / actions
  btn_view_profile: 'Ver perfil profesional',
  dialog_title: 'Perfil profesional verificado',
  empty_no_profile: 'Sin perfil profesional disponible',

  // Counter labels
  label_verified_items: 'habilidades verificadas',
  label_certifications: 'certificaciones activas',
  label_tools: 'herramientas',

  // Section headings (inside dossier)
  section_about_me: 'Sobre mi',
  section_skills: 'Habilidades',
  section_tools: 'Herramientas',
  section_certifications: 'Certificaciones',
  section_languages: 'Idiomas',
  section_links: 'Links profesionales',

  // Certification details
  cert_evidence_available: 'Evidencia disponible',
  cert_verify_link: 'Verificar certificado',

  // Loading / error
  loading_profiles: 'Cargando perfiles...',
  error_profiles: 'No pudimos cargar los perfiles del equipo. Intenta de nuevo.'
} as const

/* ─────────────────── Commercial Pricing ─────────────────── */
// Copy canónico para el programa de pricing comercial (TASK-463..468).
// Inventariado y especificado en docs/tasks/complete/TASK-469-commercial-pricing-ui-interface-plan.md §4.
// No usar copy hardcoded en componentes de src/components/greenhouse/pricing/ — siempre desde aquí.

export const GH_PRICING = {
  // Builder
  builderTitleNew: 'Nueva cotización',
  builderTitleEdit: 'Editar cotización',
  builderSaveDraft: 'Guardar borrador',
  builderSendToClient: 'Enviar al cliente',
  builderPreview: 'Vista previa',
  builderEmptyLineItems: 'Aún no has agregado ítems a esta cotización',
  builderEmptyLineItemsCta: 'Agregar rol',

  // Builder shell (full-page surface, TASK-473)
  builderBreadcrumbRoot: 'Finanzas',
  builderBreadcrumbList: 'Cotizaciones',
  builderSubtitleCreate: 'Arma la cotización combinando ítems del catálogo, servicios empaquetados, templates o líneas manuales.',
  builderSubtitleEdit: 'Ajusta contexto, líneas y términos comerciales de esta cotización.',
  builderCreated: 'Cotización creada',
  builderSaved: 'Cambios guardados',
  builderSaveAndClose: 'Guardar y cerrar',
  builderSaveAndIssue: 'Guardar y emitir',
  builderCancel: 'Cancelar',
  builderSaving: 'Guardando…',
  builderIssued: 'Cotización emitida',
  builderIssueRequested: 'La cotización quedó en aprobación',
  builderIssueErrorFallback: 'No pudimos emitir la cotización. La dejamos guardada para que la revises.',
  builderSourcesCardTitle: 'Agrega líneas a la cotización',
  builderSourcesCardSubtitle: 'Elige cómo quieres componerla',
  builderSources: {
    catalog: {
      title: 'Catálogo',
      subtitle: 'Roles, herramientas y overhead del pricing catalog',
      icon: 'tabler-books',
      color: 'primary' as const
    },
    service: {
      title: 'Servicio',
      subtitle: 'Servicios empaquetados EFG-XXX que expanden a líneas completas',
      icon: 'tabler-package',
      color: 'success' as const
    },
    template: {
      title: 'Template',
      subtitle: 'Cotizaciones predefinidas con defaults comerciales',
      icon: 'tabler-template',
      color: 'info' as const
    },
    manual: {
      title: 'Manual',
      subtitle: 'Crea una línea en blanco y edítala a mano',
      icon: 'tabler-edit',
      color: 'secondary' as const
    }
  },
  builderTemplatePickerTitle: 'Desde template',
  builderTemplatePickerSubtitle: 'Elige una cotización reutilizable',
  builderTemplatePickerEmpty: 'No hay templates disponibles',
  builderTemplatePickerEmptyHint:
    'Guarda una cotización como template desde su detalle para reutilizarla aquí.',
  builderTemplateUsageOne: (n: number) => `Usado ${n} vez`,
  builderTemplateUsageMany: (n: number) => `Usado ${n} veces`,
  builderTemplateDefaultsLabel: 'Defaults',
  builderValidationDescription: 'Agrega una descripción breve del alcance.',
  builderValidationOrganization: 'Selecciona una organización para la cotización.',
  builderValidationHubspotContact:
    'Las cotizaciones sincronizadas con HubSpot requieren un contacto activo de esa organización.',
  builderValidationHubspotDeal:
    'Las cotizaciones sincronizadas con HubSpot requieren un deal vinculado.',
  builderValidationLines: 'Agrega al menos un ítem a la cotización.',
  builderSubmitErrorGeneric: 'No pudimos guardar la cotización. Intenta de nuevo.',

  // Sellable item picker (drawer con 5 tabs)
  pickerTitle: 'Agregar ítem',
  pickerTabs: {
    roles: 'Roles',
    people: 'Personas',
    tools: 'Herramientas',
    overhead: 'Overhead',
    services: 'Servicios'
  } as Record<string, string>,
  pickerSearchPlaceholder: 'Buscar por SKU o nombre...',
  pickerEmpty: 'No hay ítems activos para este filtro',
  pickerEmptyCta: 'Ir al catálogo',
  pickerServicesPlaceholder: 'Aún no hay servicios activos. Agrega uno en Admin › Catálogo de pricing › Servicios.',
  pickerLoadingAria: 'Cargando catálogo',
  pickerSelectionNone: 'Ningún ítem seleccionado',
  pickerSelectionCountOne: (n: number) => `${n} ítem seleccionado`,
  pickerSelectionCountMany: (n: number) => `${n} ítems seleccionados`,
  pickerSubmit: 'Agregar seleccionados',
  pickerCancel: 'Cancelar',
  pickerClose: 'Cerrar',
  pickerTabsAriaLabel: 'Categorías de ítems vendibles',

  // Cost stack (gated: solo finance/admin)
  costStackTitle: 'Detalle de costo (solo interno)',
  costStackTotalCost: 'Costo total',
  costStackPriceToClient: 'Precio cliente',
  costStackGrossMargin: 'Margen bruto',
  costStackTierFit: 'Tier fit',

  // Margin semaphore
  marginLabels: {
    critical: 'Crítico',
    attention: 'Atención',
    optimal: 'Óptimo',
    overshoot: 'Sobre meta'
  } as Record<string, string>,

  // Commercial model + country factor + currency + employment type
  commercialModelLabel: 'Modelo comercial',
  countryFactorLabel: 'País del cliente',
  currencyLabel: 'Moneda',
  employmentTypeLabel: 'Tipo de contratación',

  // Send quote drawer
  sendDrawerTitle: 'Enviar cotización',
  sendDrawerTo: 'Destinatario',
  sendDrawerCc: 'Con copia',
  sendDrawerSubject: 'Asunto',
  sendDrawerMessage: 'Mensaje',
  sendDrawerSubmit: 'Enviar cotización',
  sendDrawerSaveOnly: 'Guardar sin enviar',

  // Quote list
  listKpiDrafts: 'Borradores',
  listKpiSent: 'Enviadas',
  listKpiApproved: 'Aprobadas',
  listKpiExpired: 'Vencidas',
  listNew: 'Nueva cotización',

  // Pricing catalog admin
  adminTitle: 'Catálogo de pricing',
  adminRoles: 'Roles vendibles',
  adminTools: 'Catálogo de herramientas',
  adminOverhead: 'Overhead add-ons',
  adminServicesLabel: 'Servicios empaquetados',
  adminServices: {
    label: 'Servicios empaquetados',
    title: 'Servicios empaquetados',
    subtitle:
      'Servicios reusables con recipe de roles y herramientas que se expanden automáticamente en cada cotización.',
    navDescription: 'Catálogo de servicios compuestos con SKU EFG-XXX',
    backToCatalog: 'Volver al catálogo',
    createCta: 'Nuevo servicio',
    createFirstCta: 'Crear primer servicio',
    editCta: 'Editar servicio',
    deactivateCta: 'Desactivar',
    activateCta: 'Reactivar',
    simulateCta: 'Simular precio',
    saveRecipeCta: 'Guardar receta',
    addRoleCta: 'Agregar rol',
    addToolCta: 'Agregar herramienta',
    moveUpLabel: 'Subir fila',
    moveDownLabel: 'Bajar fila',
    removeRowLabel: 'Eliminar fila',

    // Columns
    columns: {
      sku: 'SKU',
      name: 'Nombre',
      category: 'Categoría',
      tier: 'Tier',
      commercialModel: 'Modelo comercial',
      unit: 'Unidad',
      duration: 'Duración',
      businessLine: 'BL',
      active: 'Estado',
      roleCount: '# Roles',
      toolCount: '# Tools',
      actions: 'Acciones'
    },

    // Recipe columns
    recipeRoleColumns: {
      role: 'Rol',
      hours: 'Horas/periodo',
      quantity: 'Cantidad',
      optional: 'Opcional',
      notes: 'Notas'
    },
    recipeToolColumns: {
      tool: 'Herramienta',
      quantity: 'Cantidad',
      optional: 'Opcional',
      passThrough: 'Pass-through',
      notes: 'Notas'
    },

    // Filters
    filterTier: 'Tier',
    filterCategory: 'Categoría',
    filterBusinessLine: 'Unidad de negocio',
    filterStatus: 'Estado',
    filterAllTiers: 'Todos los tiers',
    filterAllCategories: 'Todas las categorías',
    filterAllBusinessLines: 'Todas las BL',
    searchPlaceholder: 'Buscar por SKU o nombre...',

    // Service units
    serviceUnits: {
      project: 'Proyecto',
      monthly: 'Mensual (retainer)'
    } as Record<string, string>,

    // Commercial models
    commercialModels: {
      on_going: 'On-going (retainer)',
      on_demand: 'On-demand (proyecto)',
      hybrid: 'Híbrido',
      license_consulting: 'Licencia + consultoría'
    } as Record<string, string>,

    // Tiers
    tierOptions: {
      '1': 'T1 · Junior',
      '2': 'T2 · Mid',
      '3': 'T3 · Senior',
      '4': 'T4 · Lead'
    } as Record<string, string>,

    // Sections
    sectionGeneral: 'Detalle general',
    sectionRecipe: 'Receta de roles y herramientas',
    sectionSimulate: 'Simular precio',
    sectionRecipeRoles: 'Roles',
    sectionRecipeTools: 'Herramientas',

    // Empty states
    emptyStateFirstTitle: 'Aún no tienes servicios empaquetados',
    emptyStateFirstDescription:
      'Los servicios agrupan roles y herramientas reusables. Al crearlos, se expanden en cada cotización sin armar desde cero.',
    emptyStateNoResultsTitle: 'Sin resultados',
    emptyStateNoResultsDescription:
      'Ajusta los filtros o usa otras palabras para buscar.',
    emptyRecipeRoles: 'Aún no hay roles en la receta. Agrega el primero para simular el servicio.',
    emptyRecipeTools: 'Aún no hay herramientas en la receta.',

    // Hints
    moduleCodeHint: 'Identificador interno (auto-generado desde el nombre, editable).',
    durationHint: 'Meses sugeridos para retainers; aplica solo si la unidad es Mensual.',
    skuHint: 'Se asigna automáticamente al guardar (prefijo EFG).',
    simulateHint: 'Calcula el precio total del servicio usando el motor de pricing v2.',

    // Validation
    validation: {
      moduleNameRequired: 'Ingresa un nombre para el servicio.',
      serviceUnitRequired: 'Selecciona la unidad de servicio.',
      commercialModelRequired: 'Selecciona el modelo comercial.',
      tierRequired: 'Selecciona el tier.',
      durationRequiredForMonthly: 'Para servicios mensuales, ingresa la duración en meses.',
      durationMustBePositive: 'La duración debe ser mayor o igual a 0.',
      roleRequired: 'Selecciona un rol para esta fila.',
      hoursMustBePositive: 'Las horas deben ser mayores a 0.',
      quantityMustBePositive: 'La cantidad debe ser al menos 1.',
      toolRequired: 'Selecciona una herramienta para esta fila.'
    },

    // Errors
    errorSkuConflict: 'Ya existe un servicio con ese código. Usa otro identificador.',
    errorConflict: 'El servicio cambió desde que lo abriste. Recarga para continuar.',
    errorLoad: 'No pudimos cargar el servicio. Intenta de nuevo.',
    errorLoadList: 'No pudimos cargar los servicios. Intenta de nuevo.',
    errorSave: 'No pudimos guardar los cambios. Revisa los valores e intenta de nuevo.',
    errorSaveRecipe: 'No pudimos guardar la receta. Revisa los valores e intenta de nuevo.',
    errorSimulate: 'No pudimos simular el precio. Revisa la receta e intenta de nuevo.',

    // Success toasts
    toastCreated: (sku: string) => `Servicio creado — SKU ${sku} asignado`,
    toastUpdated: 'Cambios guardados',
    toastRecipeUpdated: 'Receta guardada',
    toastDeactivated: (sku: string) =>
      `Servicio ${sku} desactivado — no aparecerá en nuevas cotizaciones`,
    toastReactivated: (sku: string) => `Servicio ${sku} reactivado`
  },
  adminTiers: 'Tiers de rol',
  adminCommercialModels: 'Modelos comerciales',
  adminCountryFactors: 'Factores de país',
  adminEmploymentTypes: 'Tipos de contratación',
  adminAudit: 'Historial de cambios',

  // Success / error toasts
  toastQuoteSaved: 'Borrador guardado',
  toastQuoteSent: (email: string) => `Cotización enviada a ${email}`,
  toastRoleUpdated: (label: string) => `${label} actualizado`,
  errorLoadCatalog: 'No pudimos cargar el catálogo. Intenta de nuevo.',
  errorLoadQuote: 'No pudimos cargar esta cotización. Verifica el enlace e intenta de nuevo.',

  // Builder Command Bar redesign (TASK-487)
  identityStrip: {
    draftLabel: 'Borrador',
    sentLabel: 'Enviada',
    approvedLabel: 'Aprobada',
    expiredLabel: 'Vencida',
    numberPlaceholder: 'Q-NUEVO',
    validUntilLabel: 'Válida hasta',
    validUntilEmpty: 'Sin fecha',
    ariaLabel: 'Identidad de la cotización',

    // TASK-615: dynamic subtitle that mirrors the next required step.
    // Header conserva identidad y save draft; el dock es el único centro
    // de la acción terminal.
    subtitleReady: 'Lista para emitir desde el resumen.',
    subtitleNeedsLines: 'Agrega ítems desde el detalle para calcular el total.',
    subtitleNeedsOrganization: 'Selecciona la organización para destrabar el flujo.',
    subtitleNeedsContact: 'Falta un contacto comercial para poder emitir.',
    subtitleNeedsDeal: 'Vincula un deal de HubSpot para esta cotización.',
    subtitleEditingIssued: 'Estás ajustando una cotización ya emitida.',
    subtitlePendingApproval: 'En aprobación: el cierre se libera al recibir respuesta.',
    saveDraftMeta: 'Solo guarda. Para emitir, usa el resumen abajo.'
  },
  contextChips: {
    ariaLabel: 'Contexto de la cotización',
    overflowLabel: 'Más opciones',
    requiredBadge: 'Requerido',
    lockedHint: 'No se puede cambiar después de crear la cotización',
    organization: {
      label: 'Organización',
      placeholder: 'Seleccionar organización',
      icon: 'tabler-building',
      hint: 'Cliente o prospecto de la cotización',
      unifiedSearchPlaceholder: 'Buscar por nombre o dominio…',
      unifiedMinQuery: 'Escribe al menos 2 caracteres para buscar.',
      unifiedEmpty: 'No encontramos organizaciones con ese nombre o dominio.',
      unifiedError: 'No pudimos actualizar los resultados ahora mismo.',
      unifiedRetry: 'Reintentar',
      unifiedAdopting: 'Adoptando organización desde HubSpot…',
      unifiedAdopted: 'Organización adoptada desde HubSpot',
      unifiedNoAdoptPermission: 'Sin permiso para adoptar'
    },
    contact: {
      label: 'Contacto',
      placeholder: 'Agregar contacto',
      icon: 'tabler-user',
      hint: 'Persona de la organización responsable',
      noOrgFirst: 'Selecciona una organización primero',
      loading: 'Cargando contactos…',
      empty: 'Sin contactos registrados en esta organización',
      primaryBadge: 'Principal'
    },
    deal: {
      label: 'Deal HubSpot',
      placeholder: 'Vincular deal',
      icon: 'tabler-briefcase-2',
      hint: 'Vincula la cotización a una oportunidad de HubSpot. Requiere contacto comercial.',
      noOrgFirst: 'Selecciona una organización primero',
      loading: 'Cargando deals…',
      empty: 'Sin deals disponibles para esta organización',
      emptyHelper: 'Vincula una Company HubSpot o crea un deal nuevo',
      searchFooterPrompt: '¿No encontrás el deal que buscás?',
      createNewLabel: 'Crear deal nuevo'
    },
    businessLine: {
      label: 'Business line',
      placeholder: 'Sin BL',
      icon: 'tabler-target'
    },
    commercialModel: {
      label: 'Modelo comercial',
      placeholder: 'Seleccionar modelo',
      icon: 'tabler-briefcase'
    },
    countryFactor: {
      label: 'País',
      placeholder: 'Seleccionar país',
      icon: 'tabler-world'
    },
    currency: {
      label: 'Moneda',
      placeholder: 'CLP',
      icon: 'tabler-currency-dollar'
    },
    duration: {
      label: 'Duración',
      placeholder: 'Meses',
      icon: 'tabler-clock',
      hint: 'Requerido para retainer o híbrido',
      unit: (n: number) => (n === 1 ? '1 mes' : `${n} meses`)
    },
    validUntil: {
      label: 'Válida hasta',
      placeholder: 'dd/mm/aaaa',
      icon: 'tabler-calendar-event'
    },
    progress: {
      suffix: (total: number) => `de ${total} campos`,
      readyLabel: 'Lista para emitir',
      readyAriaLive: 'Cotización lista. Puedes guardar y emitir desde el resumen.',
      nextStepPrefix: 'Sigue:',
      nextSteps: {
        organization: 'elige una organización',
        contact: 'agrega un contacto',
        deal: 'vincula un deal',
        businessLine: 'asigna una business line',
        duration: 'define la duración',
        validUntil: 'fija la fecha de validez',
        lines: 'agrega ítems al detalle'
      } as const,
      ariaLive: (filled: number, total: number) => {
        const percent = total > 0 ? Math.round((filled / total) * 100) : 0
        const missing = Math.max(0, total - filled)

        return `Cotización completa en ${percent}%. Faltan ${missing} campos.`
      }
    },
    groupLabels: {
      party: 'Cliente',
      terms: 'Términos comerciales',
      timing: 'Plazos',
      termsAndTiming: 'Términos y plazos'
    }
  },
  summaryDock: {
    ariaLabel: 'Resumen de la cotización',
    subtotalLabel: 'Subtotal',
    factorLabel: 'Factor',
    ivaLabel: 'IVA',
    totalLabel: 'Total',
    addonsChip: (n: number) => (n === 1 ? '1 addon' : `${n} addons`),
    addonsChipEmpty: 'Sin addons',
    primaryCta: 'Guardar y emitir',
    previewCta: 'Vista previa',
    loadingLabel: 'Calculando…',
    collapsedLabelPrefix: 'Total',
    collapsedExpandLabel: 'Ver detalle',
    mobileTotalLabel: 'Total de la cotización',

    // Empty / partial state copy — instructive, secuencial, no genérico.
    emptyNoOrganization: 'Elige una organización para empezar a calcular el total.',
    emptyNoLines: 'Agrega al menos un ítem para ver subtotal, IVA y margen.',

    // Disabled-CTA reasons — el dock las expone como tooltip y aria-describedby.
    disabledReasons: {
      busy: 'Estamos guardando los últimos cambios. Espera un instante.',
      noLines: 'Agrega al menos un ítem antes de emitir.',
      noOrganization: 'Selecciona la organización para poder emitir.',
      notIssueable: 'Esta cotización ya no se puede emitir desde el builder.',
      simulationError: 'Resuelve los avisos del motor antes de emitir.'
    }
  },
  addMenu: {
    triggerLabel: 'Agregar ítem',
    defaultAriaLabel: 'Agregar ítem desde catálogo',
    caretAriaLabel: 'Más opciones de agregado',
    items: {
      catalog: 'Desde catálogo',
      service: 'Desde servicio empaquetado',
      template: 'Desde template',
      manual: 'Línea manual'
    }
  },
  lineWarning: {
    ariaPrefix: 'Advertencia en fila',
    scrollAnchorLabel: 'Ir a la fila',
    genericTitle: 'Atención requerida',
    dismissLabel: 'Ocultar advertencia'
  },
  emptyItems: {
    eyebrow: 'Detalle de la cotización',
    title: 'Compón el alcance con ítems del catálogo',
    subtitle: 'Cada ítem se procesa con el motor de pricing v2: total, margen y addons se calculan en tiempo real.',

    // Method hints — ensenan el modelo de composicion (catalog / service /
    // template / manual) sin un placeholder generico "empezar".
    methodHints: [
      {
        icon: 'tabler-books',
        title: 'Desde catálogo',
        description: 'Roles, herramientas y overhead aprobados con tarifa vigente.'
      },
      {
        icon: 'tabler-package',
        title: 'Servicio empaquetado',
        description: 'Un EFG-XXX expande roles, horas y duración en un solo paso.'
      },
      {
        icon: 'tabler-template',
        title: 'Template guardado',
        description: 'Reutiliza una cotización validada y ajusta los detalles.'
      },
      {
        icon: 'tabler-edit',
        title: 'Línea manual',
        description: 'Solo cuando lo que cobras todavía no existe en el catálogo.'
      }
    ] as const,

    ctaPrimary: 'Agregar desde catálogo',
    ctaSecondary: 'Desde servicio empaquetado',
    ctaTertiary: 'Desde template',
    ctaManual: 'Crear línea manual',
    pendingNote: (label: string) => `Aún falta ${label} antes de poder emitir.`
  },
  adjustPopover: {
    triggerLabel: 'Ajustes de pricing',
    title: 'Ajustes de pricing',
    subtitle: 'Dedicación y tipo de contratación aplicados a esta línea. Los períodos se controlan desde la columna Cantidad.',
    fteLabel: 'FTE',
    fteHelper: '0.1 a 1.0 (fracción dedicada)',
    employmentTypeLabel: 'Tipo de contratación',
    employmentTypePlaceholder: 'Default del rol si vacío',
    applyLabel: 'Aplicar',
    closeLabel: 'Cerrar'
  },
  detailAccordion: {
    title: 'Detalle y notas',
    descriptionLabel: 'Descripción',
    descriptionPlaceholder: 'Alcance del servicio, contexto, notas internas…'
  },

  // ────────────────────────────────────────────────────────────────
  // TASK-481 — Cost provenance (source_kind + confidence + freshness)
  // ────────────────────────────────────────────────────────────────
  costProvenance: {
    sectionTitle: 'Trazabilidad del costo',
    sourceLabel: 'Fuente',
    confidenceLabel: 'Confianza',
    freshnessLabel: 'Vigencia',
    sourceRefLabel: 'Referencia',
    snapshotDateLabel: 'Snapshot',

    sourceKinds: {
      member_actual: {
        label: 'Costo real del miembro',
        shortDescription: 'Costo observado en compensación de la persona asignada.'
      },
      role_blended: {
        label: 'Promedio blended del rol',
        shortDescription: 'Promedio ponderado del costo observado en todas las personas del rol.'
      },
      role_modeled: {
        label: 'Modelo del rol',
        shortDescription: 'Modelado desde rate cards cuando no hay costo real del rol todavía.'
      },
      tool_snapshot: {
        label: 'Snapshot de herramienta',
        shortDescription: 'Costo observado en la última materialización del proveedor.'
      },
      tool_catalog_fallback: {
        label: 'Catálogo como fallback',
        shortDescription: 'Sin snapshot disponible; se usa el costo de catálogo como referencia.'
      },
      manual: {
        label: 'Override manual',
        shortDescription: 'Costo ingresado manualmente con motivo registrado.'
      }
    } as Record<string, { label: string; shortDescription: string }>,

    confidenceBuckets: {
      high: {
        label: 'Alta',
        shortDescription: 'Datos recientes y consistentes; úsalo como sugerencia principal.'
      },
      medium: {
        label: 'Media',
        shortDescription: 'Datos parciales o con algo de desfase; revísalo si la línea es crítica.'
      },
      low: {
        label: 'Baja',
        shortDescription: 'Datos escasos o desactualizados; considera override si el monto es relevante.'
      }
    } as Record<string, { label: string; shortDescription: string }>,

    freshnessLabelFresh: 'Reciente',
    freshnessLabelStale: 'Desactualizado',
    freshnessLabelVeryStale: 'Muy desactualizado',
    freshnessLabelUnknown: 'Sin fecha',
    freshnessValueFormatter: (days: number | null) => {
      if (days === null || !Number.isFinite(days)) return 'sin fecha'
      if (days <= 0) return 'hoy'
      if (days === 1) return 'hace 1 día'
      if (days < 30) return `hace ${days} días`
      if (days < 60) return 'hace más de un mes'
      const months = Math.floor(days / 30)

      
return `hace ${months} meses`
    },

    fallbackDisclaimerTitle: 'Costo de fallback en uso',
    fallbackDisclaimerBody:
      'No hay snapshot reciente para esta línea. El motor usó el catálogo como referencia. Si el monto es relevante, considera un override con motivo.',
    manualDisclaimerTitle: 'Costo override',
    manualDisclaimerBody:
      'Este costo fue ingresado manualmente por el equipo comercial. Revisa el motivo en el historial antes de emitir.',

    popoverTitle: 'Detalle de trazabilidad',
    popoverOpenAria: 'Abrir detalle de trazabilidad del costo',
    popoverCloseAria: 'Cerrar detalle de trazabilidad',
    resolutionNotesLabel: 'Notas del motor',
    resolutionNotesEmpty: 'Sin notas adicionales.',
    noProvenanceState: 'Aún no hay metadata de trazabilidad para esta línea.'
  },

  // ────────────────────────────────────────────────────────────────
  // TASK-481 — Cost override governance (dialog + validation + history)
  // ────────────────────────────────────────────────────────────────
  costOverride: {
    ctaLabel: 'Override costo',
    ctaLabelShort: 'Override',
    ctaDisabledTooltip:
      'No tienes permiso para aplicar overrides. Contacta a finance_admin.',

    dialogTitle: 'Aplicar override de costo',
    dialogSubtitle:
      'Reemplaza el costo sugerido por un valor manual. Queda registrado con motivo y actor.',
    dialogAriaLabel: 'Override manual del costo de la línea',
    cancelCta: 'Cancelar',
    submitCta: 'Aplicar override',
    submittingCta: 'Aplicando…',
    closeLabel: 'Cerrar',

    suggestedLabel: 'Costo sugerido',
    suggestedMissing: 'Sin sugerencia',
    suggestedProvenancePrefix: 'Fuente: ',

    overrideLabel: 'Nuevo costo por unidad',
    overrideHelper: 'Monto en USD. Se aplica al costo unitario de la línea.',
    overridePlaceholder: 'ej. 120.00',
    overrideRequiredError: 'Ingresa un costo mayor o igual a 0.',
    overrideInvalidError: 'El costo debe ser un número válido.',

    categoryLabel: 'Motivo del override',
    categoryPlaceholder: 'Selecciona una categoría',
    categoryRequiredError: 'Selecciona una categoría para continuar.',
    categoryAriaDescription:
      'Selecciona el motivo principal del override para análisis posterior.',
    categories: {
      competitive_pressure: {
        label: 'Presión competitiva',
        shortDescription: 'Ajuste por oferta competitiva o match de precio.'
      },
      strategic_investment: {
        label: 'Inversión estratégica',
        shortDescription: 'Proyecto que invertimos deliberadamente por valor futuro.'
      },
      roi_correction: {
        label: 'Corrección de ROI',
        shortDescription: 'Ajuste porque el cálculo original sobre/sub estima el ROI real.'
      },
      error_correction: {
        label: 'Corrección por error',
        shortDescription: 'Fix a un dato de catálogo o snapshot incorrecto.'
      },
      client_negotiation: {
        label: 'Negociación con cliente',
        shortDescription: 'Acuerdo puntual con el cliente que amerita registrarse.'
      },
      other: {
        label: 'Otro motivo',
        shortDescription: 'Detalla el motivo en el campo de texto.'
      }
    } as Record<string, { label: string; shortDescription: string }>,

    reasonLabel: 'Detalle del motivo',
    reasonHelperShort: '15 caracteres mínimo. Para auditoría y análisis de patrones.',
    reasonHelperOther: '30 caracteres mínimo cuando la categoría es "Otro motivo".',
    reasonPlaceholder:
      'Ej. Match de oferta de Acme por USD 10.000/mes para cerrar Q2.',
    reasonAriaDescription: 'Texto libre que describe por qué se aplica el override.',
    reasonTooShortError: (min: number, current: number) =>
      `Mínimo ${min} caracteres. Llevas ${current}.`,
    reasonTooLongError: 'Máximo 500 caracteres.',
    reasonCounter: (current: number, max: number) => `${current} / ${max}`,

    deltaLabel: 'Variación vs sugerido',
    deltaAbove: (pct: number) => `+${pct}% sobre sugerido`,
    deltaBelow: (pct: number) => `${pct}% bajo sugerido`,
    deltaEqual: 'Igual al sugerido',
    deltaNoBaseline: 'Sin sugerencia para comparar',

    impactLabel: 'Impacto estimado',
    impactMarginHintAbove: 'Un costo mayor reduce el margen de la línea.',
    impactMarginHintBelow: 'Un costo menor aumenta el margen de la línea.',
    impactLineTotalPrefix: 'Nuevo total de línea: ',

    historyTitle: 'Overrides previos',
    historyEmpty: 'Esta línea no tiene overrides previos.',
    historyCountOne: '1 override previo',
    historyCountMany: (n: number) => `${n} overrides previos`,
    historyEntryByActor: (actorLabel: string, dateLabel: string) =>
      `${actorLabel} · ${dateLabel}`,
    historyEntryActorSystem: 'Sistema',
    historyEntryActorFallback: 'Actor desconocido',
    historyLoadingLabel: 'Cargando historial…',
    historyLoadError: 'No pudimos cargar el historial. Intenta de nuevo.',

    confirmTitle: 'Confirmar override',
    confirmBody: (from: string, to: string, pct: string) =>
      `Vas a reemplazar el costo sugerido de ${from} por ${to} (${pct}). Queda registrado con tu motivo.`,
    confirmBodyNoBaseline: (to: string) =>
      `Vas a fijar el costo en ${to} manualmente. Queda registrado con tu motivo.`,

    successToast: 'Override aplicado. El costo de la línea ahora es manual.',
    errorToastGeneric:
      'No pudimos aplicar el override. Revisa el motivo e intenta de nuevo.',
    errorToastForbidden: 'No tienes permiso para aplicar este override.',
    errorToastNotFound: 'La línea ya no existe. Recarga la cotización.',

    noPermissionBanner:
      'Solo roles finance_admin o efeonce_admin pueden aplicar overrides.'
  }
} as const

// ────────────────────────────────────────────────────────────────
// TASK-457 — Revenue Pipeline comercial (unificado: deals + quotes)
// ────────────────────────────────────────────────────────────────
export const GH_PIPELINE_COMMERCIAL = {
  // Outer tab label (FinanceIntelligenceView)
  outerTabLabel: 'Pipeline comercial',

  // Sub-tab label (CommercialIntelligenceView)
  subtabPipelineLabel: 'Pipeline',
  subtabPipelineDescription:
    'Oportunidades comerciales activas — deals de HubSpot, contratos standalone y pre-sales.',

  // KPIs
  kpiOpenPipelineLabel: 'Pipeline abierto',
  kpiOpenPipelineSubtitle: 'Total de oportunidades activas',
  kpiOpenPipelineTooltip:
    'Monto agregado de deals abiertos, contratos vigentes y pre-sales en negociación.',

  kpiWeightedPipelineLabel: 'Pipeline ponderado',
  kpiWeightedPipelineSubtitle: 'Monto × probabilidad',
  kpiWeightedPipelineTooltip:
    'Revenue forecast ajustado por la probabilidad de cada oportunidad.',

  kpiMtdWonLabel: 'Ganado (mes)',
  kpiMtdWonSubtitle: 'Deals cerrados este mes',
  kpiMtdWonTooltip:
    'Suma de montos de deals cerrados como ganados con fecha de cierre en el mes actual.',

  kpiMtdLostLabel: 'Perdido (mes)',
  kpiMtdLostSubtitle: 'Deals cerrados sin ganar',
  kpiMtdLostTooltip:
    'Suma de montos de deals cerrados como perdidos en el mes actual.',

  // Category chips
  categoryDealLabel: 'Deal',
  categoryDealDescription: 'Oportunidad activa en HubSpot (deal abierto).',
  categoryContractLabel: 'Contrato',
  categoryContractDescription:
    'Cotización standalone con cliente activo o deal ya ganado (revenue en ejecución).',
  categoryPreSalesLabel: 'Pre-sales',
  categoryPreSalesDescription:
    'Cotización standalone a lead o prospecto en etapa temprana.',

  // Filters
  filterCategoryLabel: 'Categoría',
  filterStageLabel: 'Etapa',
  filterLifecyclestageLabel: 'Estado del cliente',
  filterBusinessLineLabel: 'Unidad de negocio',
  filterAllCategories: 'Todas las categorías',
  filterAllStages: 'Todas las etapas',
  filterAllLifecycleStages: 'Todos los estados del cliente',
  filterAllBusinessLines: 'Todas las unidades',
  filterClearAll: 'Limpiar filtros',

  // Column headers
  colCategory: 'Categoría',
  colEntity: 'Oportunidad',
  colClient: 'Cliente',
  colStage: 'Etapa',
  colAmount: 'Monto',
  colProbability: 'Probabilidad',
  colCloseDate: 'Vence/Cierra',
  colQuoteCount: 'Cotizaciones',
  colAction: 'Acción',

  // Row actions
  actionView: 'Ver',

  // States
  loadingText: 'Cargando pipeline...',
  errorText: 'No pudimos cargar el pipeline. Reintenta o avisa a finance-ops.',
  emptyTitle: 'Pipeline vacío',
  emptyDescription:
    'Aún no hay deals abiertos ni cotizaciones standalone activas.',

  // Onboarding note (Slice 1 precondition): recordatorio al convertir lead → deal
  presalesOnboardingTitle: 'Recordatorio al convertir leads',
  presalesOnboardingNote:
    'Cuando conviertas un lead en deal, asocia la cotización al deal nuevo en HubSpot. Sin ese paso, la cotización queda colgada como pre-sales aunque el lead ya sea customer.',
  presalesOnboardingDismiss: 'Entendido'
} as const

// ────────────────────────────────────────────────────────────────
// TASK-462 — MRR/ARR Contractual Projection Dashboard
// ────────────────────────────────────────────────────────────────
export const GH_MRR_ARR_DASHBOARD = {
  outerTabLabel: 'MRR/ARR',

  headerTitle: 'Proyección contractual MRR/ARR',
  headerSubtitle:
    'Revenue recurrente a partir de contratos retainer vigentes: tendencia, movimientos y retención.',

  // KPIs
  kpiMrrLabel: 'MRR actual',
  kpiMrrTooltip:
    'Monthly Recurring Revenue — suma de mrr_clp de contracts retainer activos este mes.',
  kpiMrrDeltaMomLabel: 'vs mes anterior',

  kpiArrLabel: 'ARR anualizado',
  kpiArrTooltip:
    'Annual Recurring Revenue = MRR × 12. Convención SaaS estándar, no deriva de fechas de close.',

  kpiNrrLabel: 'NRR 12 meses',
  kpiNrrTooltip:
    'Net Revenue Retention — cuánto creció el MRR desde el cohort de hace 12 meses, incluyendo expansion y reactivación menos churn y contracción.',
  kpiNrrSubtitleAbove: 'Sobre el 100% — cohort creciendo',
  kpiNrrSubtitleHealthy: 'Cohort saludable',
  kpiNrrSubtitleRisk: 'Bajo umbral — revisar churn',
  kpiNrrNoData: 'Sin datos suficientes',

  kpiContractsCountLabel: 'Contratos activos',
  kpiContractsCountTooltip:
    'Cantidad de contracts retainer activos con MRR configurado este mes.',
  kpiContractsCountSubtitle: 'Con MRR configurado',

  // Chart
  timelineChartTitle: 'Movimiento MRR — últimos 12 meses',
  timelineChartSubtitle:
    'Descomposición por tipo de movimiento: nuevos, expansion, churn, contracción y reactivación.',
  movementNew: 'Nuevo',
  movementExpansion: 'Expansion',
  movementContraction: 'Contracción',
  movementChurn: 'Churn',
  movementReactivation: 'Reactivación',
  movementUnchanged: 'Sin cambio',

  // Breakdowns
  breakdownByCommercialModelTitle: 'Por modelo comercial',
  breakdownByStaffingModelTitle: 'Por modelo de staffing',
  breakdownByBusinessLineTitle: 'Por unidad de negocio',
  breakdownColMrr: 'MRR',
  breakdownColCount: 'Contratos',
  breakdownMoreItems: (n: number) => `+ ${n} más`,
  breakdownEmpty: 'Sin datos para este corte.',

  // Top 10
  topContractsTitle: 'Top 10 contratos por MRR',
  topContractsSubtitle: 'Los mayores contribuyentes al revenue recurrente del mes.',
  colContract: 'Contrato',
  colCommercialModel: 'Modelo',
  colStaffingModel: 'Staffing',
  colMrr: 'MRR',
  colArr: 'ARR',
  colDelta: 'Δ vs mes anterior',
  colMovement: 'Tipo',

  // Movements panel
  movementsPanelTitle: 'Movimientos del mes',
  movementsPanelSubtitle:
    'Detalle de contracts que entraron, expandieron, se redujeron o churnearon.',
  movementsEmpty: 'No hay contratos en esta categoría para el período seleccionado.',
  movementsError:
    'No pudimos cargar los movimientos. Reintenta o avisa a finance-ops.',
  movementsLoading: 'Cargando movimientos...',

  // States
  loadingText: 'Cargando MRR/ARR...',
  errorText: 'No pudimos cargar el dashboard MRR/ARR. Reintenta o avisa a finance-ops.',
  emptyTitle: 'Sin snapshots todavía',
  emptyDescription:
    'Aún no hay snapshots de MRR/ARR para este período. Verifica que haya contracts retainer activos con mrr_clp configurado. Los snapshots se materializan reactivamente cuando hay eventos de contract lifecycle.',

  // Period switcher
  periodPickerLabel: 'Período',
  prevMonthButton: 'Mes anterior',
  nextMonthButton: 'Mes siguiente'
} as const

// ────────────────────────────────────────────────────────────────
// TASK-471 — Pricing Catalog Phase-4 UX (diff + revert + bulk + impact + approvals + excel)
// ────────────────────────────────────────────────────────────────
export const GH_PRICING_GOVERNANCE = {
  // Slice 1 — AuditDiffViewer
  auditDiff: {
    sectionTitle: 'Detalle del cambio',
    previousColumnLabel: 'Antes',
    newColumnLabel: 'Después',
    noChangesLabel: 'Sin cambios registrados',
    unchangedFieldsSummary: (n: number) => `${n} campo${n === 1 ? '' : 's'} sin cambios`,
    changedFieldsSummary: (n: number) => `${n} campo${n === 1 ? '' : 's'} con cambios`,
    noValueLabel: '(sin valor)',
    copyJsonLabel: 'Copiar JSON',
    copiedLabel: 'Copiado',
    copyFailedLabel: 'No se pudo copiar',
    addedMarker: 'Agregado',
    removedMarker: 'Quitado',
    deltaAbove: (delta: string, pct: string) => `+${delta} (+${pct}%)`,
    deltaBelow: (delta: string, pct: string) => `${delta} (${pct}%)`,
    deltaZero: 'Sin variación',
    createdStateTitle: 'Entidad creada',
    createdStateSubtitle: 'Valores iniciales de la nueva entidad.',
    deactivatedStateTitle: 'Entidad desactivada',
    deactivatedStateSubtitle: 'Último estado conocido antes de desactivar.',
    reactivatedStateTitle: 'Entidad reactivada',
    deletedStateTitle: 'Entidad eliminada',
    deletedStateSubtitle: 'Valores al momento de la eliminación.',
    bulkImportedStateTitle: 'Importación masiva',
    bulkImportedStateSubtitle: 'Cambio aplicado como parte de un batch de importación Excel.',
    recipeUpdatedStateTitle: 'Receta de servicio actualizada',
    costUpdatedStateTitle: 'Componentes de costo actualizados',
    pricingUpdatedStateTitle: 'Pricing actualizado',
    revertedStateTitle: 'Reversión aplicada',
    revertedStateSubtitle: 'Rollback de un cambio anterior.',
    approvalAppliedStateTitle: 'Cambio aprobado y aplicado',
    approvalAppliedStateSubtitle: 'Cambio aplicado tras aprobación por un segundo admin.',
    bulkEditedStateTitle: 'Edición masiva',
    bulkEditedStateSubtitle: 'Cambio aplicado a múltiples entidades en una sola acción.'
  },

  // Slice 2 — Revert
  auditRevert: {
    triggerLabel: 'Revertir',
    triggerDisabledAlreadyReverted: 'Este cambio ya fue revertido',
    triggerDisabledBulk: 'Los cambios masivos no se pueden revertir con un click',
    triggerDisabledReadOnly: 'Esta entidad no soporta revert automático',
    triggerDisabledFteGuideReadOnly:
      'La guía FTE sigue siendo solo lectura. Revísala desde governance antes de corregirla manualmente.',
    triggerDisabledEntityGone: 'La entidad ya no existe',
    triggerDisabledNoPermission: 'Solo efeonce_admin puede revertir cambios del catálogo',
    dialogTitle: 'Revertir cambio',
    dialogSubtitle: 'Vas a restaurar el estado previo de esta entidad. Queda registrado con motivo.',
    previousStateLabel: 'Estado que se va a restaurar',
    currentStateLabel: 'Estado actual (se va a perder)',
    reasonLabel: 'Motivo de la reversión',
    reasonPlaceholder: 'Ej. Corrección por error — el rol debía mantener el margen original.',
    reasonHelper: '15 caracteres mínimo. Se registra en el audit log para trazabilidad.',
    reasonTooShortError: (min: number, current: number) =>
      `Mínimo ${min} caracteres. Llevas ${current}.`,
    reasonTooLongError: 'Máximo 500 caracteres.',
    submitCta: 'Revertir cambio',
    submittingCta: 'Revirtiendo…',
    cancelCta: 'Cancelar',
    successToast: 'Cambio revertido. Se registró en el audit log.',
    errorToastGeneric: 'No pudimos revertir el cambio. Intenta de nuevo.',
    errorToastConflict: 'La entidad fue modificada después de este audit. Actualiza y vuelve a intentar.',
    errorToastForbidden: 'No tienes permiso para revertir cambios del catálogo.',
    errorToastEntityGone: 'La entidad ya no existe. No se puede revertir.'
  },

  // Slice 3 — Bulk edit
  bulkEdit: {
    selectAllLabel: 'Seleccionar todos',
    selectedCountLabel: (n: number) => `${n} seleccionado${n === 1 ? '' : 's'}`,
    clearSelectionLabel: 'Limpiar selección',
    bulkEditCta: 'Editar selección',
    bulkDeactivateCta: 'Desactivar selección',
    drawerTitle: 'Edición masiva',
    drawerSubtitle: (n: number) =>
      `${n} ${n === 1 ? 'entidad seleccionada' : 'entidades seleccionadas'}. Los cambios se aplican a todas.`,
    activeFieldLabel: 'Estado activo',
    activeFieldOnlySome: 'Solo algunos están activos actualmente',
    categoryFieldLabel: 'Categoría',
    tierFieldLabel: 'Tier',
    notesFieldLabel: 'Notas (se agrega al final)',
    notesFieldPlaceholder: 'Ej. ajuste Q2 por revisión de pricing',
    previewCtaLabel: 'Previsualizar impacto',
    previewingLabel: 'Calculando impacto…',
    applyCtaLabel: 'Aplicar a selección',
    applyingCtaLabel: 'Aplicando…',
    confirmAggregateImpact: (quotes: number, pipelineClp: string) =>
      `Este cambio afectará ${quotes} cotización${quotes === 1 ? '' : 'es'} activa${quotes === 1 ? '' : 's'} y ${pipelineClp} en pipeline.`,
    emptyChangesetError: 'Selecciona al menos un campo a modificar.',
    successToast: (n: number) => `${n} ${n === 1 ? 'entidad actualizada' : 'entidades actualizadas'}.`,
    partialToast: (ok: number, failed: number) =>
      `${ok} aplicadas, ${failed} con error. Revisa el detalle.`,
    errorToast: 'No pudimos aplicar el cambio masivo.',
    cancelCta: 'Cancelar'
  },

  // Slice 4 — Impact preview panel
  impactPreview: {
    triggerLabel: 'Ver impacto',
    triggerLoadingLabel: 'Calculando…',
    panelTitle: 'Impacto estimado',
    affectedQuotesLabel: 'Cotizaciones afectadas',
    affectedQuotesCountLabel: (n: number) => `${n} activa${n === 1 ? '' : 's'}`,
    affectedQuotesPipelineLabel: 'Monto en pipeline',
    affectedDealsLabel: 'Deals vinculados',
    affectedDealsCountLabel: (n: number) => `${n} deal${n === 1 ? '' : 's'}`,
    sampleQuotesLabel: 'Muestra',
    noImpactLabel: 'Sin impacto detectado sobre cotizaciones activas.',
    warningsLabel: 'Advertencias del validador',
    highImpactLabel: 'Impacto alto — requiere confirmación',
    highImpactCheckboxLabel: 'Entiendo el impacto y quiero continuar',
    blockingSaveCta: 'Confirmar impacto alto',
    blockingSaveToast: 'Confirma el impacto alto en el panel antes de guardar en esta pestaña.',
    refreshLabel: 'Recalcular',
    errorLoadingLabel: 'No pudimos calcular el impacto. Intenta de nuevo.'
  },

  // Slice 5 — Approvals queue (maker-checker)
  approvals: {
    navLabel: 'Aprobaciones pendientes',
    navDescription: 'Cambios críticos que esperan revisión de un segundo admin.',
    pageTitle: 'Aprobaciones de catálogo',
    pageSubtitle:
      'Cambios high/critical aplicados por el catálogo requieren la revisión de un segundo efeonce_admin antes de tomar efecto.',
    emptyStateTitle: 'Sin aprobaciones pendientes',
    emptyStateSubtitle: 'Cuando alguien proponga un cambio crítico, aparecerá acá.',
    statusLabel: 'Estado',
    proposerLabel: 'Propuesto por',
    reviewerLabel: 'Revisado por',
    criticalityLabel: 'Criticidad',
    criticalityCritical: 'Crítica',
    criticalityHigh: 'Alta',
    criticalityMedium: 'Media',
    criticalityLow: 'Baja',
    statusPending: 'Pendiente',
    statusApproved: 'Aprobada',
    statusRejected: 'Rechazada',
    statusCancelled: 'Cancelada',
    diffPreviewLabel: 'Cambio propuesto',
    justificationLabel: 'Justificación',
    justificationMissing: 'Sin justificación',
    approveCta: 'Aprobar',
    rejectCta: 'Rechazar',
    cancelCta: 'Cancelar propuesta',
    commentLabel: 'Comentario',
    commentPlaceholder: 'Ej. Aprobado tras validar con Finance.',
    commentRequiredError: 'El comentario es obligatorio para registrar la decisión.',
    commentTooShortError: (min: number) => `Mínimo ${min} caracteres.`,
    approveSuccessToast: 'Cambio aprobado y aplicado.',
    rejectSuccessToast: 'Propuesta rechazada.',
    cancelSuccessToast: 'Propuesta cancelada.',
    errorSelfApprove: 'No podés aprobar tus propias propuestas.',
    errorGenericToast: 'No se pudo completar la decisión. Intenta de nuevo.',
    proposedBannerTitle: 'Cambio propuesto para revisión',
    proposedBannerSubtitle: 'Otro efeonce_admin debe aprobarlo antes de que tome efecto.',
    proposedJustificationLabel: 'Justificación del cambio',
    proposedJustificationPlaceholder: 'Ej. Ajuste solicitado por Finance por revisión Q2.',
    proposedJustificationRequiredError: 'La justificación es obligatoria para cambios high/critical.'
  },

  // Slice 6 — Excel roundtrip
  excel: {
    exportCta: 'Exportar catálogo a Excel',
    exportingLabel: 'Generando Excel…',
    exportErrorToast: 'No pudimos generar el Excel. Intenta de nuevo.',
    importNavLabel: 'Importar catálogo',
    importNavDescription: 'Subir Excel + previsualizar cambios + aplicar selectivamente.',
    importPageTitle: 'Importar catálogo desde Excel',
    importPageSubtitle:
      'Subí un archivo Excel con el formato de export. Mostramos el diff contra el estado actual antes de aplicar cualquier cambio.',
    dropzoneLabel: 'Arrastra el archivo Excel o hacé click para seleccionar',
    dropzoneInvalidType: 'Solo se aceptan archivos .xlsx',
    uploadingLabel: 'Procesando archivo…',
    parseErrorLabel: 'No pudimos leer el archivo. Revisá que tenga el formato correcto.',
    diffSectionTitle: 'Diff del catálogo',
    noDiffsLabel: 'No hay cambios entre el archivo y el estado actual.',
    diffActionCreate: 'Crear',
    diffActionUpdate: 'Actualizar',
    diffActionDelete: 'Eliminar',
    diffActionNoop: 'Sin cambios',
    diffStatusApplyNow: 'Aplicable ahora',
    diffStatusNeedsFollowup: 'Requiere follow-up',
    diffStatusNoChanges: 'Sin acción',
    selectDiffLabel: 'Aplicar',
    skipDiffLabel: 'Saltar',
    applySelectedCta: 'Aplicar cambios seleccionados',
    proposeApprovalCta: 'Proponer aprobación',
    applyingLabel: 'Aplicando…',
    proposingLabel: 'Proponiendo…',
    diffSummaryProcessedLabel: (processed: number) =>
      `${processed} fila${processed === 1 ? '' : 's'} procesada${processed === 1 ? '' : 's'}`,
    diffSummaryApplicableLabel: (count: number) =>
      `${count} update${count === 1 ? '' : 's'} aplicable${count === 1 ? '' : 's'} ahora`,
    diffSummaryProposalLabel: (count: number) =>
      `${count} cambio${count === 1 ? '' : 's'} listo${count === 1 ? '' : 's'} para aprobación`,
    diffSummaryNeedsFollowupLabel: (count: number) =>
      `${count} cambio${count === 1 ? '' : 's'} requiere${count === 1 ? '' : 'n'} otra vía`,
    updatesOnlyBannerTitle: 'Esta pantalla aplica solo updates sobre entidades existentes',
    updatesOnlyBannerBody: (approvalReady: number) =>
      approvalReady > 0
        ? 'Los updates seleccionados aplican directo. Las altas y bajas seleccionadas van por propuesta de aprobación antes de persistirse.'
        : 'Los updates seleccionados aplican directo. Las altas y bajas necesitan pasar por propuesta de aprobación antes de persistirse.',
    approvalFollowupTitle: 'El batch incluye cambios que no se aplican desde Excel',
    approvalFollowupBody: (createCount: number, deleteCount: number) => {
      const parts = []

      if (createCount > 0) parts.push(`${createCount} alta${createCount === 1 ? '' : 's'}`)
      if (deleteCount > 0) parts.push(`${deleteCount} baja${deleteCount === 1 ? '' : 's'}`)

      return `${parts.join(' y ')} requieren revisión desde Admin / governance antes de persistirlas. Selecciónalas y usa "Proponer aprobación" para enviarlas a la cola.`
    },
    approvalQueueCta: 'Abrir cola de aprobaciones',
    followupCreateLabel: 'Alta nueva: selecciónala para mandarla a aprobación.',
    followupDeleteLabel: 'Eliminación pendiente: selecciónala para mandarla a aprobación.',
    applyReadyHelper: 'Update sobre una entidad existente.',
    applySuccessToast: (n: number) => `${n} ${n === 1 ? 'cambio aplicado' : 'cambios aplicados'}.`,
    applyPartialToast: (ok: number, failed: number) =>
      `${ok} aplicados, ${failed} con error.`,
    applyErrorToast: 'No pudimos aplicar los cambios. Intenta de nuevo.',
    proposeSuccessToast: (n: number) =>
      `${n} ${n === 1 ? 'propuesta enviada a aprobación' : 'propuestas enviadas a aprobación'}.`,
    proposeErrorToast: 'No pudimos crear las propuestas de aprobación. Intenta de nuevo.',
    sheetLabels: {
      roles: 'Roles',
      tools: 'Herramientas',
      overheads: 'Overhead addons',
      services: 'Servicios',
      employmentTypes: 'Modalidades',
      roleTierMargins: 'Tier margins (roles)',
      serviceTierMargins: 'Tier margins (servicios)',
      commercialModels: 'Modelos comerciales',
      countryFactors: 'Factores país',
      fteHoursGuide: 'Guía FTE',
      metadata: 'Metadata'
    }
  }
} as const
