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
