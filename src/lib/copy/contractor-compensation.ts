/**
 * TASK-968 — Contractor compensation copy (es-CL domain module).
 *
 * Visible copy for the admin compensation editor + the contractor read-only
 * derived block + the payable guardrail. Domain copy module (mirror of
 * `agency.ts` / `payroll.ts`); approved mockup strings relocated here so the
 * runtime surfaces consume a single source. Pure (client + server safe).
 */

export const GH_CONTRACTOR_COMPENSATION = {
  editor: {
    panelTitle: 'Compensación',
    panelSubheader: 'El monto acordado se define aquí. El contractor nunca lo escribe.',
    editCta: 'Editar compensación',
    defineCta: 'Definir compensación',
    emptyTitle: 'Sin monto acordado',
    emptyDescription:
      'Este engagement aún no tiene compensación definida. El contractor no puede declarar trabajo hasta definirla.',
    agreedChip: 'Acordado',
    drawerTitle: 'Compensación del engagement',
    rateTypeLabel: 'Tipo de tarifa',
    amountLabel: 'Monto acordado',
    amountHelper: 'Monto bruto antes de retención.',
    amountError: 'Ingresa un monto mayor a 0.',
    currencyLabel: 'Moneda',
    currencyHelper: 'Se define al crear el engagement.',
    cadenceLabel: 'Cadencia',
    expectedLabel: 'Monto esperado por pago',
    expectedByQuantity: 'Según cantidad declarada',
    auditNote: 'Cada cambio queda registrado (quién y cuándo).',
    save: 'Guardar compensación',
    saving: 'Guardando…',
    saved: 'Guardado',
    cancel: 'Cancelar',
    saveError: 'No pudimos guardar la compensación. Intenta de nuevo.'
  },
  contractor: {
    derivedTitle: 'Monto del período',
    derivedNote: 'Según tu compensación acordada. No editable.',
    missingTitle: 'Aún no tienes monto acordado',
    missingDescription:
      'Tu engagement aún no tiene monto acordado definido. Contacta a HR para habilitar tus envíos.'
  },
  guardrail: {
    panelTitle: 'Guardrail del monto acordado',
    panelSubheader: 'Bloquea pagar por encima de lo acordado. La excepción se autoriza y queda auditada.',
    breachTitle: 'Excede el monto acordado',
    okTitle: 'Sin payables bloqueados por monto',
    okDescription: 'Ningún payable de este engagement supera el monto acordado.',
    authorizeCta: 'Autorizar excepción',
    overrideTitle: 'Autorizar excepción de pago',
    overrideIntro:
      'Vas a autorizar un pago por encima del monto acordado. Requiere una firma distinta a quien fijó el monto (SoD) y queda registrado.',
    reasonLabel: 'Motivo de la excepción',
    reasonPlaceholder: 'Ej. bono por entrega extraordinaria aprobado por…',
    reasonHelper: 'Mínimo 10 caracteres.',
    confirm: 'Autorizar excepción',
    confirming: 'Autorizando…',
    cancel: 'Cancelar',
    overrideError: 'No pudimos autorizar la excepción. Intenta de nuevo.',
    overrodeNote: 'Excepción autorizada y registrada (auditada).'
  }
} as const
