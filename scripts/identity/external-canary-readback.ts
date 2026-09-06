import process from 'node:process'

import { closeGreenhousePostgres, query } from '@/lib/db'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const rows = await query<{
    registrations: number
    canary_bindings: number
    external_purpose_drift: number
    internal_purpose_drift: number
    smoke_profiles: number
    smoke_in_person_360: number
  }>(
    `SELECT
      (SELECT count(*)::int FROM greenhouse_core.external_canary_registrations) AS registrations,
      (SELECT count(*)::int FROM greenhouse_core.external_organization_bindings
        WHERE binding_purpose='canary') AS canary_bindings,
      (SELECT count(*)::int FROM greenhouse_core.external_organization_bindings
        WHERE population='external' AND binding_purpose IS DISTINCT FROM 'customer') AS external_purpose_drift,
      (SELECT count(*)::int FROM greenhouse_core.external_organization_bindings
        WHERE population='internal' AND binding_purpose IS NOT NULL) AS internal_purpose_drift,
      (SELECT count(*)::int FROM greenhouse_core.identity_profiles
        WHERE data_origin='smoke_test') AS smoke_profiles,
      (SELECT count(*)::int
         FROM greenhouse_serving.person_360 p
         JOIN greenhouse_core.identity_profiles i ON i.profile_id=p.identity_profile_id
        WHERE i.data_origin='smoke_test') AS smoke_in_person_360`
  )

  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), ...rows[0] }, null, 2))
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : 'External canary readback failed')
    process.exitCode = 1
  })
  .finally(() => closeGreenhousePostgres())
