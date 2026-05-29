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
  sampleSprints: { label: 'Sample Sprints', subtitle: 'Pilotos, trials y discovery comerciales' },
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

export const GH_COMMERCIAL_NAV = {
  root: { label: 'Comercial', subtitle: 'Pipeline, acuerdos y catálogo vendible' },
  pipeline: { label: 'Pipeline', subtitle: 'Forecast comercial y oportunidades activas' },
  quotes: { label: 'Cotizaciones', subtitle: 'Propuestas comerciales y aprobación' },
  contracts: { label: 'Contratos', subtitle: 'Contratos, SOWs y renovaciones activas' },
  masterAgreements: { label: 'Acuerdos marco', subtitle: 'MSAs y cláusulas maestras' },
  sampleSprints: { label: 'Sample Sprints', subtitle: 'Pilotos, trials y discovery comerciales' },
  products: { label: 'Productos', subtitle: 'Catálogo vendible sincronizado con HubSpot' }
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
  documents: { label: 'Documentos', subtitle: 'OC, HES y conciliación' },
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
  workforceActivation: { label: 'Workforce Activation', subtitle: 'Habilitación laboral y blockers' },
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
  paymentProfile: { label: 'Mi Cuenta de Pago', subtitle: 'Donde recibes tus pagos' },
  leave: { label: 'Mis Permisos', subtitle: 'Saldos y solicitudes' },
  goals: { label: 'Mis Objetivos', subtitle: 'OKRs y key results del ciclo' },
  evaluations: { label: 'Mis Evaluaciones', subtitle: 'Feedback 360 y resultados' },
  organization: { label: 'Mi Organización', subtitle: 'Directorio y colegas' },
  settings: { label: 'Configuración', subtitle: 'Notificaciones y preferencias' }
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
  empty_description: 'Nexa analiza automáticamente las señales del ICO Engine después de cada sincronización. Las señales aparecerán aquí cuando estén listas.',

  // ─── TASK-945 — Signal lifecycle (sparkline + resolved badge) ────────────
  severity_label: {
    critical: 'Crítico',
    warning: 'Atención',
    info: 'Informativo',
    ok: 'Óptimo'
  } as Record<string, string>,
  severity_label_unknown: 'Sin clasificar',

  lifecycle_status_active: 'Activa',
  lifecycle_status_resolved: 'Resuelta',
  lifecycle_resolved_badge: 'Resuelta',
  lifecycle_resolved_relative: (when: string) => `Resuelta hace ${when}`,
  lifecycle_sparkline_series_label: 'Severidad',
  lifecycle_sparkline_aria_label: (count: number, lastSeverity: string) =>
    `Evolución de severidad: ${count} ${count === 1 ? 'observación' : 'observaciones'}. Última: ${lastSeverity}.`,
  lifecycle_observations_count: (n: number) =>
    `${n} ${n === 1 ? 'observación' : 'observaciones'} este período`,

  // ─── TASK-946 — Honest degradation states (4 canonical UI states) ────────
  state_empty_pending_title: 'Aún sin observaciones para este período',
  state_empty_pending_description:
    'El análisis diario corre en la madrugada. Volvé en unas horas.',
  state_empty_positive_title: 'Sin anomalías detectadas',
  state_empty_positive_description:
    'Nexa analizó las señales del período y no encontró desviaciones. Salud operativa OK.',
  state_stale_degraded_title: 'Análisis del pipeline pausado',
  state_stale_degraded_description: (hours: number) =>
    `Sin observaciones nuevas en las últimas ${hours} horas. El pipeline puede estar caído — revisá el estado del cron diario antes de asumir que todo está sano.`,
  state_stale_degraded_action: 'Ver estado del pipeline',
  state_loading_aria: 'Cargando observaciones de Nexa',

  // ── TASK-947 — Detail page /nexa/insights/[id] microcopy canonical (es-CL tuteo) ──

  // Title + chrome
  detail_title_template: (metricLabel: string) => `Causa raíz · ${metricLabel}`,
  detail_back_to_home: 'Volver a Home',
  detail_last_updated: (label: string) => `Última actualización ${label}`,

  // Section cards
  detail_section_anomaly_title: 'Anomalía observada',
  detail_section_root_cause_title: 'Causa raíz',
  detail_section_action_title: 'Acción sugerida',

  // CTAs + feedback
  detail_action_view_metric: 'Ver KPI',
  detail_action_copy_link: 'Copiar enlace',
  detail_action_copy_link_success: 'Enlace copiado al portapapeles',
  detail_action_copy_link_failure: 'No pudimos copiar el enlace. Probá de nuevo.',

  // Metadata accordion
  detail_metadata_title: 'Detalle técnico',
  detail_metadata_label_enrichment_id: 'ID del análisis',
  detail_metadata_label_signal_id: 'ID de la señal',
  detail_metadata_label_processed_at: 'Procesado',
  detail_metadata_label_confidence: 'Confianza del modelo',
  detail_metadata_label_quality_score: 'Puntaje de calidad',
  detail_metadata_label_signal_type: 'Tipo de señal',
  detail_metadata_label_metric: 'Métrica',
  detail_metadata_label_period: 'Período',

  // Severity aria helper (severity_label + severity_color ya existen arriba)
  detail_aria_severity: (label: string) => `Severidad: ${label}`,

  // Banner: superseded (TASK-946 state mapping)
  detail_banner_superseded_title: 'Estás viendo una versión histórica de esta observación',
  detail_banner_superseded_body:
    'Nexa ya analizó esta señal de nuevo. La narrativa actual puede haber cambiado.',
  detail_banner_superseded_cta: 'Ver versión actual',

  // Banner: degraded (honest)
  detail_banner_degraded_title: 'No pudimos cargar toda la información',
  detail_banner_degraded_body:
    'El pipeline de Nexa devolvió una respuesta parcial. Probá de nuevo en unos minutos o revisá el estado del sistema.',
  detail_banner_degraded_cta: 'Ver estado del sistema',

  // Empty: expired (anomaly resolved — empty-positive)
  detail_expired_title: 'Anomalía resuelta',
  detail_expired_body: (when: string) =>
    `Nexa observó esta señal por última vez el ${when}. Ya no aparece en el período actual.`,

  // Not-found page (anti-oracle TASK-872: indistinguishable from no-access)
  detail_not_found_title: 'No encontramos esta observación',
  detail_not_found_body:
    'Es posible que el ID no exista, que la observación se haya archivado o que no tengas acceso a ella.',
  detail_not_found_cta: 'Volver a Home',

  // Error boundary
  detail_error_title: 'No pudimos cargar esta observación',
  detail_error_body: 'Algo salió mal de nuestro lado. Probá actualizar en unos segundos.',
  detail_error_cta: 'Reintentar',

  // Loading + skeleton aria
  detail_loading_aria: 'Cargando observación de Nexa'
} as const

/* ─────────────────── Skills & Certifications ─────────────────── */

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
