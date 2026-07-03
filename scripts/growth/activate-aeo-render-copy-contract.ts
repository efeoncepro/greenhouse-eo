import 'server-only'

/**
 * TASK-1297 Slice 4 — Activación gobernada del render copy contract del form AEO.
 *
 * Publica una versión NUEVA de la definición AEO con `copy_refs_json.copy.submit` =
 * el CTA aprobado, para que `<greenhouse-form>` (TASK-1298) renderice el CTA correcto
 * desde `render_contract.copy.submit` en vez del default per-formKind del renderer.
 *
 * Identidad: el target se resuelve por `form_key` (identidad estable opaca), NO por la
 * etiqueta "AEO", slug, página ni screenshot. Antes de cualquier mutación imprime
 * slug / form_id / surface(s) para confirmación humana (risk matrix TASK-1297).
 *
 * Preserva fields, validation, `ui_policy.security.captcha` (Turnstile), success, consent,
 * destinations y demás policies de la versión vigente. Idempotente: no escribe si el copy
 * vigente ya matchea. DRY-RUN por defecto; `--apply` muta vía commands canónicos (clone →
 * copy destinations → publish → deprecate), nunca raw SQL.
 *
 * El CTA es copy ya aprobado (wireframe TASK-1298 Copy Ledger + growth-public-forms-runtime
 * -contract); este script no autora copy nuevo, sólo lo publica al contrato gobernado.
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-aeo-render-copy-contract.ts
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-aeo-render-copy-contract.ts --apply
 */

import { addDestination, authorDraftForm, deprecateForm, publishForm } from '@/lib/growth/forms/commands'
import {
  getFormDefinitionByKey,
  getPublishedVersionBySlug,
  listDestinationsForVersion,
  listHostSurfaces,
} from '@/lib/growth/forms/store'
import { preserveFormVersionFields } from '../lib/preserve-form-version-fields'

const APPLY = process.argv.includes('--apply')

// Identidad estable del form AEO (TASK-1297, verificada contra PG el 2026-06-30).
const AEO_FORM_KEY = 'b120566a-dd1a-43c8-956a-4e0121e805b8'

// CTA aprobado — fuente: wireframe TASK-1298 Copy Ledger + growth-public-forms-runtime-contract.
const SUBMIT_COPY = 'Solicitar diagnóstico gratis →'

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const currentSubmitCopy = (copyRefs: unknown): string | undefined => {
  const copy = asObject(asObject(copyRefs).copy)

  return typeof copy.submit === 'string' ? copy.submit : undefined
}

const withSubmitCopy = (copyRefs: unknown): Record<string, unknown> => {
  const refs = asObject(copyRefs)
  const copy = asObject(refs.copy)

  return { ...refs, copy: { ...copy, submit: SUBMIT_COPY } }
}

const main = async (): Promise<void> => {
  console.log(`Activación render copy contract AEO — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)

  // 1. Resolver target por identidad estable (NO por etiqueta/slug).
  const definition = await getFormDefinitionByKey(AEO_FORM_KEY)

  if (!definition) {
    console.error(`FAIL: no existe form_definition con form_key="${AEO_FORM_KEY}". Abortando.`)
    process.exit(1)
  }

  if (definition.status !== 'active') {
    console.error(`FAIL: la definición ${definition.form_id} no está activa (status=${definition.status}). Abortando.`)
    process.exit(1)
  }

  // 2. Evidencia de resolución para confirmación humana antes de mutar.
  const surfaces = await listHostSurfaces()

  const relatedSurfaces = surfaces.filter(s => {
    const allowed = Array.isArray(s.allowed_form_slugs_json) ? (s.allowed_form_slugs_json as string[]) : []

    return allowed.length === 0 || allowed.includes(definition.slug)
  })

  console.log('\nTarget resuelto por form_key:')
  console.log(`  form_key : ${AEO_FORM_KEY}`)
  console.log(`  slug     : ${definition.slug}`)
  console.log(`  form_id  : ${definition.form_id}`)
  console.log(`  name     : ${definition.name}`)
  console.log(`  surfaces : ${relatedSurfaces.map(s => s.surface_id).join(', ') || '(ninguna)'}`)

  const current = await getPublishedVersionBySlug(definition.slug)

  if (!current) {
    console.error(`\nFAIL: no hay versión publicada para "${definition.slug}". Abortando.`)
    process.exit(1)
  }

  const destinations = await listDestinationsForVersion(current.form_version_id)
  const existingSubmit = currentSubmitCopy(current.copy_refs_json)

  console.log(`\nVersión publicada vigente: ${current.form_version_id} (v${current.version})`)
  console.log(`  copy.submit actual : ${existingSubmit ?? '(sin definir → default per-formKind del renderer)'}`)
  console.log(`  copy.submit objetivo: ${SUBMIT_COPY}`)
  console.log(`  destinos a copiar  : ${destinations.length}`)

  // 3. Idempotencia.
  if (existingSubmit === SUBMIT_COPY) {
    console.log('\nIdempotente: la versión publicada vigente ya expone copy.submit aprobado. Nada que hacer.')

    return
  }

  console.log('\nPlan:')
  console.log(`  - Clonar v${current.version}`)
  console.log('  - Preservar fields, validation, ui_policy.security.captcha, success, consent, data/destination/analytics/retention/commercial policies')
  console.log(`  - Setear copy_refs_json.copy.submit = ${JSON.stringify(SUBMIT_COPY)} (preservando el resto de copy_refs)`)
  console.log(`  - Copiar ${destinations.length} destino(s) de la versión vigente`)
  console.log(`  - Publicar versión nueva + deprecar ${current.form_version_id}`)

  if (!APPLY) {
    console.log('\nDRY-RUN: sin cambios. Re-correr con --apply para publicar.')

    return
  }

  const { formVersionId } = await authorDraftForm({
    slug: definition.slug,
    name: definition.name,
    formKind: definition.form_kind as 'diagnostic_intake',
    purpose: definition.purpose,
    riskProfile: (definition.risk_profile as 'low' | 'medium' | 'high' | undefined) ?? 'low',
    ...preserveFormVersionFields(current),
    fieldSchema: current.field_schema_json,
    copyRefs: withSubmitCopy(current.copy_refs_json),
    createdBy: 'aeo-render-copy-contract-activation',
  })

  console.log(`\nDraft creado: ${formVersionId}`)

  for (const destination of destinations) {
    const copied = await addDestination({
      formVersionId,
      provider: destination.provider,
      adapterKind: destination.adapter_kind,
      adapterVersion: destination.adapter_version,
      endpointStatus: destination.endpoint_status,
      deliveryMode: destination.delivery_mode,
      mapping: destination.mapping_json,
      consentRequirements: destination.consent_requirements_json,
      retryPolicy: destination.retry_policy_json,
    })

    console.log(`Destino copiado: ${destination.destination_id} -> ${copied.destination_id}`)
  }

  const published = await publishForm(formVersionId)

  if (!published.ok) {
    console.error('FAIL: el compiler bloqueó la publicación:')
    published.blockingReasons.forEach(reason => console.error(`  - ${reason}`))
    process.exit(1)
  }

  console.log(`Publicada: ${formVersionId}`)

  await deprecateForm(current.form_version_id)
  console.log(`Deprecada: ${current.form_version_id}`)

  console.log(`\nAPPLY completo. copy.submit del render contract AEO = ${JSON.stringify(SUBMIT_COPY)}.`)
  console.log(`Nueva versión publicada: ${formVersionId}. Documentar en docs/runtime + Handoff (Slice 5).`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('FAIL:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
