export const GH_NAV = {
  dashboard: { label: 'Pulse', subtitle: 'Vista general de tu operacion' },
  projects: { label: 'Proyectos', subtitle: 'Proyectos activos' },
  sprints: { label: 'Ciclos', subtitle: 'Sprints de produccion' },
  settings: { label: 'Mi Greenhouse', subtitle: 'Perfil y preferencias' },
  internalDashboard: { label: 'Control Tower', subtitle: 'Operacion interna de spaces' },
  adminSpaces: { label: 'Admin Spaces', subtitle: 'Spaces, acceso y modulos' },
  adminUsers: { label: 'Admin Users', subtitle: 'Usuarios, scopes y acceso' },
  adminRoles: { label: 'Roles & Permissions', subtitle: 'Gobernanza del portal' },
  updates: { label: 'Updates', subtitle: 'Novedades del ecosistema' }
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
  sprint_burndown: 'Burndown'
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
  cta_button: 'Ampliar capacidad'
} as const

export const GH_MESSAGES = {
  login_title: 'Entra al Greenhouse',
  login_subtitle: 'Tu espacio de crecimiento te espera',
  login_button: 'Entrar',
  logout_button: 'Salir del Greenhouse',
  login_with_microsoft: 'Entrar con Microsoft',
  login_with_email: 'Entrar con email',
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

  loading_initial: 'Preparando tu Greenhouse...',
  loading_data: 'Cargando datos...',
  error_connection: 'No pudimos conectar con tus datos. Intenta de nuevo en unos minutos.',
  error_no_data: 'Sin datos para este periodo',
  error_projects_live: 'No pudimos cargar datos live de proyectos para tu space.',

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

  settings_identity_title: 'Tu perfil',
  settings_identity_subtitle:
    'Revisa como esta vinculada tu identidad de acceso dentro de Greenhouse.',
  settings_preferences_title: 'Preferences',
  settings_preferences_subtitle: 'Ajusta tus preferencias de visibilidad del servicio.',
  settings_digest_title: 'Weekly client digest',
  settings_digest_description: 'Send a concise Friday summary of cycle status, review pressure, and unresolved feedback.',
  settings_alerts_title: 'Comment escalation alerts',
  settings_alerts_description: 'Highlight when unresolved feedback crosses the threshold agreed with your account team.',
  settings_risk_title: 'Delivery health score',
  settings_risk_description: 'Expose an executive-friendly score that blends throughput, review rounds, and overdue work.',
  settings_account_linked: 'Cuenta vinculada',
  settings_account_unlinked: 'Sin vinculo Microsoft',
  settings_verified: 'Verificado',
  settings_link_microsoft: 'Vincular cuenta Microsoft',
  settings_microsoft_unavailable:
    'El provider Microsoft no esta configurado en este ambiente, por lo que el vinculo SSO no se puede iniciar desde aqui todavia.',

  sprints_cycle_active_title: 'Ciclo 19: Review compression window',
  sprints_cycle_active_description:
    'El ciclo actual mantiene buen ritmo de produccion, pero las rondas de feedback se estan concentrando al cierre.',
  sprints_progress_label: 'Avance',
  sprints_deliveries_metric: 'Deliveries del periodo',
  sprints_blocked_metric: 'Items bloqueados',
  sprints_history_title: 'Ciclos anteriores',

  request_dialog_title: 'Que necesitas?',
  request_dialog_description:
    'Describe el perfil, la capacidad o la herramienta que buscas. Podras copiar este mensaje y compartirlo con tu equipo de cuenta.',
  request_dialog_placeholder:
    'Describe el perfil o la capacidad que buscas. Tu equipo de cuenta te contactara.',
  request_dialog_copied: 'Solicitud lista para compartir con tu equipo de cuenta.',
  request_dialog_close: 'Cerrar',
  request_dialog_copy: 'Copiar solicitud'
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
