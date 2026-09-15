import 'server-only'

/**
 * Activa el selector premium de país de Contacto sin tocar WordPress.
 *
 * Dry-run por defecto. El apply sólo se habilita cuando el renderer y los assets
 * vectoriales ya están en producción; luego clona, publica y depreca la versión
 * anterior, preservando seguridad, destinos y policies.
 */
import assert from 'node:assert/strict'

import { addDestination, authorDraftForm, deprecateForm, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import { getPublishedRenderContractByRef } from '@/lib/growth/forms/readers'
import {
  getFormDefinitionBySlug,
  getHostSurfaceById,
  getPublishedVersionBySlug,
  listDestinationsForVersion
} from '@/lib/growth/forms/store'
import { COUNTRIES_SORTED } from '@/lib/locale/countries'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { preserveFormVersionFields } from '../lib/preserve-form-version-fields'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const APPLY = process.argv.includes('--apply')
const FORM_SLUG = 'efeonce-contacto'
const FORM_SURFACE_ID = 'fhsf-efeonce-contacto'
const PUBLIC_ORIGIN = 'https://efeoncepro.com'
const RENDERER_URL = 'https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js'
const FLAG_PROBE_URL = 'https://greenhouse.efeoncepro.com/growth-forms/flags/cl.svg'
const countryDisplayNames = new Intl.DisplayNames(['es-CL', 'es'], { type: 'region' })

const localizedCountryName = (country: (typeof COUNTRIES_SORTED)[number]) =>
  countryDisplayNames.of(country.code) ?? country.name

const countryField = {
  type: 'select',
  label: 'País',
  placeholder: 'Selecciona tu país',
  autocomplete: 'country-name',
  presentation: { icon: 'globe', control: 'country_select' },
  options: COUNTRIES_SORTED.map(country => ({
    value: localizedCountryName(country),
    label: localizedCountryName(country),
    countryCode: country.code
  }))
}

async function assertProductionRendererReady() {
  const [renderer, flag] = await Promise.all([fetch(RENDERER_URL), fetch(FLAG_PROBE_URL)])

  assert(renderer.ok, `Renderer productivo no disponible (${renderer.status})`)
  assert(flag.ok, `Assets de banderas aún no desplegados (${flag.status})`)
  assert((await renderer.text()).includes('country_select'), 'El renderer productivo aún no soporta country_select')
}

async function main() {
  const definition = await getFormDefinitionBySlug(FORM_SLUG)
  const surface = await getHostSurfaceById(FORM_SURFACE_ID)
  const current = await getPublishedVersionBySlug(FORM_SLUG)

  assert(definition?.status === 'active', 'La definición de Contacto no está activa')
  assert(surface?.status === 'active', 'La surface de Contacto no está activa')
  assert(current, 'Contacto no tiene versión publicada')

  const fields = structuredClone(current.field_schema_json) as Array<Record<string, unknown>>
  const country = fields.find(field => field.key === 'country')

  assert(country, 'Contacto no declara el campo country')
  Object.assign(country, countryField)

  const matches = JSON.stringify(current.field_schema_json) === JSON.stringify(fields)

  if (matches) {
    console.log(JSON.stringify({ status: 'already_published', version: current.form_version_id }, null, 2))

    return
  }

  const destinations = await listDestinationsForVersion(current.form_version_id)

  if (!APPLY) {
    console.log(
      JSON.stringify(
        {
          status: 'dry_run_verified',
          formKey: definition.form_key,
          previous: current.form_version_id,
          country: { type: country.type, placeholder: country.placeholder, options: countryField.options.length },
          destinations: destinations.length
        },
        null,
        2
      )
    )

    return
  }

  await assertProductionRendererReady()

  const authored = await authorDraftForm({
    slug: definition.slug,
    formKey: definition.form_key,
    name: definition.name,
    formKind: definition.form_kind as Parameters<typeof authorDraftForm>[0]['formKind'],
    purpose: definition.purpose,
    riskProfile: definition.risk_profile as Parameters<typeof authorDraftForm>[0]['riskProfile'],
    ...preserveFormVersionFields(current),
    fieldSchema: fields,
    createdBy: 'contacto-country-select-20260915'
  })

  for (const destination of destinations) {
    await addDestination({
      formVersionId: authored.formVersionId,
      provider: destination.provider,
      adapterKind: destination.adapter_kind,
      adapterVersion: destination.adapter_version,
      endpointStatus: destination.endpoint_status,
      deliveryMode: destination.delivery_mode,
      mapping: destination.mapping_json,
      consentRequirements: destination.consent_requirements_json,
      retryPolicy: destination.retry_policy_json
    })
  }

  const review = await reviewForm(authored.formVersionId)

  assert(review.ok, `Revisión bloqueada: ${review.blockingReasons.join('; ')}`)
  assert.equal(
    (await getPublishedVersionBySlug(FORM_SLUG))?.form_version_id,
    current.form_version_id,
    'La versión publicada cambió durante el apply'
  )

  const published = await publishForm(authored.formVersionId)

  assert(published.ok, `Publicación bloqueada: ${published.blockingReasons.join('; ')}`)
  await deprecateForm(current.form_version_id)

  const contract = await getPublishedRenderContractByRef(definition.form_key, {
    surfaceId: FORM_SURFACE_ID,
    origin: PUBLIC_ORIGIN
  })

  const readback = contract?.fields.find(field => field.key === 'country')

  assert.equal(readback?.type, 'select')
  assert.equal(readback?.presentation?.control, 'country_select')
  assert.equal(readback?.options?.length, countryField.options.length)

  console.log(
    JSON.stringify(
      {
        status: 'published_verified',
        previous: current.form_version_id,
        version: authored.formVersionId,
        countryOptions: readback.options.length
      },
      null,
      2
    )
  )
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : 'No se pudo activar el selector de país')
    process.exitCode = 1
  })
  .finally(() => closeGreenhousePostgres())
