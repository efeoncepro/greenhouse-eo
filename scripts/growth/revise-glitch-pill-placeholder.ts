/**
 * Glitch subscription pill: the email field's placeholder becomes «Tu correo» (2026-10-31, operator approved the site
 * footer from the Contacto canvas; «Tu correo electrónico» did not fit the 290 px footer column at the component's 16 px).
 *
 * Immutable version through the governed author → review → publish lifecycle. Everything else is preserved: field
 * keys, validation, copy, inline-pill labels and notice (so the consent notice hash does not change), consent policy,
 * security, surface, and the HubSpot destination (copied verbatim: direct, consentBy submission, subscription type).
 * The same form serves the blog home, so its placeholder changes too.
 *
 *   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/revise-glitch-pill-placeholder.ts         # dry run: compiles in memory, no writes
 *   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/revise-glitch-pill-placeholder.ts --apply    # author, review, publish, readback
 */
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'

import { addDestination, authorDraftForm, deprecateForm, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import { compileFormVersion } from '@/lib/growth/forms/policy-compiler'
import { getPublishedRenderContractByRef } from '@/lib/growth/forms/readers'
import {
  getFormDefinitionByKey,
  getFormVersionById,
  getHostSurfaceById,
  getPublishedVersionBySlug,
  listDestinationsForVersion
} from '@/lib/growth/forms/store'
import { closeGreenhousePostgres } from '@/lib/postgres/client'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { preserveFormVersionFields } from '../lib/preserve-form-version-fields'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const KEY = '6bc62588-a4a0-4214-9501-13b0c2948c81'
const SLUG = 'efeonce-blog-subscription'
const SURFACE = 'fhsf-efeonce-blog-subscription'
const PUBLISHED = 'fver-e6850cc8-4b39-40c7-9428-a148cfdd53bc'
const PLACEHOLDER = 'Tu correo'

async function main() {
  const definition = await getFormDefinitionByKey(KEY)

  assert(definition && definition.slug === SLUG && definition.status === 'active', 'Glitch form definition drift')
  const current = await getPublishedVersionBySlug(SLUG)

  assert.equal(current?.form_version_id, PUBLISHED, 'Published Glitch version drift')
  const surface = await getHostSurfaceById(SURFACE)

  assert(surface, 'Glitch surface not found')
  const destinations = await listDestinationsForVersion(PUBLISHED)

  assert.equal(destinations.length, 1, 'Expected exactly one destination on the published version')
  const [destination] = destinations

  const fields = structuredClone(current!.field_schema_json) as Array<Record<string, unknown>>
  const email = fields.filter(field => field.key === 'email')

  assert.equal(email.length, 1, 'Expected exactly one email field')
  const previousPlaceholder = email[0].placeholder

  email[0].placeholder = PLACEHOLDER

  const preserved = preserveFormVersionFields(current!)

  const input = {
    slug: definition.slug,
    formKey: KEY,
    name: definition.name,
    formKind: definition.form_kind,
    purpose: definition.purpose,
    riskProfile: definition.risk_profile,
    ...preserved,
    fieldSchema: fields,
    createdBy: 'operator-footer-glitch-placeholder-20261031'
  }

  // Dry run: same compiler as publication, in memory, with the destination as it will be copied.
  const draftRow = { ...current!, field_schema_json: fields }
  const dry = compileFormVersion(definition, draftRow, [destination], { forPublication: true })

  assert(dry.ok, JSON.stringify(dry.blockingReasons))
  assert.equal(dry.renderContract?.presentation, 'inline_pill')

  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ status: 'dry_run_verified', previous: PUBLISHED, previousPlaceholder, placeholder: PLACEHOLDER, presentation: dry.renderContract?.presentation, warnings: dry.warnings?.map(w => w.code) }))

    return
  }

  const { formVersionId } = await authorDraftForm(input as Parameters<typeof authorDraftForm>[0])

  writeFileSync('tmp/glitch-placeholder-draft.json', JSON.stringify({ previous: PUBLISHED, formVersionId }, null, 2), { mode: 0o600 })
  const draft = await getFormVersionById(formVersionId)

  assert(draft)
  assert.deepEqual(preserveFormVersionFields(draft), preserved)
  assert.deepEqual(draft.field_schema_json, fields)

  await addDestination({
    formVersionId,
    provider: destination.provider,
    adapterKind: destination.adapter_kind,
    adapterVersion: destination.adapter_version,
    endpointStatus: destination.endpoint_status,
    deliveryMode: destination.delivery_mode,
    mapping: destination.mapping_json,
    consentRequirements: destination.consent_requirements_json,
    retryPolicy: destination.retry_policy_json
  } as Parameters<typeof addDestination>[0])
  const copied = await listDestinationsForVersion(formVersionId)

  assert.equal(copied.length, 1)
  assert.deepEqual(copied[0].mapping_json, destination.mapping_json, 'Destination mapping must be copied verbatim')

  const review = await reviewForm(formVersionId)

  assert(review.ok, 'Governed review blocked; inspect draft')
  // Guard again immediately before publishing: no concurrent version or surface change.
  assert.equal((await getPublishedVersionBySlug(SLUG))?.form_version_id, PUBLISHED)
  assert(await getHostSurfaceById(SURFACE))
  const published = await publishForm(formVersionId)

  assert(published.ok, 'Governed publish blocked; inspect draft')
  assert.equal((await getPublishedVersionBySlug(SLUG))?.form_version_id, formVersionId)

  const contract = await getPublishedRenderContractByRef(KEY, { surfaceId: SURFACE, origin: 'https://efeoncepro.com' })

  assert(contract)
  const contractEmail = (contract.fields as Array<Record<string, unknown>>).find(field => field.key === 'email')

  assert.equal(contractEmail?.placeholder, PLACEHOLDER)
  assert.equal(contract.presentation, 'inline_pill')
  await deprecateForm(PUBLISHED)

  const evidence = { status: 'published_verified', formKey: KEY, previous: PUBLISHED, version: formVersionId, placeholder: PLACEHOLDER, surface: SURFACE, destinations: 1 }

  writeFileSync('tmp/glitch-placeholder-published.json', JSON.stringify(evidence, null, 2), { mode: 0o600 })
  console.log(JSON.stringify(evidence))
}

main()
  .catch(error => {
    console.error('Glitch placeholder revision stopped. Inspect the saved draft and governed state before retrying; no private payload printed.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(() => closeGreenhousePostgres())
