/**
 * TASK-811 — domain microcopy extracted from src/config/greenhouse-nomenclature.ts.
 *
 * This module keeps domain-specific visible copy out of the product
 * nomenclature/navigation contract while preserving type-safe GH_* ergonomics.
 * Do not rewrite strings in this file as part of trim-only work.
 */

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
// TASK-893 V1.1 / TASK-895 — Cost Attribution ramp-up effect disclosure
// ────────────────────────────────────────────────────────────────

export const GH_COST_ATTRIBUTION = {
  rampUpDisclosureTitle: 'Efecto ramp-up por ingresos/salidas a mitad de mes',
  rampUpDisclosureBody:
    'Cuando un colaborador ingresa o sale a mitad de mes, su costo laboral se atribuye proporcional a los días hábiles efectivamente trabajados, no al mes completo. Esto puede hacer que el costo del cliente al que está staffeado se vea más bajo de lo esperado en ese período.',
  rampUpDisclosureExpected: 'Es comportamiento esperado del motor de payroll (Payroll Participation Window TASK-893).',
  rampUpDisclosureWhenSuspicious:
    'Si la atribución se ve baja y no hay ingresos/salidas mid-month en el equipo del cliente, revisa Costos > Salud de Atribución y reporta a finance-ops.'
} as const

// ────────────────────────────────────────────────────────────────
// TASK-1213 — Quotes pipeline ledger + adaptive preview
// ────────────────────────────────────────────────────────────────

export const GH_QUOTES_PIPELINE = {
  pageTitle: 'Cotizaciones',
  pageSubtitle: 'Propuestas comerciales, pricing y emisión documental para el ciclo de venta.',
  savedFilters: 'Limpiar filtros',
  newQuote: 'Nueva cotización',
  surfaceTitle: 'Pipeline de cotizaciones',
  surfaceSubtitle: 'Ledger comercial con preview contextual para revisar riesgo, margen y vencimiento sin salir del flujo.',
  searchLabel: 'Buscar cotización',
  searchPlaceholder: 'Cliente, folio o fuente',
  sourceLabel: 'Fuente',
  allSources: 'Todas las fuentes',
  columnsAction: 'Columnas',
  sortAction: 'Ordenar',
  previewAction: 'Revisar',
  reviewAction: 'Revisar',
  openDetail: 'Abrir detalle',
  duplicateQuote: 'Duplicar',
  moreActions: 'Más acciones',
  quotesCount: (count: number) => `${count} cotizaciones`,
  statusAll: 'Todas',
  statusDraft: 'Borrador',
  statusIssued: 'Emitida',
  statusExpired: 'Vencida',
  statusAccepted: 'Aceptada',
  metricTotalPipeline: 'Total pipeline',
  metricIssued: 'Emitidas',
  metricDrafts: 'Borradores',
  metricAverageMargin: 'Margen promedio',
  metricDueThisWeek: 'Vencen esta semana',
  metricNoMargin: 'Sin margen',
  colQuote: 'Cotización',
  colClient: 'Cliente',
  colDates: 'Fechas',
  colValue: 'Valor',
  colMargin: 'Margen',
  colStatus: 'Estado',
  colSource: 'Fuente',
  colActions: 'Acciones',
  tableAriaLabel: 'Tabla de cotizaciones',
  dateCreated: 'Creada',
  dateDue: 'Vence',
  noDueDate: 'Sin vencimiento',
  versionLabel: (version: number) => `v${version}`,
  noQuotesTitle: 'Sin cotizaciones',
  noQuotesBody: 'Las cotizaciones aparecerán aquí cuando se creen en Comercial o se sincronicen desde HubSpot.',
  noFilteredQuotesTitle: 'Sin resultados para este corte',
  noFilteredQuotesBody: 'Ajusta el estado, la fuente o la búsqueda para volver a ver el pipeline.',
  previewEyebrow: 'Vista previa',
  previewEmptyTitle: 'Selecciona una cotización',
  previewEmptyBody: 'Usa Preview en cualquier renglón para revisar el detalle sin perder el contexto del ledger.',
  cycleTitle: 'Ciclo comercial',
  cycleDraft: 'Borrador',
  cycleIssued: 'Emitida',
  cycleExpired: 'Vencida',
  commercialFacts: 'Datos comerciales',
  marginHealth: 'Salud de margen',
  marginHealthy: 'Dentro de objetivo',
  marginWatch: 'Bajo target',
  marginRisk: 'Bajo piso',
  marginUnknown: 'Pendiente',
  recentActivity: 'Actividad reciente',
  activityGenerated: 'Cotización generada',
  activitySourceManual: 'Actualizada manualmente',
  activitySourceNubox: 'Sincronizada desde Nubox',
  activitySourceHubSpot: 'Sincronizada desde HubSpot'
} as const

// ────────────────────────────────────────────────────────────────
// TASK-471 — Pricing Catalog Phase-4 UX (diff + revert + bulk + impact + approvals + excel)
// ────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────
// TASK-1197 — Card F29 mensual consolidado (IVA + Retenciones + PPM)
// ────────────────────────────────────────────────────────────────

export const GH_F29_CONSOLIDATED = {
  cardTitle: 'Posición F29 del mes',
  cardSubtitleLoading: 'Cargando las 3 líneas del F29 del período',
  // Subheader con período + entidad legal; se interpola en el card.
  cardSubtitle: 'IVA, retenciones y PPM materializados por entidad legal',

  // Líneas del F29
  vatLabel: 'IVA',
  vatHelper: 'Débito fiscal menos crédito recuperable del período.',
  retentionLabel: 'Retenciones',
  retentionHelper: 'Retención de honorarios practicada (boletas recibidas).',
  ppmLabel: 'PPM',
  ppmHelper: 'Pago Provisional Mensual: base de ventas netas por la tasa vigente.',

  // Sub-detalle por línea (caption bajo el monto)
  vatNetDebit: 'IVA por pagar',
  vatNetCredit: 'Crédito a favor',
  vatNetEven: 'Saldo equilibrado',
  ppmRateLabel: 'Tasa aplicada',
  retentionDocsLabel: 'Documentos',

  // Estado oficial vs shadow (badge con texto, nunca solo color)
  badgeOfficial: 'Oficial',
  badgeShadow: 'En validación',
  shadowTooltip: 'Cifra en revisión contable; aún no es el F29 oficial del período.',

  // Degradación honesta por línea (null = sin materializar, NO $0)
  lineNoData: 'Sin datos del período',
  lineNoDataHelper: 'No hay posición materializada para este período.',

  // Estado de error del card (degradación honesta local, sin tocar banner global)
  errorTitle: 'No pudimos cargar la posición F29 de este período',

  // Pie con la entidad legal + corte
  pendingMaterialization: 'Pendiente de materializar',

  // TASK-1207 — Total a pagar
  totalLabel: 'Total F29 a pagar',
  totalHelper: 'Suma de IVA, retenciones y PPM del período.',
  totalOfficial: 'Oficial',
  totalProvisional: 'Provisional (en validación)',
  totalProvisionalNote: 'Incluye líneas aún en validación contable; no es el total oficial.',
  totalIncompleteNote: 'Falta materializar alguna línea del período; el total puede estar incompleto.',
  totalNoData: 'Sin datos del período',

  // TASK-1207 — Selector de período + proyección vs declarado
  periodSelectorLabel: 'Período',
  periodCurrentHint: 'mes en curso · proyección',
  periodClosedHint: 'cerrado · a declarar'
} as const
