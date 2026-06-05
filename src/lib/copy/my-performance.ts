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
