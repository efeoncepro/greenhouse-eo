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
  // TASK-1075 follow-up — el block (Home / Mi Performance) ya expone la causa raíz
  // inline (colapsable). Su drill por-insight abre el análisis completo en Nexa
  // (/nexa/insights/[id]) → etiqueta distinta para no chocar con "Ver causa raíz".
  insights_open_detail_cta: 'Abrir en Nexa',
  insights_open_detail_aria: (metric: string, severity: string) =>
    `Abrir el análisis completo de ${metric} en Nexa, severidad ${severity.toLowerCase()}.`,

  // Progressive disclosure del feed embebido (cap + "Ver más" in-place).
  // El bloque es un resumen priorizado: muestra las primeras N y revela el
  // resto sin sacar al usuario de la vista. El footer "Ver todos" sigue yendo
  // al full list page /nexa/insights (paginación numerada vive allá).
  insights_show_more: (remaining: number) =>
    `Ver ${remaining} ${remaining === 1 ? 'observación más' : 'observaciones más'}`,
  insights_show_less: 'Ver menos',
  insights_show_more_aria: (remaining: number, total: number) =>
    `Mostrar ${remaining} observaciones más de un total de ${total}.`,
  insights_show_less_aria: 'Mostrar menos observaciones.',

  // Disclosure del panel Nexa (el Nexa Mark morfa como toggle).
  insights_collapse_aria: 'Contraer el panel de Nexa Insights',
  insights_expand_aria: 'Expandir el panel de Nexa Insights',

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
  home_bento_view_all_cta: 'Ver todos los insights del mes',

  // ── Nexa agent panel (concept C redesign) — conversational header ──
  agent_eyebrow: 'Nexa',
  // Self-view (mentionSafeMode): Nexa speaks to the person (2nd person, es-CL tuteo).
  agent_headline_self: 'Revisé tu período y resalté lo que más mueve tus resultados.',
  // Observer/admin view: Nexa speaks about the member (3rd person).
  agent_headline_observer: 'Revisé este período y resalté lo que más mueve los resultados.',
  // Rotating headline — 30 paraphrases que ciclan en el header (Nexa "narrando").
  // self = 2ª persona (tu/tus); observer = genérico (este/los). El índice 0 es el
  // headline canónico (sin regresión). Se renderiza con el thinking-beat al final.
  // `{name}` se reemplaza con el primer nombre del usuario en sesión (self lens);
  // si no hay nombre, esas frases se filtran. Solo algunas lo usan (no todas).
  agent_headline_rotation_self: [
    'Revisé tu período y resalté lo que más mueve tus resultados.',
    'Le di una vuelta a tus señales, {name}, y separé lo que de verdad importa.',
    'Miré tu mes con lupa y te dejo arriba lo que cambia el resultado.',
    'Hay una palanca clara este mes — te la dejo a mano.',
    'Crucé tus números y encontré dónde está el verdadero foco.',
    'Leí todo tu período; esto es lo que yo miraría primero.',
    'Tu mes tiene una historia, {name}, y acá está el titular.',
    'Ordené el ruido y dejé solo lo que vale la pena accionar.',
    'Pasé por cada señal y prioricé la que mueve la aguja.',
    'Esto es lo que más pesa en tu mes — sin vueltas.',
    'Te resumo el período en una palanca concreta.',
    'Revisé tu avance y marqué dónde conviene poner energía.',
    '{name}, tu calidad de primera entrega es la protagonista del mes.',
    'Miré la tendencia y te muestro qué la está moviendo.',
    'Separé lo urgente de lo accesorio; esto es lo urgente.',
    'Acá está el dato que cambia cómo cerrás el mes.',
    'Repasé tus métricas clave y subrayé la que más rinde.',
    'Tu período en una frase: esto es lo que importa ahora.',
    'Encontré un patrón en tus señales que vale tu atención.',
    '{name}, si miras una sola cosa hoy, que sea esta.',
    'Dejé arriba lo que más impacto tiene en tu resultado.',
    'Crucé tu desempeño y te muestro dónde ganás más.',
    'Lo bueno y lo mejorable de tu mes, sin rodeos.',
    'Prioricé por impacto: esto primero, el resto después.',
    'Tu mes tiene foco — te lo dejo claro acá.',
    'Revisé las señales recientes y destaqué la decisiva.',
    '{name}, acá está la palanca con más retorno este mes.',
    'Miré tus resultados y ordené qué atacar ya.',
    'Esto movería tu número si lo trabajás hoy.',
    'Repasé tus datos y resalté lo que de verdad cambia tu mes.'
  ] as string[],
  agent_headline_rotation_observer: [
    'Revisé este período y resalté lo que más mueve los resultados.',
    'Le di una vuelta a las señales y separé lo que de verdad importa.',
    'Miré el mes con lupa y dejo arriba lo que cambia el resultado.',
    'Hay una palanca clara este mes — la dejo a mano.',
    'Crucé los números y encontré dónde está el verdadero foco.',
    'Leí todo el período; esto es lo que miraría primero.',
    'El mes tiene una historia, y acá está el titular.',
    'Ordené el ruido y dejé solo lo que vale la pena accionar.',
    'Pasé por cada señal y prioricé la que mueve la aguja.',
    'Esto es lo que más pesa en el mes — sin vueltas.',
    'Resumo el período en una palanca concreta.',
    'Revisé el avance y marqué dónde conviene poner energía.',
    'La calidad de primera entrega es la protagonista del mes.',
    'Miré la tendencia y muestro qué la está moviendo.',
    'Separé lo urgente de lo accesorio; esto es lo urgente.',
    'Acá está el dato que cambia cómo cierra el mes.',
    'Repasé las métricas clave y subrayé la que más rinde.',
    'El período en una frase: esto es lo que importa ahora.',
    'Encontré un patrón en las señales que vale la atención.',
    'Si hay una sola cosa para mirar hoy, es esta.',
    'Dejé arriba lo que más impacto tiene en el resultado.',
    'Crucé el desempeño y muestro dónde se gana más.',
    'Lo bueno y lo mejorable del mes, sin rodeos.',
    'Prioricé por impacto: esto primero, el resto después.',
    'El mes tiene foco — lo dejo claro acá.',
    'Revisé las señales recientes y destaqué la decisiva.',
    'Acá está la palanca con más retorno este mes.',
    'Miré los resultados y ordené qué atacar ya.',
    'Esto movería el número si se trabaja hoy.',
    'Repasé los datos y resalté lo que de verdad cambia el mes.'
  ] as string[],
  agent_summary: (analyzed: number, actions: number) =>
    `${analyzed} ${analyzed === 1 ? 'señal analizada' : 'señales analizadas'} · ${actions} con acción sugerida`,
  agent_working: 'Nexa está analizando tu desempeño',
  agent_footer: 'Nexa aprende de tus datos para darte mejores insights cada día',

  // ── TASK-1078 — Floating chat (concepto B): panel expandible + historial ──
  floating: {
    // aria / chrome
    panel_aria: 'Nexa AI',
    presence_online: 'En línea',
    presence_thinking: 'Pensando',
    close_aria: 'Cerrar Nexa',
    new_conversation_aria: 'Nueva conversación',
    expand_aria: 'Expandir panel',
    collapse_aria: 'Colapsar panel',

    // history rail
    search_placeholder: 'Buscar conversación',
    search_aria: 'Buscar conversación',
    search_clear_aria: 'Limpiar búsqueda',
    search_clear: 'Limpiar búsqueda',
    rail_actions_aria: (title: string) => `Acciones de ${title}`,
    rename: 'Renombrar',
    delete: 'Eliminar',
    rename_dialog_title: 'Renombrar conversación',
    rename_field_label: 'Título',
    rename_save: 'Guardar',
    rename_cancel: 'Cancelar',
    delete_dialog_title: '¿Eliminar esta conversación?',
    delete_dialog_body: (title: string) =>
      `Se eliminará «${title}» y todos sus mensajes. Esta acción no se puede deshacer.`,
    delete_confirm: 'Eliminar',
    delete_cancel: 'Cancelar',
    rail_empty_title: 'Aún no tienes conversaciones',
    rail_empty_body: 'Inicia una nueva y aparecerá aquí.',
    rail_filtered_empty: (query: string) => `Sin resultados para «${query}»`,
    rail_load_error_title: 'No pudimos cargar tu historial',
    rail_load_error_body: 'Reintenta en unos segundos.',
    rail_load_error_cta: 'Reintentar',
    rail_loading_aria: 'Cargando historial de conversaciones',

    // empty hero
    empty_subtitle: 'Pregúntame por tus métricas, cuentas o proyecciones.',
    empty_context_general: 'Vista general',
    empty_prompts: [
      'Resumen ejecutivo del mes',
      '¿Qué cuentas están en riesgo de churn?',
      'Compara ingresos por línea de servicio',
      'Proyecta el MRR a fin de mes'
    ] as string[],
    // Prompts CONTEXTUALES (Tier 1): el set cambia según la pantalla donde el usuario
    // abre a Nexa (resolver por ruta en src/lib/nexa/suggested-prompts.ts). Es-CL tuteo.
    // La interpolación del nombre de la entidad (ej. "Cliente · Sky Airline") es el
    // Tier 1.5 (requiere que la página declare su contexto) — por ahora, genérico.
    prompt_contexts: {
      general: {
        label: 'Vista general',
        icon: '',
        prompts: [
          'Resumen ejecutivo del mes',
          '¿Qué cuentas están en riesgo de churn?',
          'Compara ingresos por línea de servicio',
          'Proyecta el MRR a fin de mes'
        ]
      },
      finance: {
        label: 'Finanzas · P&L',
        icon: 'tabler-chart-pie',
        prompts: [
          'Desglosa el P&L del mes',
          '¿Dónde se fue el gasto este mes?',
          'Margen por línea de servicio',
          'Flujo de caja a 30 días'
        ]
      },
      client: {
        // `{entity}` se interpola con el nombre real del cliente cuando la página lo declara
        // (Tier 1.5, NexaContextScope); si no, cae a "este cliente" (genérico).
        label: 'Cliente',
        icon: 'tabler-building-store',
        prompts: [
          '¿Cómo viene {entity} este mes?',
          'Riesgo de churn de {entity}',
          'Rentabilidad de {entity}',
          'Próximas renovaciones de {entity}'
        ]
      },
      payroll: {
        label: 'Nómina',
        icon: 'tabler-cash',
        prompts: [
          'Resumen de la nómina del mes',
          '¿Quién tiene variaciones este mes?',
          'Costo laboral por equipo',
          'Pendientes antes del cierre'
        ]
      },
      personal: {
        // Mi espacio (TASK-1141) — starters self-service. Cuando hay pendientes reales, el
        // resolver data-aware los reemplaza; si no, estas plantillas.
        label: 'Mi espacio',
        icon: 'tabler-user',
        prompts: [
          '¿Qué tengo pendiente?',
          '¿Cuántos días de vacaciones me quedan?',
          'Muéstrame mi última liquidación',
          '¿Cómo voy con mis objetivos?'
        ]
      }
    } as Record<string, { label: string; icon: string; prompts: string[] }>,
    // Prompts DATA-AWARE (Tier 2, TASK-1087): plantillas de "gancho" por categoría de señal real
    // (anomalía/pendiente/riesgo/KPI). El composer (suggested-prompts-data-aware.ts) elige cuáles
    // según las señales vivas de la entidad y reemplaza `{entity}` con su nombre. Es-CL tuteo.
    // REGLA DURA: estas plantillas NUNCA llevan montos crudos ni PII — solo el gancho + el nombre
    // (que el usuario ya ve en la página). El detalle lo resuelve Nexa con sus tools.
    data_aware_prompts: {
      health_risk: '¿Por qué {entity} está en riesgo este mes?',
      health_blocked: 'Hay algo bloqueando a {entity}, ¿lo resolvemos?',
      anomaly_delivery_error: 'El delivery de {entity} está en rojo, ¿lo revisamos?',
      anomaly_delivery_warning: '{entity} tiene entregables trabados, ¿los vemos?',
      anomaly_finance_warning: '{entity} tiene saldo pendiente por cobrar, ¿lo revisamos?',
      lifecycle_blocked: 'El onboarding de {entity} está bloqueado, ¿lo destrabamos?',
      lifecycle_pending: '¿Qué falta para cerrar el onboarding de {entity}?',
      pending_review: '{entity} tiene pendientes por revisar, ¿los vemos?',
      generic_watch: '¿Qué está pasando con {entity} este mes?',
      // TASK-1141 — Mi espacio (contexto personal). `{entity}` no se usa acá (es la data del
      // propio colaborador); `{count}` se interpola con el número real cuando aplica.
      personal_intake_incomplete: 'Te falta completar tu ficha, ¿la terminamos?',
      personal_leave_pending: 'Tienes {count} solicitud(es) de vacaciones en curso, ¿las vemos?',
      personal_approvals_pending: 'Tienes {count} aprobación(es) de tu equipo esperando, ¿las revisamos?',
      // TASK-1145 — recibo de pago disponible. Regime-neutral ("recibo", NUNCA "liquidación":
      // un colaborador Deel no recibe una liquidación chilena). NUNCA el monto en el texto.
      personal_payslip_ready: 'Tu recibo de pago más reciente ya está disponible, ¿lo revisamos?',
      // TASK-1144 — performance / métricas ICO propias (tuteo). `{count}` interpolado; NUNCA un monto.
      personal_overdue_tasks: 'Tienes {count} entregable(s) atrasado(s), ¿los revisamos?',
      personal_performance_review: '¿Revisamos tu desempeño de este mes?',
      // TASK-1143 — Finanzas global (dashboard). Nexa le habla al operador financiero (tuteo +
      // nosotros). `{count}` se interpola con el número real; NUNCA un monto.
      finance_ledger_drift: 'Hay {count} movimiento(s) con descuadre en el ledger, ¿los revisamos?',
      finance_stale_balances: 'Hay {count} cuenta(s) con saldo desactualizado, ¿las revisamos?',
      finance_unanchored: 'Hay {count} gasto(s) sin clasificar, ¿los vemos?',
      finance_ledger_degraded: 'Hay chequeos del ledger que no pude verificar, ¿lo revisamos?'
    } as Record<string, string>,
    // Saludo del empty hero — rota en cada nueva conversación. `{name}` se reemplaza
    // con el primer nombre del usuario en sesión; si no hay nombre, esas frases se
    // filtran (mismo patrón que agent_headline_rotation_*). Cortos (1 línea),
    // ocurrentes, es-CL tuteo.
    greetings: [
      'Hola, {name}. ¿Qué número desarmamos?',
      '{name}, tus datos ya calientan motores.',
      'Hola, {name}. ¿Qué te quita el sueño?',
      '{name}, los insights no se me esconden.',
      'Hola, {name}. ¿Le tomamos el pulso al mes?',
      '{name}, de datos a decisiones.',
      'Hola, {name}. ¿Por dónde cavamos hoy?',
      '{name}, el churn no se analiza solo.',
      'Hola, {name}. Pregúntame lo difícil.',
      '{name}, hoy los KPIs hablan claro.',
      'Hola, {name}. ¿Qué dicen tus métricas?',
      '{name}, démosle sentido a los números.',
      '{name}, tu operación sin letra chica.',
      'Hola, {name}. ¿Proyectamos el cierre?',
      'Hola, {name}. Tírame una cuenta.',
      '{name}, no hay dato que se me resista.',
      'Hola, {name}. ¿Qué decisión preparamos?',
      '{name}, leo entre líneas de datos.',
      'Hola, {name}. ¿Quién sube y quién baja?',
      '{name}, tus dashboards me conocen.',
      'Hola, {name}. Cero rodeos, puro insight.',
      '{name}, ¿el pulso de los ingresos?',
      'Hola, {name}. ¿El porqué del número?',
      '{name}, convierto ruido en señal.',
      'Hola, {name}. ¿Qué riesgo cazamos hoy?',
      '{name}, tú traes datos, yo traduzco.',
      'Hola, {name}. ¿Empezamos por lo urgente?',
      '{name}, miro lo que nadie mira.',
      'Hola, {name}. Tu copiloto, café en mano.',
      '{name}, dame el qué y te doy el porqué.'
    ] as string[],
    // Saludo sin nombre (cuando la sesión no expone un primer nombre).
    greeting_no_name: 'Hola. ¿Qué número desarmamos?',

    // composer
    composer_placeholder: 'Pregúntale a Nexa sobre tu operación…',
    composer_disclaimer: 'Nexa analiza tus datos en tiempo real. Verifica antes de una decisión crítica.'
  }
} as const
