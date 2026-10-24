/**
 * TASK-1229 — Growth Forms engine: policy compiler.
 *
 * Convierte un `form_version` revisado en TRES salidas acotadas (Arch §10.1):
 *   - render_contract     (browser-safe; lo único que recibe el renderer)
 *   - submission_contract (server-only: validación/normalización/dedupe/spam)
 *   - destination_plan    (server-only: router de destinos)
 *
 * Gate de publicación (Arch §10/§17): faltar una dimensión de policy, o un warning
 * en consent/destination/upload/success behavior, BLOQUEA la publicación.
 */
import {
  CONTRACT_VERSION,
  type CompositionMode,
  type DestinationPlan,
  type FieldDefinition,
  type RenderContract,
  type SubmissionContract,
  CONSENT_PRIVACY_LINK_MARKER,
  type ConsentDisplay,
  type FormPresentation,
  type InlinePillDisplay,
  type SuccessBehavior,
  FORM_PRESENTATIONS,
  consentDisplaySchema,
  inlinePillDisplaySchema,
  destinationPlanEntrySchema,
  fieldDefinitionSchema,
  renderSecuritySchema,
  renderStepSchema,
  sanitizeRenderCopy,
  successBehaviorSchema,
  telemetryPolicySchema,
} from './contracts'
import type { FormDefinitionRow, FormDestinationRow, FormVersionRow } from './store'

export interface CompileWarning {
  code: string
  dimension: 'consent' | 'destination' | 'upload' | 'success_behavior' | 'policy' | 'fields'
  message: string
  blocking: boolean
}

export interface CompileResult {
  ok: boolean
  blockingReasons: string[]
  warnings: CompileWarning[]
  renderContract: RenderContract | null
  submissionContract: SubmissionContract | null
  destinationPlan: DestinationPlan | null
}

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const parseFields = (raw: unknown): { fields: FieldDefinition[]; invalid: number } => {
  if (!Array.isArray(raw)) return { fields: [], invalid: 0 }
  const fields: FieldDefinition[] = []
  let invalid = 0

  for (const candidate of raw) {
    const parsed = fieldDefinitionSchema.safeParse(candidate)

    if (parsed.success) fields.push(parsed.data)
    else invalid += 1
  }

  
return { fields, invalid }
}

const validateUploadFields = (fields: FieldDefinition[]): CompileWarning[] => {
  const warnings: CompileWarning[] = []

  for (const field of fields.filter(candidate => candidate.type === 'file')) {
    if (!field.uploadPolicy) {
      warnings.push({
        code: 'upload_policy_missing',
        dimension: 'upload',
        message: `campo ${field.key} requiere uploadPolicy`,
        blocking: true,
      })
      continue
    }

    if (field.dataClass !== 'uploaded_file') {
      warnings.push({
        code: 'upload_data_class_invalid',
        dimension: 'upload',
        message: `campo ${field.key} debe declarar dataClass=uploaded_file`,
        blocking: true,
      })
    }

    if (field.uploadPolicy.multiple !== false) {
      warnings.push({
        code: 'upload_multiple_not_supported',
        dimension: 'upload',
        message: `campo ${field.key} debe declarar multiple=false`,
        blocking: true,
      })
    }

    if (field.uploadPolicy.scanPolicy !== 'scan_required') {
      warnings.push({
        code: 'upload_scan_policy_invalid',
        dimension: 'upload',
        message: `campo ${field.key} debe declarar scanPolicy=scan_required`,
        blocking: true,
      })
    }
  }

  return warnings
}

/**
 * `presentation.control: 'premium_select'` sólo tiene sentido en un `select` simple (listbox de una
 * opción). Se valida sólo ese valor: `country_select` conserva su contrato previo y ninguna versión
 * existente cambia de veredicto.
 */
const validatePresentationControls = (fields: FieldDefinition[]): CompileWarning[] =>
  fields
    .filter(field => field.presentation?.control === 'premium_select' && field.type !== 'select')
    .map(field => ({
      code: 'presentation_control_type_mismatch',
      dimension: 'fields' as const,
      message: `campo ${field.key}: presentation.control=premium_select sólo aplica a type=select`,
      blocking: true,
    }))

/**
 * TASK-2044 — El marcador `{privacyLink}` del consentimiento: como máximo uno por casilla, sin otros
 * marcadores, sin HTML junto a él y con `privacyUrl` declarada. Las casillas sin llaves no se evalúan,
 * así que ninguna versión existente cambia de veredicto.
 */
const CONSENT_TOKEN_PATTERN = /\{[A-Za-z][A-Za-z0-9_]*\}/g

const validateConsentPrivacyLink = (consent: ConsentDisplay | null): CompileWarning[] => {
  if (!consent) return []

  const warnings: CompileWarning[] = []

  for (const checkbox of consent.checkboxes) {
    const label = checkbox.label ?? ''
    const tokens = label.match(CONSENT_TOKEN_PATTERN) ?? []

    if (tokens.length === 0) continue

    const block = (code: string, message: string) =>
      warnings.push({ code, dimension: 'consent', message: `casilla ${checkbox.key}: ${message}`, blocking: true })

    if (tokens.some(token => token !== CONSENT_PRIVACY_LINK_MARKER)) {
      block('consent_marker_unknown', `sólo se admite el marcador ${CONSENT_PRIVACY_LINK_MARKER}`)
    }

    if (tokens.filter(token => token === CONSENT_PRIVACY_LINK_MARKER).length > 1) {
      block('consent_marker_repeated', `el marcador ${CONSENT_PRIVACY_LINK_MARKER} va una sola vez`)
    }

    if (/[<>]/.test(label)) {
      block('consent_marker_html', 'una casilla con marcador no admite HTML; el enlace lo construye el renderer')
    }

    if (!consent.privacyUrl) {
      block('consent_marker_without_privacy_url', `${CONSENT_PRIVACY_LINK_MARKER} exige privacyUrl`)
    }
  }

  return warnings
}

/**
 * TASK-2053 — Presentación `inline_pill`. Se declara en `ui_policy.presentation` (+ `ui_policy.inlinePill`).
 * Sin la clave (o con `standard`) el contrato no la lleva: ninguna versión existente cambia de contrato
 * ni de veredicto. Con `inline_pill` la forma del formulario queda acotada a lo que la píldora sabe
 * dibujar; todo lo demás bloquea en vez de degradar en silencio.
 */
interface ResolvedPresentation {
  presentation?: FormPresentation
  inlinePill?: InlinePillDisplay
  warnings: CompileWarning[]
}

const presentationBlock = (code: string, message: string): CompileWarning => ({
  code,
  dimension: 'policy',
  message,
  blocking: true,
})

const validateInlinePillNote = (note: string | undefined, consent: ConsentDisplay | null): CompileWarning[] => {
  if (!note) return []

  const warnings: CompileWarning[] = []
  const tokens: string[] = note.match(CONSENT_TOKEN_PATTERN) ?? []

  if (/[<>]/.test(note)) warnings.push(presentationBlock('inline_pill_note_html', 'inlinePill.note no admite HTML'))

  if (tokens.some(token => token !== CONSENT_PRIVACY_LINK_MARKER)) {
    warnings.push(presentationBlock('inline_pill_note_marker_unknown', `inlinePill.note sólo admite ${CONSENT_PRIVACY_LINK_MARKER}`))
  }

  if (tokens.filter(token => token === CONSENT_PRIVACY_LINK_MARKER).length > 1) {
    warnings.push(presentationBlock('inline_pill_note_marker_repeated', `${CONSENT_PRIVACY_LINK_MARKER} va una sola vez en inlinePill.note`))
  }

  if (tokens.includes(CONSENT_PRIVACY_LINK_MARKER) && !consent?.privacyUrl) {
    warnings.push(presentationBlock('inline_pill_note_without_privacy_url', `${CONSENT_PRIVACY_LINK_MARKER} en inlinePill.note exige privacyUrl`))
  }

  return warnings
}

const resolvePresentation = (
  uiPolicy: Record<string, unknown>,
  context: {
    fields: FieldDefinition[]
    composition: CompositionMode
    consent: ConsentDisplay | null
    successBehavior: SuccessBehavior | null
  },
): ResolvedPresentation => {
  const raw = uiPolicy.presentation

  if (raw === undefined || raw === null || raw === 'standard') {
    return 'inlinePill' in uiPolicy
      ? { warnings: [presentationBlock('inline_pill_labels_without_presentation', 'ui_policy.inlinePill exige presentation=inline_pill')] }
      : { warnings: [] }
  }

  if (typeof raw !== 'string' || !(FORM_PRESENTATIONS as readonly string[]).includes(raw)) {
    return { warnings: [presentationBlock('presentation_unknown', 'ui_policy.presentation no es una presentación conocida')] }
  }

  const warnings: CompileWarning[] = []
  const labels = inlinePillDisplaySchema.safeParse(uiPolicy.inlinePill ?? {})

  if (!labels.success) {
    warnings.push(presentationBlock('inline_pill_labels_invalid', 'ui_policy.inlinePill no valida el contrato (etiquetas acotadas, sin claves extra)'))
  } else {
    const labelValues = Object.entries(labels.data).filter(([key]) => key !== 'note').map(([, value]) => value)

    if (labelValues.some(value => typeof value === 'string' && /[<>{}]/.test(value))) {
      warnings.push(presentationBlock('inline_pill_label_markup', 'las etiquetas de inlinePill no admiten HTML ni marcadores'))
    }

    warnings.push(...validateInlinePillNote(labels.data.note, context.consent))
  }

  if (context.composition !== 'static') {
    warnings.push(presentationBlock('inline_pill_composition', 'inline_pill sólo admite composition=static'))
  }

  const visible = context.fields.filter(field => field.type !== 'hidden')

  if (visible.length !== 1 || visible[0].type !== 'email' || visible[0].required !== true) {
    warnings.push(presentationBlock('inline_pill_fields', 'inline_pill exige exactamente un campo visible type=email requerido (más campos ocultos)'))
  }

  if (context.consent && context.consent.checkboxes.length > 0) {
    warnings.push(presentationBlock('inline_pill_consent_checkboxes', 'inline_pill no dibuja casillas: el consentimiento va como aviso (inlinePill.note)'))
  }

  if (context.successBehavior?.kind === 'redirect' || context.successBehavior?.presentation === 'success_card') {
    warnings.push(presentationBlock('inline_pill_success_behavior', 'inline_pill confirma en la píldora: no admite redirect ni success_card'))
  }

  return {
    presentation: 'inline_pill',
    ...(labels.success && Object.keys(labels.data).length > 0 ? { inlinePill: labels.data } : {}),
    warnings,
  }
}

/**
 * Compila la versión. `forPublication=true` aplica el gate completo (errores
 * bloquean). `forPublication=false` (preview/draft) compila best-effort y reporta
 * warnings sin bloquear el render.
 */
export const compileFormVersion = (
  definition: FormDefinitionRow,
  version: FormVersionRow,
  destinations: FormDestinationRow[],
  options: { forPublication?: boolean } = {},
): CompileResult => {
  const warnings: CompileWarning[] = []
  const blockingReasons: string[] = []

  const addWarning = (w: CompileWarning) => {
    warnings.push(w)
    if (w.blocking) blockingReasons.push(`${w.dimension}: ${w.message}`)
  }

  // — Publication gate: dimensiones obligatorias (Arch §10) —
  const uiPolicy = asObject(version.ui_policy_json)
  const destinationPolicy = asObject(version.destination_policy_json)
  const retentionPolicy = asObject(version.retention_policy_json)
  const successBehaviorRaw = asObject(version.success_behavior_json)

  if (!version.consent_policy_version) {
    addWarning({ code: 'consent_policy_missing', dimension: 'consent', message: 'falta consent_policy_version', blocking: true })
  }

  if (
    Object.keys(destinationPolicy).length === 0 &&
    destinations.length === 0 &&
    definition.form_kind !== 'survey' &&
    definition.form_kind !== 'application'
  ) {
    addWarning({
      code: 'destination_policy_missing',
      dimension: 'destination',
      message: 'sin destination_policy ni destinos (y no es greenhouse_only)',
      blocking: true,
    })
  }

  if (Object.keys(retentionPolicy).length === 0) {
    addWarning({ code: 'retention_policy_missing', dimension: 'policy', message: 'falta retention_policy', blocking: true })
  }

  // — Fields —
  const { fields, invalid } = parseFields(version.field_schema_json)

  if (invalid > 0) {
    addWarning({ code: 'fields_invalid', dimension: 'fields', message: `${invalid} field(s) no validan el contrato`, blocking: true })
  }

  if (fields.length === 0) {
    addWarning({ code: 'fields_empty', dimension: 'fields', message: 'el form no declara campos', blocking: true })
  }

  // — Success behavior —
  const successParsed = successBehaviorSchema.safeParse(successBehaviorRaw)

  if (!successParsed.success) {
    addWarning({
      code: 'success_behavior_invalid',
      dimension: 'success_behavior',
      message: 'success_behavior ausente o inválido (el form promete un outcome que el backend no ejecuta)',
      blocking: true,
    })
  }

  // — Upload policy (solo si hay campos de archivo) —
  validateUploadFields(fields).forEach(addWarning)

  // — Controles de presentación (premium_select sólo en select) —
  validatePresentationControls(fields).forEach(addWarning)

  // — Consent display (browser-safe) —
  const consentDisplay = consentDisplaySchema.safeParse({
    consentPolicyVersion: version.consent_policy_version ?? undefined,
    ...asObject(version.copy_refs_json),
  })

  validateConsentPrivacyLink(consentDisplay.success ? consentDisplay.data : null).forEach(addWarning)

  // Un consentimiento que no parsea queda fuera del contrato. Si la versión declara los campos de
  // presentación de TASK-2044, ese descarte silencioso dejaría el formulario sin casilla: se bloquea.
  const consentCopyRefs = asObject(version.copy_refs_json)

  if (!consentDisplay.success && ('presentation' in consentCopyRefs || 'privacyLinkLabel' in consentCopyRefs)) {
    addWarning({
      code: 'consent_display_invalid',
      dimension: 'consent',
      message: 'el consentimiento declarado no valida el contrato (presentation/privacyLinkLabel)',
      blocking: true,
    })
  }

  // — Composición —
  const composition = (typeof uiPolicy.composition === 'string' ? uiPolicy.composition : 'static') as CompositionMode
  const stepParse = renderStepSchema.array().safeParse(uiPolicy.steps)
  let renderSteps: RenderContract['steps'] | undefined

  if (composition === 'multi_step_light') {
    if (!stepParse.success || stepParse.data.length === 0) {
      addWarning({
        code: 'steps_invalid',
        dimension: 'policy',
        message: 'multi_step_light requiere ui_policy.steps validos',
        blocking: options.forPublication === true,
      })
    } else {
      const knownFieldKeys = new Set(fields.map(field => field.key))
      const unknownStepFieldKeys = stepParse.data.flatMap(step => step.fieldKeys.filter(key => !knownFieldKeys.has(key)))

      if (unknownStepFieldKeys.length > 0) {
        addWarning({
          code: 'steps_unknown_fields',
          dimension: 'policy',
          message: `ui_policy.steps referencia campos inexistentes: ${[...new Set(unknownStepFieldKeys)].join(', ')}`,
          blocking: options.forPublication === true,
        })
      } else {
        renderSteps = stepParse.data
      }
    }
  }

  const securityCandidate =
    asObject(uiPolicy.security).captcha !== undefined
      ? asObject(uiPolicy.security)
      : asObject(uiPolicy.captcha).provider !== undefined
        ? { captcha: asObject(uiPolicy.captcha) }
        : undefined

  const securityParsed = securityCandidate ? renderSecuritySchema.safeParse(securityCandidate) : null

  if (securityParsed && !securityParsed.success) {
    addWarning({
      code: 'security_captcha_invalid',
      dimension: 'policy',
      message: 'configuración de captcha inválida o incompleta',
      blocking: options.forPublication === true,
    })
  }

  // — Presentación del formulario (TASK-2053) —
  const resolvedPresentation = resolvePresentation(uiPolicy, {
    fields,
    composition,
    consent: consentDisplay.success ? consentDisplay.data : null,
    successBehavior: successParsed.success ? successParsed.data : null,
  })

  resolvedPresentation.warnings.forEach(addWarning)

  // — Render contract (browser-safe) —
  const renderContract: RenderContract | null = successParsed.success
    ? {
        contractVersion: CONTRACT_VERSION,
        form: {
          formId: definition.form_id,
          formKey: definition.form_key,
          slug: definition.slug,
          formVersionId: version.form_version_id,
          version: version.version,
          locale: version.locale,
          formKind: definition.form_kind as RenderContract['form']['formKind'],
        },
        composition,
        fields,
        conditions: [],
        steps: renderSteps,
        // TASK-1297 — gate browser-safe del copy público: sólo strings acotados llegan al
        // contrato (descarta nested/no-string/over-length). Antes era un cast crudo: era el
        // único sub-objeto del render contract sin validar (consent/security ya usan safeParse).
        copy: sanitizeRenderCopy(asObject(version.copy_refs_json).copy),
        consent: consentDisplay.success ? consentDisplay.data : undefined,
        successBehavior: successParsed.data,
        styleVariant: version.style_variant ?? undefined,
        ...(resolvedPresentation.presentation ? { presentation: resolvedPresentation.presentation } : {}),
        ...(resolvedPresentation.inlinePill ? { inlinePill: resolvedPresentation.inlinePill } : {}),
        surfacePolicy: {
          allowedOrigins: [],
          rendererChannel: 'stable',
        },
        ...(securityParsed?.success ? { security: securityParsed.data } : {}),
        telemetryPolicy: telemetryPolicySchema.parse(asObject(version.analytics_policy_json)),
      }
    : null

  // — Submission contract (server-only) —
  const submissionContract: SubmissionContract = {
    formId: definition.form_id,
    formVersionId: version.form_version_id,
    fields,
    persistenceMode:
      (asObject(version.data_classification_json).persistenceMode as SubmissionContract['persistenceMode']) ??
      'normalized_only',
    dedupe: { enabled: true, fields: fields.filter(f => f.type === 'email').map(f => f.key) },
    spam: { honeypotField: 'company_website', maxPayloadBytes: 64_000 },
    consentRequired: definition.form_kind !== 'survey',
    consentPolicyVersion: version.consent_policy_version ?? undefined,
  }

  // — Destination plan (server-only) —
  const destinationPlan: DestinationPlan = {
    formVersionId: version.form_version_id,
    destinations: destinations
      .filter(d => d.enabled)
      .map(d => {
        const parsed = destinationPlanEntrySchema.safeParse({
          destinationId: d.destination_id,
          provider: d.provider,
          adapterKind: d.adapter_kind,
          adapterVersion: d.adapter_version,
          deliveryMode: d.delivery_mode,
          enabled: d.enabled,
          mapping: asObject(d.mapping_json),
        })

        
return parsed.success ? parsed.data : null
      })
      .filter((d): d is NonNullable<typeof d> => d !== null),
  }

  // Una destination que no parsea contra el contrato bloquea (Arch §12.1).
  if (destinationPlan.destinations.length !== destinations.filter(d => d.enabled).length) {
    addWarning({
      code: 'destination_mapping_invalid',
      dimension: 'destination',
      message: 'una o más destinations habilitadas no validan el contrato',
      blocking: true,
    })
  }

  const ok = options.forPublication ? blockingReasons.length === 0 && renderContract !== null : true

  return { ok, blockingReasons, warnings, renderContract, submissionContract, destinationPlan }
}
