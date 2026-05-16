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
// TASK-471 — Pricing Catalog Phase-4 UX (diff + revert + bulk + impact + approvals + excel)
// ────────────────────────────────────────────────────────────────
