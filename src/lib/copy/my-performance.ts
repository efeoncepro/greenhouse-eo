export const GH_MY_PERFORMANCE = {
  title: 'Mi desempeño',
  subtitle: 'Métricas ICO y Nexa Insights para leer tu actividad del período.',
  visualDirection: 'Tablero de foco personal',
  period: 'Período',
  statusCurrent: 'Período en curso',
  statusPartial: 'Datos parciales',
  refresh: 'Actualizar datos',
  focusSummary: 'Resumen de foco',
  nexaTitle: 'Nexa Insights',
  nexaSubtitle: 'Lectura operativa para priorizar el período.',
  nexaSummary: 'Resumen',
  nexaHistory: 'Historial',
  icoMetrics: 'Métricas ICO',
  trends: 'Tendencia mensual',
  activity: 'Actividad del período',
  activitySubtitle: 'Cierres y carga activa que alimentan tus métricas del período.',
  operationalHealth: 'Salud operativa',
  operationalHealthSubtitle: 'OTD, FTR y flujo normalizados sobre 100.',
  cscDistribution: 'Distribución CSC',
  cscDistributionSubtitle: 'Cierres por centro operativo.',
  velocity: 'Velocidad',
  partialAlert:
    'Este período sigue en curso. Los valores pueden cambiar cuando entren nuevos cierres.',
  advisoryNote:
    'Nexa Insights es una lectura operativa personal. No reemplaza procesos HR ni crea acciones formales.',
  safeMentions: 'Menciones seguras',
  updated: 'Actualizado',
  justNow: 'recién ahora',
  scoreSuffix: '/100 score',
  scoreValueLabel: 'Score',
  cscCenterLabel: 'cierres',
  noClosures: 'Sin cierres',
  noMeasure: 'Sin medición',
  loadingLabel: 'Cargando tu desempeño…',
  emptyTitle: 'Todavía no hay métricas de este período',
  emptyDescription: 'Cuando entren cierres de tus tareas, acá vas a ver tu actividad y tus Nexa Insights.',
  degradedAlert: 'Algunas fuentes no respondieron a tiempo. Te mostramos lo disponible; vuelve a actualizar en un momento.',
  pendingClosuresAlert: 'Tienes trabajo comprometido pero todavía sin cierres. La calidad se calcula a medida que entran.',
  statusChip: {
    current_partial: 'En curso',
    closed_snapshot: 'Cerrado',
    no_data: 'Sin datos',
    degraded: 'Datos degradados'
  },
  focus: {
    otd: { label: 'Entrega a tiempo', flowUnit: 'cierres' },
    ftr: { label: 'Calidad primera entrega', flowUnit: 'cierres' },
    flow: { label: 'Flujo operativo', flowUnit: 'cierres' }
  },
  // Coaching breve, accionable, por zona (sin "evaluación"). Nunca solo color.
  coaching: {
    otd: {
      optimal: 'Vas a tiempo. Mantén la entrega antes de fecha.',
      attention: 'Algunas entregas se acercan al límite. Prioriza las de fecha más próxima.',
      critical: 'Hay entregas fuera de fecha. Empieza por las vencidas.',
      none: 'Sin cierres aún para medir puntualidad.'
    },
    ftr: {
      optimal: 'Buena calidad de primera entrega. Sigue revisando antes de enviar.',
      attention: 'Aparecen rebotes. Revisa el brief antes de mandar a aprobación.',
      critical: 'Varias piezas volvieron con cambios. Refuerza la revisión interna.',
      none: 'Sin cierres aún para medir calidad.'
    },
    flow: {
      optimal: 'Buen ritmo de cierres este período.',
      attention: 'El ritmo bajó. Revisa qué tareas están frenadas.',
      critical: 'Pocos cierres este período. Mira tus Stuck Assets.',
      none: 'Sin cierres registrados todavía.'
    }
  },
  kpiHelper: {
    rpa: 'Rondas de aprobación por pieza',
    otd: 'Entregas dentro de fecha',
    ftr: 'Aprobadas sin cambios',
    throughput: 'Cierres del período',
    cycleTime: 'Días promedio por pieza',
    stuckAssets: 'Piezas frenadas a priorizar'
  },
  aria: {
    nexaMode: 'Modo de Nexa Insights',
    radar: 'Radar de salud operativa personal, normalizado sobre 100',
    csc: 'Distribución CSC: 24 cierres',
    safeMention: 'Mención segura sin navegación',
    updating: 'Actualizando métricas e insights'
  },
  targets: {
    otd: 'On-Time Delivery',
    ftr: 'First Time Right',
    flow: 'Throughput'
  },
  metrics: {
    rpa: 'RpA',
    otd: 'OTD%',
    ftr: 'FTR%',
    throughput: 'Throughput',
    cycleTime: 'Cycle Time',
    stuckAssets: 'Stuck Assets'
  },
  activityLabels: {
    closures: 'Cierres',
    newAssets: 'Nuevos activos',
    inProgress: 'En proceso',
    stuck: 'Stuck Assets',
    total: 'Tareas totales',
    completed: 'Completadas',
    active: 'Activas',
    carryOver: 'Carry-over'
  }
} as const
