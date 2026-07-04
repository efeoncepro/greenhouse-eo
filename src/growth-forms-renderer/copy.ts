/**
 * TASK-1231 — Growth Forms portable renderer · copy de SISTEMA (i18n, default es-CL).
 *
 * Distingue dos capas (Arch §19, piso `greenhouse-ux-writing`):
 *  - **Copy del form** (labels/consent/success/error de campo) → viene del `render_contract`
 *    (autorado en 1229/1232 sobre `src/lib/copy/*` en el portal).
 *  - **Copy de sistema del renderer** (loading/error de carga/reintentar/fallback/pending)
 *    → vive ACÁ porque el core portable NO puede importar `src/lib/copy/*`.
 *
 * Tono validado con `greenhouse-ux-writing`: es-CL tuteo, sentence case, "qué pasó +
 * cómo se arregla", sin códigos crudos. El preview de Greenhouse puede sobreponer el
 * copy canónico; los hosts públicos usan `locale=` del embed.
 */
import type { RendererFormKind } from './contract'

export interface RendererSystemCopy {
  loadingForm: string
  loadingAria: string
  loadError: string
  retry: string
  unavailable: string
  noScriptFallback: string
  submitPending: string
  submitError: string
  formRegionAria: string
  successFallback: string
  successCardTitle: string
  successCardBody: string
  successCardSteps: string[]
  successRewardTitle: string
  successRewardBody: string
  /** Título del resumen de errores accesible al enviar (TASK-1256 Slice 1d). */
  errorSummaryTitle: string
  /** Hint vivo de campos pendientes junto al submit. */
  fieldsRemaining: (count: number) => string
  /** Afirmación cuando no quedan campos pendientes. */
  readyToSend: string
  /** Aviso de borrador recuperado desde localStorage (PII-safe). */
  draftRestored: string
  /** Estado inline mientras corre la verificación de correo (TASK-1256 Slice 2). */
  emailVerifying: string
  /** Affordance typo-suggest: "¿Quisiste decir nombre@empresa.com?". */
  emailSuggestion: (suggested: string) => string
  /** aria-label del selector de país del teléfono internacional. */
  phoneCountryAria: string
  stepProgress: (current: number, total: number) => string
  stepEffort: (total: number) => string
  stepperAria: string
  stepStatusComplete: (label: string) => string
  stepStatusCurrent: (label: string) => string
  stepStatusUpcoming: (label: string) => string
  stepNext: string
  stepNextOptional: string
  stepBack: string
  stepSkipOptional: string
  intakeSummaryTitle: string
  stepSummaryComplete: (label: string) => string
  stepSummaryOptionalAdded: (label: string) => string
  stepSummaryOptionalAvailable: (label: string) => string
  stepSummaryPending: (label: string, count: number) => string
  validationSummary: (count: number) => string
  errors: {
    required: string
    email: string
    url: string
    tel: string
    nationalId: string
    date: string
    number: string
    corporate: string
    disposable: string
    maxLength: (max: number) => string
    consentRequired: string
  }
  submitByKind: Record<RendererFormKind, string>
}

const esCL: RendererSystemCopy = {
  loadingForm: 'Cargando formulario…',
  loadingAria: 'Cargando formulario',
  loadError: 'No pudimos cargar el formulario. Intenta de nuevo.',
  retry: 'Reintentar',
  unavailable: 'Formulario no disponible.',
  noScriptFallback: 'Este formulario necesita JavaScript para funcionar. Actívalo e intenta de nuevo.',
  submitPending: 'Preparando solicitud…',
  submitError: 'No pudimos enviar tu formulario. Intenta de nuevo en unos minutos.',
  formRegionAria: 'Formulario',
  successFallback: 'Recibimos tu información. Gracias.',
  successCardTitle: 'Recibimos tu información',
  successCardBody: 'Tu solicitud quedó registrada. La estamos revisando y aquí mismo te mostramos el siguiente paso.',
  successCardSteps: [
    'Validamos la información enviada.',
    'Revisamos el contexto de tu marca.',
    'Te proponemos el siguiente paso.'
  ],
  successRewardTitle: 'Te dejamos un recurso para empezar',
  successRewardBody: 'Puedes abrirlo ahora sin volver a completar el formulario.',
  errorSummaryTitle: 'Revisa estos campos para continuar',
  fieldsRemaining: count => (count === 1 ? 'Falta 1 campo' : `Faltan ${count} campos`),
  readyToSend: 'Listo: ya puedes solicitar tu diagnóstico',
  draftRestored: 'Recuperamos lo que habías escrito.',
  emailVerifying: 'Verificando correo…',
  emailSuggestion: suggested => `¿Quisiste decir ${suggested}?`,
  phoneCountryAria: 'País del teléfono',
  stepProgress: (current, total) => `Paso ${current} de ${total}`,
  stepEffort: total => `${total} pasos breves`,
  stepperAria: 'Progreso del formulario',
  stepStatusComplete: label => `${label}: completado`,
  stepStatusCurrent: label => `${label}: paso actual`,
  stepStatusUpcoming: label => `${label}: pendiente`,
  stepNext: 'Continuar',
  stepNextOptional: 'Continuar con este contexto',
  stepBack: 'Atrás',
  stepSkipOptional: 'Omitir por ahora',
  intakeSummaryTitle: 'Vista previa del informe',
  stepSummaryComplete: label => `${label}: listo`,
  stepSummaryOptionalAdded: label => `${label}: contexto agregado`,
  stepSummaryOptionalAvailable: label => `${label}: opcional`,
  stepSummaryPending: (label, count) => `${label}: falta${count === 1 ? '' : 'n'} ${count}`,
  validationSummary: count =>
    count === 1 ? 'Revisa 1 campo para continuar.' : `Revisa ${count} campos para continuar.`,
  errors: {
    required: 'Completa este campo para continuar.',
    email: 'Ingresa un correo válido (ej. nombre@empresa.com).',
    url: 'Ingresa una dirección web válida (ej. https://tuempresa.com).',
    tel: 'Ingresa un teléfono válido (ej. +56 9 1234 5678).',
    nationalId: 'Ingresa un RUT válido (ej. 12.345.678-5).',
    date: 'Ingresa una fecha válida (ej. 2026-06-25).',
    number: 'Ingresa un número válido.',
    corporate: 'Usa el correo de tu empresa, no uno personal (ej. nombre@tuempresa.com).',
    disposable: 'Este correo es temporal. Usa tu correo de empresa para continuar.',
    maxLength: max => `Máximo ${max} caracteres.`,
    consentRequired: 'Necesitas aceptar para continuar.'
  },
  submitByKind: {
    subscribe: 'Suscribirme',
    lead_magnet: 'Quiero el material',
    contact: 'Enviar mensaje',
    diagnostic_intake: 'Enviar solicitud',
    quote_request: 'Solicitar propuesta',
    pricing_simulation: 'Ver estimación',
    document_upload: 'Enviar documentos',
    event_registration: 'Reservar mi lugar',
    survey: 'Enviar respuestas',
    preference: 'Guardar preferencias',
    application: 'Enviar postulación'
  }
}

const enUS: RendererSystemCopy = {
  loadingForm: 'Loading form…',
  loadingAria: 'Loading form',
  loadError: 'We couldn’t load the form. Please try again.',
  retry: 'Try again',
  unavailable: 'Form unavailable.',
  noScriptFallback: 'This form needs JavaScript to work. Enable it and try again.',
  submitPending: 'Preparing request…',
  submitError: 'We couldn’t send your form. Please try again in a few minutes.',
  formRegionAria: 'Form',
  successFallback: 'We received your information. Thank you.',
  successCardTitle: 'We received your information',
  successCardBody: 'Your request was registered. We are reviewing it and showing you the next safe step here.',
  successCardSteps: [
    'We validate the information you sent.',
    'We review your brand context.',
    'We suggest the next step.'
  ],
  successRewardTitle: 'Here is a resource to get started',
  successRewardBody: 'You can open it now without completing the form again.',
  errorSummaryTitle: 'Review these fields to continue',
  fieldsRemaining: count => (count === 1 ? '1 field left' : `${count} fields left`),
  readyToSend: 'Ready to request the diagnostic',
  draftRestored: 'We restored what you had typed.',
  emailVerifying: 'Checking email…',
  emailSuggestion: suggested => `Did you mean ${suggested}?`,
  phoneCountryAria: 'Phone country',
  stepProgress: (current, total) => `Step ${current} of ${total}`,
  stepEffort: total => `${total} short steps`,
  stepperAria: 'Form progress',
  stepStatusComplete: label => `${label}: complete`,
  stepStatusCurrent: label => `${label}: current step`,
  stepStatusUpcoming: label => `${label}: upcoming`,
  stepNext: 'Continue',
  stepNextOptional: 'Continue with this context',
  stepBack: 'Back',
  stepSkipOptional: 'Skip for now',
  intakeSummaryTitle: 'Report preview',
  stepSummaryComplete: label => `${label}: ready`,
  stepSummaryOptionalAdded: label => `${label}: context added`,
  stepSummaryOptionalAvailable: label => `${label}: optional`,
  stepSummaryPending: (label, count) => `${label}: ${count} left`,
  validationSummary: count => (count === 1 ? 'Check 1 field to continue.' : `Check ${count} fields to continue.`),
  errors: {
    required: 'Please complete this field to continue.',
    email: 'Enter a valid email (e.g. name@company.com).',
    url: 'Enter a valid web address (e.g. https://yourcompany.com).',
    tel: 'Enter a valid phone number (e.g. +56 9 1234 5678).',
    nationalId: 'Enter a valid national ID (e.g. 12.345.678-5).',
    date: 'Enter a valid date (e.g. 2026-06-25).',
    number: 'Enter a valid number.',
    corporate: 'Use your company email, not a personal one (e.g. name@yourcompany.com).',
    disposable: 'This is a temporary email. Use your company email to continue.',
    maxLength: max => `${max} characters max.`,
    consentRequired: 'You need to accept to continue.'
  },
  submitByKind: {
    subscribe: 'Subscribe',
    lead_magnet: 'Get the material',
    contact: 'Send message',
    diagnostic_intake: 'Send request',
    quote_request: 'Request proposal',
    pricing_simulation: 'See estimate',
    document_upload: 'Send documents',
    event_registration: 'Reserve my spot',
    survey: 'Send answers',
    preference: 'Save preferences',
    application: 'Send application'
  }
}

const TABLES: Record<string, RendererSystemCopy> = { 'es-CL': esCL, es: esCL, 'en-US': enUS, en: enUS }

/** Resuelve la tabla de copy de sistema por locale, con fallback es-CL. */
export const resolveSystemCopy = (locale: string | undefined): RendererSystemCopy => {
  if (!locale) return esCL

  return TABLES[locale] ?? TABLES[locale.split('-')[0]] ?? esCL
}
