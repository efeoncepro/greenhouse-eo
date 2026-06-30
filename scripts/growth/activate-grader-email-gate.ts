import 'server-only'

/**
 * TASK-1263 — Activación gobernada del gate de correo corporativo en el grader-form.
 *
 * Publica una versión NUEVA del form `ai-visibility-grader` con `emailPolicy.mode=block_field`
 * por la vía gobernada (`authorDraftForm` + `publishForm`, NUNCA raw-SQL ni edición in-place de
 * una versión published — son inmutables por trigger). Como el grader fue sembrado fuera del
 * flujo de autoría, le faltan `destination_policy` + `retention_policy` que el compilador de
 * publicación exige → se definen acá (decisión de gobernanza, abajo). La versión anterior queda
 * `deprecated`. El clon es FIEL: field_schema + success_behavior + consent_policy_version salen
 * de la versión publicada vigente (no se pierde nada).
 *
 * El gate sólo aplica con `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED=true` (staging ya ON) + el
 * grader-form con esta `emailPolicy`. Default OFF = comportamiento legacy. Prod = cutover con
 * TASK-1246 + ratificación legal de la retención.
 *
 * DRY-RUN por defecto (no muta). `--apply` ejecuta la publicación + deprecación.
 * Idempotente: si la versión publicada vigente YA tiene `emailPolicy.block_field`, no duplica.
 *
 * Uso:
 *   set -a && source .env.local && set +a
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-grader-email-gate.ts          # dry-run
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-grader-email-gate.ts --apply  # aplica
 */

import { authorDraftForm, deprecateForm, publishForm } from '@/lib/growth/forms/commands'
import { resolveEmailPolicy } from '@/lib/growth/forms/contracts'
import { getPublishedVersionBySlug } from '@/lib/growth/forms/store'

const APPLY = process.argv.includes('--apply')

const GRADER_SLUG = 'ai-visibility-grader'

// — Gate a activar —
const VALIDATION_SCHEMA = { emailPolicy: { mode: 'block_field', field: 'email' } as const }

// — Decisión de gobernanza: políticas de datos faltantes que el compilador exige (Open Q1) —
// destination_policy: greenhouse-only. El grader NO usa un `form_destination` del motor; entrega
// por su pipeline propio (reactive consumer `growth_grader_run_from_submission`) + handoff HubSpot
// gobernado (TASK-1242). El compilador sólo exige un objeto no-vacío; estos campos lo documentan.
const DESTINATION_POLICY = {
  mode: 'greenhouse_only',
  engineDestinations: false,
  rationale:
    'El grader entrega por pipeline propio (reactive consumer growth_grader_run_from_submission) + handoff HubSpot gobernado (TASK-1242), no por form_destination del motor.',
}

// retention_policy: PII del prospecto (email/nombre) capturada con consent. Valores ratificables
// por legal antes del cutover prod (TASK-1246); en staging documentan la decisión.
const RETENTION_POLICY = {
  scope: 'prospect_lead_pii',
  leadPiiRetentionDays: 730,
  legalBasis: 'consent',
  consentPolicyVersion: 'ai-visibility-grader-consent-v1',
  rationale:
    'Retención de PII del prospecto (email/nombre) capturada con consent; eliminación/anonimización tras el período. Ratificable por legal antes del cutover prod (TASK-1246).',
}

const main = async (): Promise<void> => {
  console.log(`Activación gate email grader — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)

  const current = await getPublishedVersionBySlug(GRADER_SLUG)

  if (!current) {
    console.error(`FAIL: no hay versión publicada para el slug "${GRADER_SLUG}". Abortando.`)
    process.exit(1)
  }

  const currentPolicy = resolveEmailPolicy(current.validation_schema_json)

  console.log(`Versión publicada vigente: ${current.form_version_id} (v${current.version})`)
  console.log(`emailPolicy actual: mode=${currentPolicy.mode} field=${currentPolicy.field}`)

  if (currentPolicy.mode === 'block_field') {
    console.log('\nIdempotente: la versión publicada vigente YA tiene emailPolicy.block_field. Nada que hacer.')

    return
  }

  const fieldCount = Array.isArray(current.field_schema_json) ? current.field_schema_json.length : 0

  console.log('\nPlan:')
  console.log(`  - Clonar v${current.version} (${fieldCount} campos, success_behavior + consent intactos)`)
  console.log(`  - Setear validation_schema.emailPolicy = ${JSON.stringify(VALIDATION_SCHEMA.emailPolicy)}`)
  console.log(`  - destination_policy = ${JSON.stringify(DESTINATION_POLICY.mode)} (greenhouse-only)`)
  console.log(`  - retention_policy = ${RETENTION_POLICY.leadPiiRetentionDays}d (${RETENTION_POLICY.legalBasis})`)
  console.log(`  - Publicar versión nueva + deprecar ${current.form_version_id}`)

  if (!APPLY) {
    console.log('\nDRY-RUN: sin cambios. Re-correr con --apply para publicar.')

    return
  }

  // 1. Draft nuevo: clon fiel del contenido vigente + las 3 políticas (emailPolicy + las 2 que
  //    el compilador exige). authorDraftForm reusa la definición existente (slug) y crea v+1.
  const { formVersionId } = await authorDraftForm({
    slug: GRADER_SLUG,
    name: 'AI Visibility Grader',
    formKind: 'diagnostic_intake',
    purpose: 'Lead magnet público: captura marca + email (con consent) y dispara un diagnóstico de visibilidad en IA.',
    locale: current.locale,
    fieldSchema: current.field_schema_json,
    successBehavior: current.success_behavior_json,
    consentPolicyVersion: current.consent_policy_version ?? 'ai-visibility-grader-consent-v1',
    validationSchema: VALIDATION_SCHEMA,
    destinationPolicy: DESTINATION_POLICY,
    retentionPolicy: RETENTION_POLICY,
    createdBy: 'task-1263-activation',
  })

  console.log(`\nDraft creado: ${formVersionId}`)

  // 2. Publicar (corre el compilador: consent + destination_policy + retention_policy + fields +
  //    success_behavior). Si falta algo, NO publica y devuelve las razones.
  const published = await publishForm(formVersionId)

  if (!published.ok) {
    console.error('FAIL: el compilador bloqueó la publicación:')
    published.blockingReasons.forEach(r => console.error(`  - ${r}`))
    console.error('La versión quedó como draft (no published). No se deprecó la anterior.')
    process.exit(1)
  }

  console.log(`Publicada: ${formVersionId}`)

  // 3. Deprecar la versión anterior (status-only, permitido por el trigger de inmutabilidad).
  await deprecateForm(current.form_version_id)
  console.log(`Deprecada: ${current.form_version_id}`)

  console.log('\nAPPLY completo. La versión publicada vigente del grader tiene emailPolicy.block_field.')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('FAIL:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
