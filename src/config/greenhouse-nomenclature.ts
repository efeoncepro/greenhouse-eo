export const GH_CLIENT_NAV = {
  dashboard: { label: 'Pulse', subtitle: 'Vista general de tu operacion' },
  projects: { label: 'Proyectos', subtitle: 'Proyectos activos' },
  sprints: { label: 'Ciclos', subtitle: 'Sprints de produccion' },
  settings: { label: 'Mi Greenhouse', subtitle: 'Perfil y preferencias' },
  updates: { label: 'Updates', subtitle: 'Novedades del ecosistema' }
} as const

// Internal/admin surfaces are operational runtime, not part of the client portal
// nomenclature contract defined in Greenhouse_Nomenclatura_Portal_v3.md.
export const GH_INTERNAL_NAV = {
  internalDashboard: { label: 'Control Tower', subtitle: 'Operacion interna de spaces' },
  adminTenants: { label: 'Spaces', subtitle: 'Spaces, acceso y gobierno del portal' },
  adminUsers: { label: 'Usuarios', subtitle: 'Acceso, roles y scopes visibles' },
  adminRoles: { label: 'Roles y permisos', subtitle: 'Gobernanza operativa del portal' }
} as const

export const GH_LABELS = {
  kpi_rpa: 'RpA promedio',
  kpi_active: 'Assets activos',
  kpi_completed: 'Deliveries del periodo',
  kpi_feedback: 'Feedback pendiente',
  kpi_otd: 'OTD%',

  semaphore_green: 'Optimo',
  semaphore_yellow: 'Atencion',
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
  label_fte: 'Dedicacion',
  label_service_line: 'Linea de servicio',
  label_modality: 'Modalidad',
  expand_title: 'Ampliar equipo',
  expand_subtitle: 'Agrega capacidad creativa, de medios o tecnologia.',

  capacity_title: 'Capacidad del equipo',
  capacity_subtitle: 'Carga operativa basada en proyectos y tareas activas',
  label_contracted: 'Capacidad contratada',
  label_hours: 'Horas este mes',
  label_utilization: 'Utilizacion',
  label_load: 'Carga por persona',

  project_team_title: 'Equipo en este proyecto',

  sprint_vel_title: 'Velocity por persona',
  sprint_vel_subtitle: 'Rendimiento del equipo en este ciclo',

  cta_title: 'Tu equipo esta al {percent}% de capacidad este mes',
  cta_subtitle: 'Si tienes necesidades adicionales, puedes sumar capacidad On-Demand sin afectar tu equipo actual.',
  cta_button: 'Ampliar capacidad',

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
  login_title: 'Entra al Greenhouse',
  login_subtitle: 'Tu espacio de crecimiento te espera',
  login_button: 'Entrar',
  logout_button: 'Salir del Greenhouse',
  login_with_microsoft: 'Entrar con Microsoft',
  login_with_email: 'Entrar con email',
  login_validating: 'Validando acceso...',
  login_email_placeholder: 'Tu email corporativo',
  login_password_placeholder: 'Password',
  login_error_credentials:
    'Las credenciales no coinciden. Intenta de nuevo o contacta a tu equipo de cuenta.',
  login_access_note:
    'El acceso al portal se provisiona internamente. Si tu cuenta aun no aparece, contacta a tu equipo de cuenta.',
  login_microsoft_unavailable:
    'Microsoft SSO aun no esta configurado en este ambiente. Puedes usar credenciales mientras se cargan AZURE_AD_CLIENT_ID y AZURE_AD_CLIENT_SECRET.',

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
  tooltip_semaphore_green: 'Optimo: la operacion esta dentro de los estandares ICO.',
  tooltip_semaphore_yellow:
    'Atencion: algunos indicadores se acercan al limite. Tu equipo de cuenta ya esta al tanto.',
  tooltip_semaphore_red:
    'Alerta: indicadores fuera de rango. Tu equipo de cuenta te contactara con un action plan.',
  tooltip_utilization: 'Estimacion de uso basada en la carga operativa actual del equipo.',

  footer: 'Efeonce Greenhouse | El ambiente disenado para que tu marca crezca',
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
  settings_account_linked: 'Cuenta vinculada',
  settings_account_unlinked: 'Sin vinculo Microsoft',
  settings_verified: 'Verificado',
  settings_link_microsoft: 'Vincular cuenta Microsoft',
  settings_microsoft_unavailable:
    'El provider Microsoft no esta configurado en este ambiente, por lo que el vinculo SSO no se puede iniciar desde aqui todavia.',
  settings_access_method_label: 'Metodo de acceso activo',
  settings_provider_credentials: 'Email y password',
  settings_provider_microsoft: 'Microsoft SSO',

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

  admin_user_detail_job_title_empty: 'Sin cargo registrado',
  admin_user_detail_project_scope: 'Project scope',
  admin_user_detail_campaign_scope: 'Campaign scope',
  admin_user_detail_details_title: 'Detalles',
  admin_user_detail_label_public_id: 'Collaborator ID:',
  admin_user_detail_label_identity_id: 'EO-ID:',
  admin_user_detail_label_username: 'Username:',
  admin_user_detail_label_client: 'Cliente:',
  admin_user_detail_label_home: 'Portal home:',
  admin_user_detail_label_status: 'Status:',
  admin_user_detail_label_role: 'Role:',
  admin_user_detail_label_timezone: 'Timezone:',
  admin_user_detail_label_locale: 'Locale:',
  admin_user_detail_label_hubspot: 'HubSpot company:',
  admin_user_detail_no_role: 'Sin rol asignado',
  admin_user_detail_no_timezone: 'Sin timezone',
  admin_user_detail_no_locale: 'Sin locale',
  admin_user_detail_no_hubspot: 'Sin company mapping',
  admin_user_detail_resend_onboarding: 'Reenviar onboarding',
  admin_user_detail_review_access: 'Revisar acceso',
  admin_user_detail_context_title: 'Tenant operating context',
  admin_user_detail_project_coverage: 'Cobertura de proyectos',
  admin_user_detail_active_projects: (count: number) => `${count} activos`,
  admin_user_detail_route_groups: 'Route groups',
  admin_user_detail_no_route_groups: 'Sin route groups.',
  admin_user_detail_feature_flags: 'Feature flags',
  admin_user_detail_no_feature_flags: 'Sin feature flags.',
  admin_user_detail_tab_overview: 'Overview',
  admin_user_detail_tab_security: 'Security',
  admin_user_detail_tab_tenant: 'Tenant',
  admin_user_detail_tab_billing: 'Commercial',
  admin_user_detail_campaign_context_title: 'Campaign and feature context',
  admin_user_detail_campaign_count: (count: number) => `Campanas visibles: ${count}`,
  admin_user_detail_no_campaign_scopes: 'Sin scopes de campana activos.',
  admin_user_detail_access_profile_title: 'Access profile',
  admin_user_detail_auth_mode: 'Auth mode',
  admin_user_detail_password_algorithm: 'Password algorithm',
  admin_user_detail_last_login: 'Last login',
  admin_user_detail_invited_at: 'Invited at',
  admin_user_detail_roles: 'Roles',
  admin_user_detail_no_roles: 'Sin roles asignados.',
  admin_user_detail_audit_title: 'Audit readiness',
  admin_user_detail_created: 'Created',
  admin_user_detail_updated: 'Updated',
  admin_user_detail_tenant_relationship_title: 'Tenant relationship',
  admin_user_detail_primary_contact: 'Contacto principal',
  admin_user_detail_no_contact: 'Sin contacto registrado',
  admin_user_detail_space_id: 'Space ID',
  admin_user_detail_internal_key: 'Internal key',
  admin_user_detail_platform_features_title: 'Platform features',
  admin_user_detail_platform_features_subtitle:
    'Estos flags y rutas controlan la experiencia real del usuario dentro del portal Greenhouse.',
  admin_user_detail_no_active_feature_flags: 'Sin feature flags activos.',
  admin_user_detail_current_home: 'Portal home actual',
  admin_user_detail_commercial_chip: 'Commercial context',
  admin_user_detail_commercial_pending: '$Pending',
  admin_user_detail_commercial_ready: '$HubSpot',
  admin_user_detail_commercial_subtitle:
    'Esta tarjeta reserva el espacio del patron Vuexy para fee, invoices y plan contratado cuando exista la integracion comercial.',
  admin_user_detail_commercial_readiness: 'Preparacion comercial',
  admin_user_detail_commercial_title: 'Commercial context',
  admin_user_detail_commercial_body:
    'Este tab reutiliza la idea de billing-plans de Vuexy, pero en Greenhouse se usara para invoices, fee, plan contratado y contexto comercial del cliente.',
  admin_user_detail_primary_contact_label: 'Primary contact',
  admin_user_detail_current_status: 'Estado actual',
  admin_user_detail_no_invoices: 'Sin invoices integradas todavia',
  admin_user_detail_tenant_type: 'Tenant type'
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

  semantic: {
    success: { source: '#6ec207', bg: '#f3faeb', text: '#6ec207' },
    warning: { source: '#ff6500', bg: '#fff2ea', text: '#ff6500' },
    danger: { source: '#bb1954', bg: '#f9ecf1', text: '#bb1954' },
    info: { source: '#0375db', bg: '#eaf3fc', text: '#0375db' }
  },

  neutral: {
    textPrimary: '#022a4e',
    textSecondary: '#848484',
    border: '#dbdbdb',
    bgSurface: '#f7f7f5'
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
  }
} as const
