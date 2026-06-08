// Nexa product microcopy canonical layer.
//
// TASK-811 keeps reusable domain microcopy under src/lib/copy/*;
// greenhouse-nomenclature.ts re-exports this object only as a transitional
// compatibility path for legacy importers.

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
  insights_total_analyzed: (count: number) => `${count} ${count === 1 ? 'señal analizada' : 'señales analizadas'}`,

  // View mode toggle (Recientes vs Historial)
  insights_view_mode_aria: 'Modo de visualización',
  insights_view_mode_recent: 'Recientes',
  insights_view_mode_timeline: 'Historial',
  insights_timeline_title: 'Historial de señales',
  insights_timeline_subtitle: (n: number) => `${n} ${n === 1 ? 'señal registrada' : 'señales registradas'}`,
  insights_timeline_empty_title: 'Aún no hay señales analizadas',
  insights_timeline_empty_description: 'Cuando Nexa procese nuevas señales, aparecerán aquí ordenadas por fecha.',
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
  empty_description:
    'Nexa analiza automáticamente las señales del ICO Engine después de cada sincronización. Las señales aparecerán aquí cuando estén listas.',

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
  lifecycle_observations_count: (n: number) => `${n} ${n === 1 ? 'observación' : 'observaciones'} este período`,

  // ─── TASK-946 — Honest degradation states (4 canonical UI states) ────────
  state_empty_pending_title: 'Aún sin observaciones para este período',
  state_empty_pending_description: 'El análisis diario corre en la madrugada. Vuelve en unas horas.',
  state_empty_positive_title: 'Sin anomalías detectadas',
  state_empty_positive_description:
    'Nexa analizó las señales del período y no encontró desviaciones. Salud operativa OK.',
  state_stale_degraded_title: 'Análisis del pipeline pausado',
  state_stale_degraded_description: (hours: number) =>
    `Sin observaciones nuevas en las últimas ${hours} horas. El pipeline puede estar caído. Revisa el estado del cron diario antes de asumir que todo está sano.`,
  state_stale_degraded_action: 'Ver estado del pipeline',
  state_loading_aria: 'Cargando observaciones de Nexa',

  // ── TASK-947 — Detail page /nexa/insights/[id] microcopy canonical (es-CL neutro/tuteo) ──

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
  detail_action_copy_link_failure: 'No pudimos copiar el enlace. Intenta de nuevo.',

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
  detail_banner_superseded_body: 'Nexa ya analizó esta señal de nuevo. La narrativa actual puede haber cambiado.',
  detail_banner_superseded_cta: 'Ver versión actual',

  // Banner: degraded (honest)
  detail_banner_degraded_title: 'No pudimos cargar toda la información',
  detail_banner_degraded_body:
    'El pipeline de Nexa devolvió una respuesta parcial. Intenta de nuevo en unos minutos o revisa el estado del sistema.',
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
  detail_error_body: 'Algo salió mal de nuestro lado. Intenta actualizar en unos segundos.',
  detail_error_cta: 'Reintentar',

  // Loading + skeleton aria
  detail_loading_aria: 'Cargando observación de Nexa',

  // ── TASK-950 Slice 3 — List page /nexa/insights microcopy canonical es-CL ──
  // UX Specification source: greenhouse-ux + state-design + greenhouse-ux-writing
  // skills audit pre-write. Tone: es-CL neutro/tuteo, active voice, honest degradation,
  // cero false friends, sentence case, numerals para counts.

  list_loading_aria: 'Cargando observaciones del período',

  // Title + chrome
  list_page_title: 'Nexa Insights del mes',
  list_page_subtitle: (periodLabel: string, count: number) =>
    `${periodLabel} · ${count === 1 ? '1 observación' : `${count} observaciones`}`,

  // Period label es-CL (mayo 2026, lowercase month name)
  list_period_format: (year: number, month: number) => {
    const MONTHS = [
      '',
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre'
    ]

    return `${MONTHS[month] ?? ''} ${year}`.trim()
  },

  // Empty-positive (señal de SALUD operativa, no de error — TASK-946 framework)
  list_empty_positive_title: 'Sin anomalías este período',
  list_empty_positive_body: 'Nexa analizó las señales del mes y no encontró desviaciones. Salud operativa OK.',
  list_empty_positive_cta: 'Volver a Home',

  // Card item
  list_card_drill_cta: 'Ver causa raíz',
  list_card_aria_label: (metric: string, severity: string) =>
    `Observación de ${metric}, severidad ${severity.toLowerCase()}. Haz clic para ver causa raíz.`,
  list_card_scope_template: (space: string, metric: string) => `${space} · ${metric}`,

  // Degraded banner (honest, accionable, escalation a /admin/ops-health)
  list_degraded_title: 'No pudimos cargar las observaciones',
  list_degraded_body:
    'El pipeline de Nexa está respondiendo lento o tuvo un fallo transitorio. Intenta de nuevo en unos minutos.',
  list_degraded_cta: 'Ver estado del pipeline',

  // Home V2 bento footer CTA (TASK-950 Slice 4) → list page canonical
  home_bento_empty_subheader: 'Aún sin señales analizadas',
  home_bento_empty_body: 'Nexa procesa señales nuevas cada hora. Vuelve más tarde para ver observaciones accionables.',
  home_bento_menu_view_all: 'Ver todos los insights',
  home_bento_menu_configure: 'Configurar análisis',
  home_bento_last_analysis: (count: number, label: string) =>
    `${count} ${count === 1 ? 'señal analizada' : 'señales analizadas'} · último análisis: ${label}`,
  home_bento_view_all_cta: 'Ver todos los insights del mes'
} as const
