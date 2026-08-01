export const GH_GLOBE_CREDITS = {
  metadataTitle: 'Créditos Globe | Admin Center | Greenhouse',
  eyebrow: 'Globe · Capacidad creativa',
  title: 'Controla la capacidad del período',
  description:
    'Consulta la capacidad efectiva, detecta bloqueos y conserva una trazabilidad completa de cada operación de fondeo.',
  action: 'Asegurar capacidad',
  actionUnavailable: 'Se requiere una proyección confiable y permisos de emisión y ejecución.',
  funding: {
    title: 'Asegurar capacidad del período',
    description:
      'Autoriza y ejecuta una sola operación exacta. Globe recalcula el plan y nunca supera estos límites.',
    target: 'Disponible objetivo',
    targetHelp: 'Capacidad efectiva mínima que debe quedar disponible.',
    maxGrant: 'Máximo a otorgar',
    maxGrantHelp: 'Límite absoluto de créditos nuevos para esta operación.',
    maxCap: 'Tope máximo resultante',
    maxCapHelp: 'La operación no puede dejar el tope mensual sobre este valor.',
    period: 'Período autorizado',
    cancel: 'Cancelar',
    confirm: 'Autorizar y ejecutar',
    submitting: 'Ejecutando…',
    review: 'Revisar operación',
    reviewing: 'Actualizando preview…',
    reviewTitle: 'Preview autoritativo',
    reviewHelp: 'Globe volvió a leer capacidad, topes y fondeo. La ejecución revalida estos límites antes de mutar.',
    currentEffective: 'Disponible efectivo actual',
    currentCap: 'Tope mensual actual',
    currentFunding: 'Fondeo elegible actual',
    edit: 'Editar límites',
    previewFailed: 'No fue posible obtener el preview. No se habilitó la ejecución.',
    invalid: 'Revisa los límites: deben ser enteros positivos y el objetivo no puede superar el tope.',
    completed: 'Capacidad asegurada y verificada en Globe.',
    noEffect: 'Globe verificó que la capacidad objetivo ya estaba disponible; no se aplicaron cambios.',
    outcomeUnknown:
      'Globe recibió la operación, pero el resultado aún no es concluyente. No vuelvas a fondear: usa la misma operación para reconciliar.',
    failed: 'No fue posible completar el fondeo. No se informa éxito sin un recibo verificable.',
    operation: 'Operación: {operationId}'
  },
  recovery: {
    action: 'Verificar y reconciliar',
    running: 'Verificando…',
    completed: 'Globe reconcilió la operación y devolvió un resultado terminal.',
    stillUnknown: 'Globe todavía no puede confirmar el resultado. La operación permanece abierta; no la dupliques.',
    failed: 'No fue posible reconciliar la operación. Su estado económico no se modificó en el navegador.'
  },
  status: {
    ready: 'Operativa',
    limited: 'Capacidad limitada',
    blocked: 'Bloqueada',
    unknown: 'Sin proyección confiable'
  },
  signals: {
    effective: 'Disponible efectivo',
    monthly: 'Disponible del período',
    funding: 'Fondeo elegible'
  },
  runway: {
    eyebrow: 'Runway del período',
    title: 'Capacidad efectiva',
    description: 'Lectura autoritativa de Globe. Los valores no se recalculan en el navegador.',
    spent: 'Consumido',
    held: 'Reservado',
    remaining: 'Disponible',
    ledger: 'Ledger histórico',
    freshness: 'Actualizado hace {seconds} s'
  },
  context: {
    audience: 'Audiencia: operador interno',
    period: 'Período {start} – {end}',
    coverage: 'Cobertura: {count} fuentes elegibles'
  },
  ledger: {
    title: 'Ledger auditable',
    description: 'Asientos append-only emitidos por Globe. Los filtros no recalculan saldos.',
    empty: 'No hay asientos para este filtro.',
    all: 'Todos',
    allocation: 'Asignación',
    reservation: 'Reserva',
    settlement: 'Consumo',
    release: 'Liberación',
    expiration: 'Expiración',
    adjustment: 'Ajuste',
    allocated: 'Asignado Δ',
    reserved: 'Reservado Δ',
    spent: 'Consumido Δ',
    adjusted: 'Ajuste Δ',
    run: 'Run',
    correlation: 'Correlación'
  },
  resources: {
    title: 'Pools, grants y subpresupuestos',
    description: 'Inventario autoritativo y tenant-scoped publicado por Globe.',
    pools: 'Pools',
    grants: 'Grants',
    budgets: 'Subpresupuestos',
    empty: 'Sin registros publicados.',
    partial: 'Algunas proyecciones no están disponibles: {sections}.',
    cap: 'Tope',
    period: 'Vigencia',
    project: 'Proyecto'
  },
  forecast: {
    title: 'Cobertura y proyección',
    available: '{days} días estimados · confianza {confidence}',
    insufficient: 'Globe necesita más historial para publicar una proyección.',
    unavailable: 'La proyección no está disponible en esta lectura.',
    alerts: '{count} alertas operativas abiertas.'
  },
  operations: {
    title: 'Operaciones recientes',
    description: 'Propuestas, confirmaciones y recibos emitidos por Globe.',
    empty: 'Todavía no hay operaciones de fondeo para este workspace.',
    detail: 'Detalle de operación',
    select: 'Selecciona una operación para revisar su plan y recibo.',
    grant: 'Créditos a otorgar',
    capBefore: 'Tope anterior',
    capAfter: 'Tope resultante',
    policyBefore: 'Disponible antes',
    policyAfter: 'Disponible después',
    pool: 'Pool',
    receipt: 'Resultado',
    expires: 'Expira'
  },
  operationState: {
    proposed: 'Propuesta',
    confirmed: 'Confirmada',
    completed: 'Completada',
    expired: 'Expirada',
    confirm_failed: 'Confirmación fallida',
    outcome_unknown: 'Resultado por verificar',
    reconciled: 'Reconciliada'
  },
  receiptOutcome: {
    completed: 'Completada',
    expired: 'Expirada',
    no_effect: 'Sin cambios',
    outcome_unknown: 'Resultado por verificar'
  },
  resourceState: {
    draft: 'Borrador', active: 'Activo', paused: 'Pausado', closed: 'Cerrado',
    pending: 'Pendiente', posted: 'Publicado', cancelled: 'Cancelado', corrected: 'Corregido',
    superseded: 'Reemplazado'
  },
  blocker: {
    pool_paused: 'Pool pausado',
    pool_exhausted: 'Pool agotado',
    project_cap_exceeded: 'Tope del proyecto alcanzado',
    month_cap_exceeded: 'Tope del período alcanzado',
    policy_unavailable: 'Política no disponible'
  },
  risks: {
    title: 'Señales de riesgo',
    description: 'Bloqueos devueltos por la política canónica.',
    none: 'No hay bloqueos activos.',
    unavailable: 'La proyección no está disponible; no se habilitan decisiones de fondeo.'
  },
  workspaceMissing: 'No existe un workspace Globe autorizado para esta sesión.',
  loadError: 'Globe no pudo entregar una proyección válida. La capacidad queda en estado desconocido.',
  requestedUnit: 1
} as const
