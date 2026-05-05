/**
 * TASK-784 redesign — Copy es-CL (tuteo) validada por skill greenhouse-ux-writing.
 *
 * Microcopy reusada > 1 surface vive aqui. Si se reusa > 3 surfaces, mover a
 * `src/lib/copy/dictionaries/es-CL/legalProfile.ts` (TASK-265 namespace).
 */

import type { LegalDocumentStatus } from './types'

export const LEGAL_PROFILE_COPY = {
  hero: {
    title: 'Tus datos legales',
    leadDefault:
      'Tu identidad y direccion oficial. Solo tu los declaras — nadie mas los ve sin tu autorizacion registrada en auditoria.',
    leadEmpty:
      'Para emitir tu finiquito y contrato formal necesitamos tu identidad legal y direccion.',
    leadComplete:
      'Puedes recibir cualquier documento formal sin bloqueos. Si algo cambia (mudanza, RUT nuevo), edita la fila correspondiente.',
    titleComplete: 'Listo. Todos tus datos estan verificados.',
    progressLabel: 'Progreso',
    progressUnit: '/4',
    privacyToggle: 'Como se usan tus datos',
    privacyBullets: [
      'Despues de guardarlos, solo veras la version enmascarada (xx.xxx.678-K).',
      'HR puede ver el valor completo solo con motivo registrado en audit log.',
      'Nunca aparecen en logs, alertas, prompts de IA ni mensajes de error.',
      'Cumplimos Ley 19.628 y Ley 21.719 sobre datos personales.'
    ]
  },
  sections: {
    identification: {
      title: 'Identificacion',
      hint: 'Documentos de identidad por pais'
    },
    addresses: {
      title: 'Direcciones',
      hint: 'Una activa por tipo'
    }
  },
  states: {
    pending_review: 'Pendiente',
    verified: 'Verificado',
    verified_address: 'Verificada',
    rejected: 'Rechazado',
    archived: 'Archivado',
    expired: 'Vencido',
    missing: 'Falta'
  } as Record<LegalDocumentStatus | 'verified_address' | 'missing', string>,
  statusBlock: {
    pending_review: 'HR esta revisando tu documento. Te avisaremos cuando quede verificado.',
    pending_review_address: 'HR esta revisando tu direccion. Te avisaremos cuando quede verificada.',
    verified: 'Verificado por HR · Listo para emitir documentos formales.',
    verified_address: 'Verificada por HR · Lista para emitir documentos formales.',
    missing_required: 'Necesario para emitir tu finiquito y contrato formal.',
    missing_optional: 'Opcional. Puedes agregarlo cuando quieras.',
    rejected_prefix: 'HR pidio corregir:'
  },
  empty: {
    addDocumentTitle: 'Agregar otro documento',
    addDocumentHint: 'Pasaporte, documento internacional, etc. (opcional)',
    addAddressTitle: 'Agregar otra direccion',
    addAddressHint: 'Solo si es distinta a la legal'
  },
  firstUse: {
    title: 'Empecemos por tu identidad legal',
    description:
      'Te tomara menos de un minuto. Solo necesitas tu RUT a mano. Despues podras agregar tu direccion.',
    cta: 'Declarar mi RUT'
  },
  itemActions: {
    edit: 'Editar',
    cancel: 'Cancelar',
    save: 'Guardar y enviar a revision',
    saving: 'Guardando…'
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
    postalLabel: 'Codigo postal (opcional)',
    rutHint:
      'Despues de guardar veras solo "xx.xxx.NNN-K". Tu valor completo nunca aparece en logs ni se comparte sin tu autorizacion.'
  },
  documentTypeLabels: {
    CL_RUT: 'RUT',
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
    US_SSN: 'SSN (Estados Unidos)',
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
  addressTypeHints: {
    legal: 'La que figura en tu contrato',
    residence: 'Donde vives actualmente',
    mailing: 'Donde recibir cartas fisicas',
    emergency: 'Persona y telefono para casos urgentes'
  } as const,
  blockerLabels: {
    cl_rut_missing: 'Falta declarar tu RUT',
    cl_rut_pending_review: 'Tu RUT esta pendiente de revision por HR',
    cl_rut_rejected: 'Tu RUT fue rechazado — vuelve a declararlo',
    cl_rut_archived_or_expired: 'Tu RUT esta archivado o vencido',
    address_missing_legal: 'Falta tu direccion legal',
    address_missing_residence: 'Falta tu direccion de residencia',
    profile_missing: 'Tu perfil de identidad no esta vinculado',
    document_missing: 'Falta declarar un documento',
    document_pending_review: 'Tu documento esta pendiente de revision'
  } as Record<string, string>,
  toasts: {
    documentSaved: 'Documento guardado',
    documentSavedBody: 'HR lo revisara y te avisaremos cuando quede verificado.',
    addressSaved: 'Direccion guardada',
    addressSavedBody: 'HR la revisara y te avisara cuando quede verificada.',
    saveError: 'No pudimos guardar'
  },
  fetchError: 'No pudimos cargar tus datos legales. Intenta actualizar la pagina.'
} as const

export const COUNTRY_OPTIONS: ReadonlyArray<{ code: string; flag: string; name: string }> = [
  { code: 'CL', flag: '🇨🇱', name: 'Chile' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina' },
  { code: 'BR', flag: '🇧🇷', name: 'Brasil' },
  { code: 'CO', flag: '🇨🇴', name: 'Colombia' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexico' },
  { code: 'PE', flag: '🇵🇪', name: 'Peru' },
  { code: 'UY', flag: '🇺🇾', name: 'Uruguay' },
  { code: 'US', flag: '🇺🇸', name: 'Estados Unidos' }
]

/** Document types disponibles por pais. CL_RUT primero cuando aplica. */
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

export const formatRelativeDeclared = (iso: string): string => {
  try {
    const declared = new Date(iso)
    const diffMs = Date.now() - declared.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Declarado hoy'
    if (diffDays === 1) return 'Declarado ayer'
    if (diffDays < 7) return `Declarado hace ${diffDays} dias`

    return `Declarado el ${declared.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })}`
  } catch {
    return ''
  }
}

export const formatVerifiedDate = (iso: string | null): string => {
  if (!iso) return ''

  try {
    return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}
