/**
 * TASK-811 — domain microcopy extracted from src/config/greenhouse-nomenclature.ts.
 *
 * This module keeps domain-specific visible copy out of the product
 * nomenclature/navigation contract while preserving type-safe GH_* ergonomics.
 * Do not rewrite strings in this file as part of trim-only work.
 */

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
  settings_locale_title: 'Idioma del portal',
  settings_locale_description:
    'Define el idioma que Greenhouse usara para tu sesion. Si no eliges uno, se usa el default de tu space.',
  settings_locale_label: 'Idioma',
  settings_locale_loading: 'Cargando idioma...',
  settings_locale_saving: 'Guardando idioma...',
  settings_locale_saved: 'Idioma guardado.',
  settings_locale_error: 'No pudimos guardar el idioma. Intenta de nuevo.',
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

/**
 * TASK-827 Slice 1 — Microcopy del Composition Layer del Client Portal.
 *
 * Cubre los 5 estados canónicos del 5-state contract (§13 spec V1):
 *   - loading: aria-label cuando el resolver fetch tarda (raro, cache TTL 60s)
 *   - empty (zero-state): cliente activo con modules.length === 0
 *   - not_assigned: cliente intentó acceder ruta cuyo viewCode no está en su set
 *   - degraded: resolver parcial (algunos modules failed silently)
 *   - error: resolver falló completo → redirect a /home con error toast
 *
 * + `modulePublicLabels`: mapping slug user-facing → nombre comercial + bundle
 * hint para renderizar `<ModuleNotAssignedEmpty>` con copy correcto. NUNCA leak
 * `module_key` técnico (e.g. `creative_hub_globe_v1`) al usuario.
 *
 * Validado por skill `greenhouse-ux-writing`:
 *   - Tono: warm-but-professional, no-blame, recoverable
 *   - es-CL tuteo standard (NO voseo rioplatense)
 *   - Sentence case
 *   - Anatomía 5-elementos (icon + title + body + primary CTA + secondary CTA)
 *   - Specific, no generic ("Solicitar acceso" no "Aceptar")
 *
 * Patrón TASK-265: copy de dominio reusable vive en `src/lib/copy/<domain>.ts`.
 */
export const GH_CLIENT_PORTAL_COMPOSITION = {
  loading: {
    ariaLabel: 'Cargando tu portal'
  },

  navigation: {
    /** ARIA label del `<nav>` container del menú dinámico cliente (Slice 3). */
    ariaLabel: 'Navegación del portal cliente',
    /** Tier badge label para items de tipo addon. */
    addonBadge: 'Addon',
    /** Empty state inline cuando items.length === 0 (modules.length === 0). */
    emptyMessage: 'Sin módulos asignados todavía'
  },

  navigationGroups: {
    primary: 'Operación',
    capabilities: 'Módulos',
    account: 'Mi cuenta'
  },

  emptyState: {
    zeroState: {
      icon: 'tabler-seedling',
      title: 'Bienvenido a Greenhouse',
      body: 'Tu cuenta está activada. Tu account manager está configurando tus accesos. Te avisaremos por email cuando esté listo.',
      primaryCta: 'Hablar con mi account manager',
      secondaryCta: 'Ver mi cuenta'
    },

    notAssigned: {
      icon: 'tabler-lock',
      title: (moduleName: string) => `${moduleName} aún no está activo en tu cuenta`,
      body: (moduleName: string, bundleHint: string) =>
        `${moduleName} ${bundleHint}. Si te interesa conocerlo, escríbele a tu account manager.`,
      primaryCta: 'Solicitar acceso',
      secondaryCta: 'Volver al inicio',
      mailtoSubjectPrefix: 'Solicitud de acceso —'
    }
  },

  degraded: {
    bannerTitle: 'Portal en modo degradado',
    bannerBody:
      'Algunos módulos no están disponibles temporalmente. Estamos renderizando solo los que sí están disponibles. Si esto persiste, tu account manager te contactará.',
    retryCta: 'Volver a intentar'
  },

  error: {
    toast: 'No pudimos cargar tu portal. Vuelve a intentar en unos segundos.',
    fallbackTitle: 'Algo salió mal de nuestro lado',
    fallbackBody:
      'Te llevamos al inicio mientras lo resolvemos. Si el problema persiste, escríbele a tu account manager.',
    fallbackCta: 'Ir al inicio'
  },

  /**
   * Mapping slug user-facing → nombre comercial + bundle hint. La key es el
   * slug que aparece en `?denied=<slug>` (output de `mapViewCodeToPublicSlug`,
   * Slice 4). Se renderiza en `<ModuleNotAssignedEmpty>` invocando
   * `emptyState.notAssigned.title(name)` + `body(name, bundleHint)`.
   *
   * Cuando emerja un módulo nuevo: agregar entry aquí + slug en el helper
   * canónico. Sin entry, se usa `defaultLabel` (degradación honesta).
   */
  modulePublicLabels: {
    'creative-hub': {
      name: 'Creative Hub',
      bundleHint: 'se incluye en planes Globe'
    },
    'brand-intelligence': {
      name: 'Brand Intelligence',
      bundleHint: 'es un addon disponible para planes Globe'
    },
    'csc-pipeline': {
      name: 'CSC Pipeline',
      bundleHint: 'es un addon disponible para planes Globe'
    },
    'cvr-quarterly': {
      name: 'Creative Velocity Review trimestral',
      bundleHint: 'es un addon disponible para planes Globe'
    },
    'roi-reports': {
      name: 'ROI Reports y exports',
      bundleHint: 'se incluye en planes Globe Enterprise'
    },
    'exports': {
      name: 'Exports operativos',
      bundleHint: 'se incluye en el addon ROI Reports'
    },
    'staff-augmentation': {
      name: 'Visibilidad de Staff Augmentation',
      bundleHint: 'está disponible cuando contratas Staff Augmentation'
    },
    'crm-command': {
      name: 'CRM Command',
      bundleHint: 'es parte de CRM Solutions y está en transición a Kortex'
    },
    'web-delivery': {
      name: 'Web Delivery',
      bundleHint: 'se incluye en planes Wave'
    },
    'creative-hub-globe': {
      name: 'Creative Hub Globe',
      bundleHint: 'se incluye en planes Globe estándar'
    },
    pulse: {
      name: 'Pulse',
      bundleHint: 'está disponible para todas las cuentas activas'
    },
    equipo: {
      name: 'Tu equipo asignado',
      bundleHint: 'está disponible para todas las cuentas activas'
    }
  },

  /**
   * Fallback usado cuando `?denied=<slug>` no matchea ninguna entry de
   * `modulePublicLabels`. Degradación honesta: NUNCA blank, NUNCA module_key
   * técnico. El cliente ve un mensaje genérico recoverable.
   */
  defaultLabel: {
    name: 'Este módulo',
    bundleHint: 'no está disponible para tu plan actual'
  },

  /**
   * Labels usados en el `<ClientPortalNavigation>` (Slice 3) cuando un
   * `viewCode` está autorizado pero el `display_label_client` del módulo
   * no resolvió por algún motivo. Fallback estructural — NO debería verse en
   * producción si el seed está completo.
   */
  navItemFallbackLabel: 'Sección'
} as const
