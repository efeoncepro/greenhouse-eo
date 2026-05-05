/**
 * TASK-784 HR redesign — Copy es-CL (tuteo) validada por skill greenhouse-ux-writing.
 * HR-specific microcopy (different audience than /my/profile).
 */

export const HR_LEGAL_COPY = {
  card: {
    title: 'Identidad legal',
    subtitle: 'Documentos y direcciones de identidad',
    chipLista: 'Lista para finiquito',
    chipPending: (n: number) => `${n} pendiente${n === 1 ? '' : 's'}`,
    chipMissing: (n: number) => `${n} falta${n === 1 ? '' : 'n'}`,
    chipMixed: (pending: number, missing: number) =>
      `${pending} pendiente${pending === 1 ? '' : 's'} · ${missing} falta${missing === 1 ? '' : 'n'}`,
    chipEmpty: 'Sin declarar',
    chipRejected: (n: number) => `${n} rechazado${n === 1 ? '' : 's'}`,
    chipBlocksFiniquito: 'Bloquea finiquito programado',
    chipEditing: 'Editando — modo HR'
  },
  readiness: {
    finalSettlement: 'Finiquito Chile',
    payroll: 'Payroll Chile',
    statusReady: 'Lista',
    statusBlockers: (n: number) => `${n} bloqueador${n === 1 ? '' : 'es'}`,
    statusWarnings: (n: number) => `${n} advertencia${n === 1 ? '' : 's'}`,
    payrollOk: 'Suficiente para liquidar nomina mensual'
  },
  blockerLabels: {
    cl_rut_missing: 'Falta declarar RUT',
    cl_rut_pending_review: 'RUT pendiente de tu revision',
    cl_rut_rejected: 'RUT rechazado · esperando correccion',
    cl_rut_archived_or_expired: 'RUT archivado o vencido',
    address_missing_legal: 'Falta direccion legal',
    address_missing_residence: 'Falta direccion de residencia',
    profile_missing: 'Profile no vinculado',
    document_missing: 'Falta declarar un documento',
    document_pending_review: 'Documento pendiente de revision'
  } as Record<string, string>,
  sections: {
    documents: 'Documentos',
    addresses: 'Direcciones',
    auditLog: 'Historial de cambios'
  },
  counts: {
    documents: (total: number, verified: number, pending: number) =>
      `${total} ${total === 1 ? 'documento' : 'documentos'} · ${verified} verificado${verified === 1 ? '' : 's'} · ${pending} pendiente${pending === 1 ? '' : 's'}`,
    documentsZero: '0 documentos',
    addresses: (total: number, verified: number) =>
      `${total} ${total === 1 ? 'direccion' : 'direcciones'} · ${verified} verificada${verified === 1 ? '' : 's'}`,
    addressesZero: '0 direcciones declaradas'
  },
  states: {
    pending_review: 'Pendiente',
    verified: 'Verificado',
    verified_address: 'Verificada',
    rejected: 'Rechazado por ti',
    archived: 'Archivado',
    expired: 'Vencido',
    missing: 'Falta'
  },
  itemSubs: {
    pendingDays: (collaboratorName: string, days: number) =>
      `Declarado por ${collaboratorName} hace ${days} ${days === 1 ? 'dia' : 'dias'} · Esperando tu revision`,
    pendingDaysOverdue: (days: number) =>
      `Esperando tu revision hace ${days} dias`,
    verifiedDays: (days: number) =>
      `Verificado por ti hace ${days} ${days === 1 ? 'dia' : 'dias'} · Lista para emitir documentos formales`,
    verifiedAddressDays: (days: number) =>
      `Verificada por ti hace ${days} ${days === 1 ? 'dia' : 'dias'}`,
    missingRequired: 'Necesario para emitir su finiquito laboral.',
    missingOptional: 'No declarado. No es obligatorio para finiquito.',
    rejectedWaiting: (collaboratorName: string) =>
      `Esperando que ${collaboratorName} corrija`,
    notDeclaredByCollaborator: (collaboratorName: string, docName: string) =>
      `${collaboratorName} no ha declarado ${docName}.`,
    addressNotDeclaredYet: (collaboratorName: string) =>
      `${collaboratorName} no ha declarado esta direccion. Pidesela o cargala tu.`,
    addressMissingForFiniquito: 'Necesaria para emitir su finiquito laboral.'
  },
  rejectedBanner: 'Tu motivo:',
  actions: {
    verify: 'Verificar',
    reject: 'Rechazar',
    revealDocument: 'Ver completo',
    revealAddress: 'Ver completa',
    edit: 'Editar yo (HR)',
    editLoad: 'Cargar yo (HR)',
    editReReview: 'Editar (re-revisar)',
    archive: 'Archivar',
    archiveRejection: 'Archivar rechazo',
    askCollaborator: (collaboratorName: string) => `Pedir a ${collaboratorName}`,
    askUrgent: (collaboratorName: string) => `Pedir urgente a ${collaboratorName}`,
    remind: (collaboratorName: string) => `Recordar a ${collaboratorName}`,
    cancel: 'Cancelar',
    saveHrEdit: 'Guardar cambio HR',
    saveHrAddress: 'Guardar direccion'
  },
  askMenu: {
    email: 'Enviar email',
    teams: 'Enviar por Teams',
    inApp: 'Notificacion in-app'
  },
  hrEdit: {
    formTitle: 'Editando como HR — el cambio se registrara en audit con tu identidad.',
    reasonLabel: 'Motivo del cambio HR (visible en audit log)',
    reasonPlaceholder: 'Ej. Valentina envio el RUT con typo, lo cargo yo con su autorizacion verbal',
    reasonHint: 'Minimo 10 caracteres. Quedara permanente en audit log.',
    signedFooter: 'Cambio firmado como HR · Quedara en audit log'
  },
  fields: {
    countryLabel: 'Pais emisor',
    documentTypeLabel: 'Tipo de documento',
    rutLabel: 'RUT',
    documentValueLabel: 'Numero de documento',
    rutPlaceholder: '12.345.678-K',
    addressTypeLabel: 'Tipo',
    addressCountryLabel: 'Pais',
    streetLabel: 'Calle y numero',
    streetPlaceholder: 'Av. Apoquindo 1234, Depto 501',
    cityLabel: 'Ciudad',
    regionLabel: 'Region / Estado',
    postalLabel: 'Codigo postal (opcional)'
  },
  reveal: {
    dialogTitleDoc: (name: string) => `Ver documento completo de ${name}`,
    dialogTitleAddr: (name: string) => `Ver direccion completa de ${name}`,
    dialogLead: 'Solo lo ves tu. Esta accion queda en audit log con tu identidad, motivo, IP y timestamp.',
    reasonLabel: 'Motivo del reveal (queda en audit)',
    reasonPlaceholder: 'Ej. verificacion contra cedula entregada por colaborador',
    reasonHint: 'Minimo 5 caracteres.',
    countdown: 'Se ocultara automaticamente en 30 segundos',
    closeNow: 'Cerrar ahora',
    revealCta: 'Revelar',
    copyAria: 'Copiar al portapapeles',
    copied: 'Copiado'
  },
  rejectDialog: {
    title: (name: string) => `Rechazar documento de ${name}`,
    titleAddr: (name: string) => `Rechazar direccion de ${name}`,
    lead: 'El motivo se persiste en audit log y se notifica al colaborador.',
    reasonLabel: 'Motivo del rechazo',
    reasonHint: 'Minimo 10 caracteres. Se mostrara al colaborador.',
    confirm: 'Rechazar',
    cancel: 'Cancelar'
  },
  anomaly: (n: number) =>
    `Has revelado ${n} datos sensibles en las ultimas 24h. Considera si todos los reveals fueron necesarios. Cada uno queda en audit log.`,
  /** Generico cuando no se conoce el pais del colaborador */
  genericDocumentTitle: 'Documento de identidad',
  documentTypeLabels: {
    CL_RUT: 'RUT (Chile)',
    CL_PASSPORT: 'Pasaporte (Chile)',
    AR_DNI: 'DNI (Argentina)',
    AR_CUIL: 'CUIL (Argentina)',
    AR_CUIT: 'CUIT (Argentina)',
    BR_CPF: 'CPF (Brasil)',
    CO_CC: 'Cedula (Colombia)',
    CO_CE: 'Cedula extranjeria (Colombia)',
    MX_CURP: 'CURP (Mexico)',
    MX_RFC: 'RFC (Mexico)',
    PE_DNI: 'DNI (Peru)',
    UY_CI: 'Cedula (Uruguay)',
    US_SSN: 'SSN (US)',
    US_PASSPORT: 'Pasaporte (US)',
    GENERIC_PASSPORT: 'Pasaporte (otro pais)',
    GENERIC_NATIONAL_ID: 'Documento nacional (otro pais)'
  } as Record<string, string>,
  addressTypeLabels: {
    legal: 'Direccion legal',
    residence: 'Residencia',
    mailing: 'Correspondencia',
    emergency: 'Contacto de emergencia'
  } as const,
  toasts: {
    verified: 'Verificado',
    verifiedBody: 'Lista para emitir documentos formales.',
    rejected: 'Rechazado',
    rejectedBody: 'Notificamos al colaborador.',
    hrCreated: 'Cambio HR registrado',
    hrCreatedBody: 'Quedo en audit log con tu motivo.',
    revealLogged: 'Acceso registrado en audit',
    error: 'No se pudo completar la accion'
  },
  fetchError: 'No pudimos cargar los datos legales. Intenta actualizar la pagina.'
} as const

// COUNTRY_OPTIONS now lives in src/lib/locale/countries.ts as canonical
// dataset. Forms import COUNTRIES_SORTED directly from there.
// This export kept as legacy alias.
export { COUNTRIES_SORTED as COUNTRY_OPTIONS } from '@/lib/locale/countries'

export const DOC_TYPES_BY_COUNTRY: Record<string, ReadonlyArray<string>> = {
  CL: ['CL_RUT', 'CL_PASSPORT', 'GENERIC_NATIONAL_ID'],
  AR: ['AR_DNI', 'AR_CUIL', 'AR_CUIT', 'GENERIC_PASSPORT'],
  BR: ['BR_CPF', 'GENERIC_PASSPORT'],
  CO: ['CO_CC', 'CO_CE', 'GENERIC_PASSPORT'],
  MX: ['MX_CURP', 'MX_RFC', 'GENERIC_PASSPORT'],
  PE: ['PE_DNI', 'GENERIC_PASSPORT'],
  UY: ['UY_CI', 'GENERIC_PASSPORT'],
  US: ['US_SSN', 'US_PASSPORT'],
  __default: ['GENERIC_PASSPORT', 'GENERIC_NATIONAL_ID']
}

export const daysSince = (iso: string | null): number => {
  if (!iso) return 0

  try {
    const diff = Date.now() - new Date(iso).getTime()

    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
  } catch {
    return 0
  }
}
