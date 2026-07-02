#!/usr/bin/env tsx

import { buildSecureSubmitBody } from '@/lib/growth/forms/destinations/hubspot/adapter'
import { applyNameNormalizationPolicy } from '@/lib/growth/forms/name-normalization'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import {
  type FormConsentSnapshotRow,
  type FormSubmissionRow,
  getFormDefinitionByKey,
  getPublishedVersionBySlug,
  listDestinationsForVersion,
} from '@/lib/growth/forms/store'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const AEO_FORM_KEY = 'b120566a-dd1a-43c8-956a-4e0121e805b8'
const AEO_SLUG = 'efeonce-aeo-diagnostic'
const EXPECTED_VERSION_ID = process.env.AEO_EXPECTED_FORM_VERSION_ID?.trim() || null

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const requireValue = <T>(value: T | null | undefined, message: string): T => {
  if (value === null || value === undefined) throw new Error(message)

  return value
}

const ensure = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message)
}

const getField = (fields: unknown, key: string): Record<string, unknown> | null =>
  Array.isArray(fields) ? (fields.find(field => asObject(field).key === key) as Record<string, unknown> | undefined) ?? null : null

const sampleSubmission = (fields: Record<string, unknown>, formVersionId: string): FormSubmissionRow => ({
  submission_id: 'fsub-aeo-contract-check',
  form_id: 'fdef-efeonce-aeo-diagnostic',
  form_version_id: formVersionId,
  surface_id: 'fhsf-efeonce-aeo-diagnostic',
  page_uri: 'https://efeoncepro.com/aeo-2/',
  page_name: 'AEO',
  lead_email_hash: 'contract-check',
  normalized_fields_json: fields,
  encrypted_fields_json: {},
  status: 'accepted',
  rejection_reason_class: null,
  dedupe_fingerprint: 'contract-check',
  request_id: null,
  ip_hash: null,
  delivery_attempts: 0,
  next_attempt_at: null,
  created_at: new Date(0),
  updated_at: new Date(0),
})

const sampleConsent = (): FormConsentSnapshotRow => ({
  submission_id: 'fsub-aeo-contract-check',
  consent_policy_version: 'efeonce-aeo-diagnostic-consent-v1',
  legal_basis: 'consent',
  checkboxes_json: ['privacy'],
  notice_text_hash: 'contract-check',
  privacy_url: 'https://efeoncepro.com/privacy',
  created_at: new Date(0),
})

const main = async (): Promise<void> => {
  const definition = requireValue(
    await getFormDefinitionByKey(AEO_FORM_KEY),
    `No active form definition found for AEO form_key=${AEO_FORM_KEY}`,
  )

  ensure(definition.slug === AEO_SLUG, `AEO form_key resolves to slug=${definition.slug}; expected ${AEO_SLUG}`)
  ensure(definition.status === 'active', `AEO definition status=${definition.status}; expected active`)

  const version = requireValue(await getPublishedVersionBySlug(AEO_SLUG), `No published AEO form version found for ${AEO_SLUG}`)

  ensure(!EXPECTED_VERSION_ID || version.form_version_id === EXPECTED_VERSION_ID, `Published AEO version is ${version.form_version_id}; expected ${EXPECTED_VERSION_ID}`)

  const fields = version.field_schema_json
  const fullNameField = requireValue(getField(fields, 'fullName'), 'Published AEO version does not expose field key fullName')
  const legacyFirstName = getField(fields, 'firstName')
  const validation = asObject(version.validation_schema_json)
  const namePolicy = asObject(validation.namePolicy)

  ensure(fullNameField.label === 'Nombre completo', `fullName label=${String(fullNameField.label)}; expected Nombre completo`)
  ensure(fullNameField.autocomplete === 'name', `fullName autocomplete=${String(fullNameField.autocomplete)}; expected name`)
  ensure(!legacyFirstName, 'Published AEO version still exposes legacy firstName field')
  ensure(namePolicy.mode === 'split_full_name', `namePolicy.mode=${String(namePolicy.mode)}; expected split_full_name`)
  ensure(namePolicy.sourceField === 'fullName', `namePolicy.sourceField=${String(namePolicy.sourceField)}; expected fullName`)
  ensure(namePolicy.firstNameField === 'firstName', `namePolicy.firstNameField=${String(namePolicy.firstNameField)}; expected firstName`)
  ensure(namePolicy.lastNameField === 'lastName', `namePolicy.lastNameField=${String(namePolicy.lastNameField)}; expected lastName`)

  const normalized = applyNameNormalizationPolicy(version.validation_schema_json, {
    fullName: '  Ana   Silva  ',
    email: 'ana@example.com',
  })

  ensure(normalized.fullName === 'Ana Silva', `normalized.fullName=${String(normalized.fullName)}; expected Ana Silva`)
  ensure(normalized.firstName === 'Ana', `normalized.firstName=${String(normalized.firstName)}; expected Ana`)
  ensure(normalized.lastName === 'Silva', `normalized.lastName=${String(normalized.lastName)}; expected Silva`)

  const destinations = await listDestinationsForVersion(version.form_version_id)

  const hubspot = requireValue(
    destinations.find(destination => destination.provider === 'hubspot' && destination.enabled),
    `No enabled HubSpot destination found for ${version.form_version_id}`,
  )

  const mapping = asObject(hubspot.mapping_json)
  const fieldMapping = asObject(mapping.fieldMapping)

  ensure(fieldMapping.firstName === 'firstname', `HubSpot mapping firstName=${String(fieldMapping.firstName)}; expected firstname`)
  ensure(fieldMapping.lastName === 'lastname', `HubSpot mapping lastName=${String(fieldMapping.lastName)}; expected lastname`)
  ensure(fieldMapping.fullName === undefined, 'HubSpot mapping must not send fullName')

  const body = buildSecureSubmitBody(sampleSubmission(normalized, version.form_version_id), sampleConsent(), mapping)
  const bodyFields = Array.isArray(body.fields) ? body.fields : []

  const bodyFieldValues = Object.fromEntries(
    bodyFields.map(field => {
      const item = asObject(field)

      return [String(item.name), item.value]
    }),
  )

  ensure(bodyFieldValues.email === 'ana@example.com', `HubSpot secure-submit email=${String(bodyFieldValues.email)}; expected ana@example.com`)
  ensure(bodyFieldValues.firstname === 'Ana', `HubSpot secure-submit firstname=${String(bodyFieldValues.firstname)}; expected Ana`)
  ensure(bodyFieldValues.lastname === 'Silva', `HubSpot secure-submit lastname=${String(bodyFieldValues.lastname)}; expected Silva`)
  ensure(!JSON.stringify(body).includes('fullName'), 'HubSpot secure-submit body must not contain fullName')

  console.log(JSON.stringify({
    ok: true,
    contract: 'AEO fullName server-side namePolicy and HubSpot destination mapping are rollout-ready',
    formKey: AEO_FORM_KEY,
    slug: definition.slug,
    formVersionId: version.form_version_id,
    version: version.version,
    destinationId: hubspot.destination_id,
    fieldMapping: {
      firstName: fieldMapping.firstName,
      lastName: fieldMapping.lastName,
      fullName: fieldMapping.fullName ?? null,
    },
    sampleSecureSubmitFields: bodyFields,
  }, null, 2))
}

main()
  .catch(error => {
    console.error(`growth:forms:verify-aeo-full-name-destination-contract failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres().catch(() => {})
  })
