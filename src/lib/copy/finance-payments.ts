/**
 * TASK-974 — Finance Contractor Payments Workbench copy (es-CL domain module).
 *
 * Visible copy for the Finance operator surface that prepares contractor payouts
 * (list + readiness + create + governance). Domain copy module (mirror of
 * `contractor-compensation.ts` / `finance.ts`). Pure (client + server safe).
 */

export const GH_FINANCE_CONTRACTOR_PAYMENTS = {
  header: {
    title: 'Pagos a contractors',
    subtitle: 'Prepara, revisa y autoriza los pagos a contractors antes de la orden de pago.',
    createFromSubmissionCta: 'Crear desde envío',
    createOffCycleCta: 'Pago off-cycle',
    monthlyRunCta: 'Iniciar corrida mensual',
    reportCta: 'Descargar nómina'
  },
  kpi: {
    toPrepare: 'Por preparar',
    toPrepareSub: 'En revisión de readiness',
    blocked: 'Bloqueados',
    blockedSub: 'Requieren acción',
    readyForFinance: 'Listos para Finanzas',
    readyForFinanceSub: 'Generan obligación',
    paid: 'Pagados este mes',
    paidSub: 'Liquidados al banco'
  },
  list: {
    panelTitle: 'Payables de contractors',
    panelSubheader: 'Cada payable es un pago preparado: bruto − retención = neto.',
    colContractor: 'Contractor',
    colKind: 'Origen',
    colGross: 'Bruto',
    colNet: 'Neto',
    colDue: 'Vence',
    colStatus: 'Estado',
    colAction: 'Acción',
    open: 'Abrir',
    emptyTitle: 'Sin payables',
    emptyDescription: 'No hay payables de contractors en este estado. Crea uno desde un envío aprobado.',
    filterAll: 'Todos',
    selectStatus: 'Filtrar por estado'
  },
  detail: {
    title: 'Detalle del payable',
    breakdownTitle: 'Desglose del pago',
    gross: 'Bruto',
    withholding: 'Retención SII',
    net: 'Neto a pagar',
    netNote: 'El neto es lo que viaja al banco. La retención se remesa al SII por separado.',
    readinessTitle: 'Preparación (readiness)',
    readinessOk: 'Listo para enviar a Finanzas. Sin bloqueos.',
    metaEngagement: 'Engagement',
    metaCurrency: 'Moneda',
    metaPayrollVia: 'Canal',
    metaDue: 'Vence',
    metaSource: 'Origen',
    respFinance: 'Finanzas',
    respHr: 'HR',
    respContractor: 'Contractor'
  },
  actions: {
    sendToFinance: 'Enviar a Finanzas',
    cancel: 'Cancelar payable',
    waive: 'Waiver perfil de pago',
    override: 'Autorizar excepción de monto',
    sending: 'Enviando…'
  },
  create: {
    fromSubmissionTitle: 'Crear payable desde envío aprobado',
    fromSubmissionIntro: 'Selecciona un envío de trabajo aprobado. El neto se calcula automáticamente (bruto − retención).',
    selectSubmission: 'Envío aprobado',
    offCycleTitle: 'Crear payable off-cycle',
    offCycleIntro: 'Pago manual fuera de un envío (ajuste, bono, reembolso). Requiere motivo.',
    selectEngagement: 'Engagement',
    grossLabel: 'Monto bruto',
    reasonLabel: 'Motivo',
    reasonHelper: 'Mínimo 10 caracteres.',
    confirm: 'Crear payable',
    cancel: 'Cancelar',
    previewNet: 'Neto estimado'
  },
  governance: {
    readyTitle: 'Enviar a Finanzas',
    readyIntro: 'Se evaluará el readiness. Si pasa, el payable genera su obligación de pago.',
    readyBlocked: 'No se puede enviar: hay bloqueos pendientes.',
    cancelTitle: 'Cancelar payable',
    cancelIntro: 'Anula este payable. Indica el motivo (opcional).',
    waiveTitle: 'Waiver del perfil de pago',
    waiveIntro: 'Permite avanzar sin perfil de pago aprobado. Requiere motivo y queda auditado.',
    overrideTitle: 'Autorizar excepción de monto',
    overrideIntro: 'El bruto supera el monto acordado por HR. Autorizar requiere una firma distinta (SoD) y queda registrado.',
    reasonLabel: 'Motivo',
    reasonHelper: 'Mínimo 10 caracteres.',
    confirm: 'Confirmar',
    cancel: 'Cancelar'
  },
  monthlyRun: {
    title: 'Corrida mensual de pagos',
    intro:
      'Junta todos los pagos a contractors comprometidos del período y prepara las órdenes agrupadas por moneda. Prepara — no paga: las órdenes quedan pendientes de aprobación.',
    periodLabel: 'Período (mes operativo)',
    monthLabel: 'Mes',
    yearLabel: 'Año',
    previewTitle: 'Qué se va a preparar',
    previewLoading: 'Calculando…',
    cutoffLabel: 'Fecha límite del período',
    payablesLabel: 'Pagos a incluir',
    totalsLabel: 'Total neto por moneda',
    nothingTitle: 'Nada por preparar',
    nothing: 'No hay pagos comprometidos pendientes para este período.',
    confirm: 'Preparar órdenes',
    cancel: 'Cerrar',
    preparing: 'Preparando…',
    doneTitle: 'Corrida preparada',
    doneOrders: 'órdenes de pago creadas',
    donePayables: 'pagos incluidos',
    alreadyPrepared: 'Ya estaba preparada: no había pagos nuevos para este período.',
    note: 'Las órdenes quedan en «pendiente de aprobación». La aprobación y el pago al banco siguen siendo manuales.',
    error: 'No se pudo preparar la corrida. Intenta de nuevo.',
    close: 'Cerrar'
  },
  report: {
    title: 'Descargar nómina de contractors',
    intro:
      'Reporte del período con el desglose bruto − retención SII = neto, agrupado por régimen. El neto es lo pagado; la retención SII se remesa al SII por separado.',
    monthLabel: 'Mes',
    yearLabel: 'Año',
    downloadPdf: 'Descargar PDF',
    downloadExcel: 'Descargar Excel',
    close: 'Cerrar'
  },
  status: {
    pending_readiness: 'Por preparar',
    blocked: 'Bloqueado',
    ready_for_finance: 'Listo para Finanzas',
    obligation_created: 'Obligación creada',
    payment_order_created: 'En orden de pago',
    paid: 'Pagado',
    cancelled: 'Cancelado'
  },
  blocker: {
    source_not_approved: 'La evidencia de origen no está aprobada.',
    invoice_asset_missing: 'Falta la boleta/invoice requerida.',
    net_mismatch: 'El neto no cuadra (neto ≠ bruto − retención).',
    currency_unsupported: 'Moneda de pago no soportada (solo CLP/USD).',
    fx_unresolved: 'No hay tasa FX confiable.',
    fx_policy_unresolved: 'Falta declarar la política FX del pago cross-currency.',
    payment_profile_unresolved: 'No hay perfil de pago aprobado (ni waiver).',
    provider_split_missing: 'Falta la referencia del proveedor (contrato/worker).',
    classification_risk_blocking: 'Riesgo de clasificación laboral bloqueante (revisión legal).',
    rut_unverified: 'Falta el RUT chileno verificado del prestador.',
    honorarios_withholding_mismatch: 'La retención del honorarios no coincide con la tasa SII.',
    tax_owner_review_required: 'El tratamiento tributario requiere revisión humana.',
    payment_exceeds_agreed_amount: 'El bruto supera el monto acordado por HR.'
  }
} as const

/** Who must act on a readiness blocker, for the operator. */
export const FINANCE_PAYMENTS_BLOCKER_RESPONSIBLE: Record<string, 'Finanzas' | 'HR' | 'Contractor'> = {
  source_not_approved: 'HR',
  invoice_asset_missing: 'Contractor',
  net_mismatch: 'Finanzas',
  currency_unsupported: 'Finanzas',
  fx_unresolved: 'Finanzas',
  fx_policy_unresolved: 'HR',
  payment_profile_unresolved: 'Finanzas',
  provider_split_missing: 'HR',
  classification_risk_blocking: 'HR',
  rut_unverified: 'HR',
  honorarios_withholding_mismatch: 'Finanzas',
  tax_owner_review_required: 'HR',
  payment_exceeds_agreed_amount: 'Finanzas'
}
