import 'server-only'

/** UI-only migration. Dry-run by default; --apply --expect-version=<id> clones and publishes.
 * No schema, copy, validation, destination, consent, security or success behavior changes.
 * --render-preview=<file> exports ONLY the browser-safe compiled contract for local QA.
 */
import { writeFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'

import { addDestination, authorDraftForm, deprecateForm, publishForm, setDestinationEnabledCommand } from '@/lib/growth/forms/commands'
import type { FormKind, RiskProfile } from '@/lib/growth/forms/contracts'
import { compileFormVersion } from '@/lib/growth/forms/policy-compiler'
import { getFormDefinitionByKey, getPublishedVersionBySlug, listDestinationsForVersion } from '@/lib/growth/forms/store'
import { withGraderBrandFirstIntake } from '../lib/grader-brand-first-intake'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { preserveFormVersionFields } from '../lib/preserve-form-version-fields'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const apply = process.argv.includes('--apply')
const argument = (name: string) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3)
const expectedVersion = argument('expect-version')
const previewPath = argument('render-preview')

async function main() {
  if (apply && !expectedVersion) throw new Error('expected_version_required')
  const definition = await getFormDefinitionByKey('69cd5269-5f97-4d32-99c4-0b23f41aa2f5')

  if (!definition || definition.status !== 'active' || definition.form_id !== 'fdef-ai-visibility-grader') {
    throw new Error('grader_definition_drift')
  }

  const current = await getPublishedVersionBySlug(definition.slug)

  if (!current || (expectedVersion && current.form_version_id !== expectedVersion)) throw new Error('published_version_drift')
  const destinations = await listDestinationsForVersion(current.form_version_id)
  const uiPolicy = withGraderBrandFirstIntake(current.ui_policy_json)
  const compiled = compileFormVersion(definition, { ...current, ui_policy_json: uiPolicy }, destinations, { forPublication: true })

  if (!compiled.ok || !compiled.renderContract) throw new Error('compiler_blocked')
  if (previewPath) writeFileSync(previewPath, JSON.stringify(compiled.renderContract, null, 2), { mode: 0o600 })
  console.log(JSON.stringify({
    mode: apply ? 'APPLY' : 'DRY-RUN', sourceVersion: current.form_version_id,
    nextOrder: (uiPolicy.steps as Array<{ key: string }>).map(step => step.key),
    compilerPassed: compiled.ok, destinationsPreserved: destinations.length,
    previewExported: Boolean(previewPath),
  }, null, 2))

  if (isDeepStrictEqual(uiPolicy, current.ui_policy_json)) {
    console.log('Already brand-first; no mutation needed.')

    return
  }

  if (!apply) return

  const { formVersionId } = await authorDraftForm({
    slug: definition.slug, name: definition.name, formKind: definition.form_kind as FormKind,
    purpose: definition.purpose, riskProfile: (definition.risk_profile as RiskProfile) ?? 'medium',
    ...preserveFormVersionFields(current), fieldSchema: current.field_schema_json, uiPolicy,
    createdBy: 'ai-visibility-brand-first-intake',
  })

  for (const destination of destinations) {
    const copied = await addDestination({
      formVersionId, provider: destination.provider, adapterKind: destination.adapter_kind,
      adapterVersion: destination.adapter_version, endpointStatus: destination.endpoint_status,
      deliveryMode: destination.delivery_mode, mapping: destination.mapping_json,
      consentRequirements: destination.consent_requirements_json, retryPolicy: destination.retry_policy_json,
    })

    if (copied.enabled !== destination.enabled) await setDestinationEnabledCommand(copied.destination_id, destination.enabled)
  }

  const fresh = await getPublishedVersionBySlug(definition.slug)

  if (fresh?.form_version_id !== current.form_version_id) throw new Error('published_version_changed_draft_retained')
  const published = await publishForm(formVersionId)

  if (!published.ok) throw new Error('publication_blocked_draft_retained')
  const readback = await getPublishedVersionBySlug(definition.slug)

  if (readback?.form_version_id !== formVersionId ||
    !isDeepStrictEqual(preserveFormVersionFields(readback), { ...preserveFormVersionFields(current), uiPolicy }) ||
    !isDeepStrictEqual(readback.field_schema_json, current.field_schema_json)) {
    throw new Error('publication_readback_failed')
  }

  await deprecateForm(current.form_version_id)

  console.log(`Published and verified ${formVersionId}; previous version ${current.form_version_id} retained as deprecated.`)
}

main().then(() => process.exit(0)).catch(error => {
  const known = /^(expected_version_required|grader_\w+|published_version_\w+|compiler_blocked|publication_\w+)$/
  const code = error instanceof Error && known.test(error.message) ? error.message : 'operation_failed_check_access_and_database'

  console.error(code)
  process.exit(1)
})
