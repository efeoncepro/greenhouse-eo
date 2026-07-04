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
  consentDisplaySchema,
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

  if (Object.keys(destinationPolicy).length === 0 && destinations.length === 0 && definition.form_kind !== 'survey') {
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
  const hasFileField = fields.some(f => f.type === 'hidden' && f.key.includes('file')) // V1 no soporta uploads reales

  if (hasFileField) {
    addWarning({
      code: 'upload_not_supported_v1',
      dimension: 'upload',
      message: 'document_upload requiere upload policy + scan/quarantine (no soportado en V1)',
      blocking: true,
    })
  }

  // — Consent display (browser-safe) —
  const consentDisplay = consentDisplaySchema.safeParse({
    consentPolicyVersion: version.consent_policy_version ?? undefined,
    ...asObject(version.copy_refs_json),
  })

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
