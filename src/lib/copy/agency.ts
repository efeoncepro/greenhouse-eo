/**
 * TASK-811 — domain microcopy extracted from src/config/greenhouse-nomenclature.ts.
 *
 * This module keeps domain-specific visible copy out of the product
 * nomenclature/navigation contract while preserving type-safe GH_* ergonomics.
 * Do not rewrite strings in this file as part of trim-only work.
 */

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
