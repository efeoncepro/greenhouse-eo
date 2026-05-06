#!/usr/bin/env tsx
/**
 * TASK-813 Slice 3 — Backfill services HubSpot p_services (0-162) → greenhouse_core.services.
 *
 * Itera todos los clients con `hubspot_company_id` y materializa los services
 * asociados desde HubSpot. Usa el helper directo `fetchServicesForCompany`
 * (bypass del bridge Cloud Run que tiene bug conocido con `p_services`).
 *
 * Comportamiento Slice 3 (post-audit corregido 2026-05-06):
 *   - Resolver canónico (service-sync.ts) tiene fallback via clients
 *     cuando organization no existe.
 *   - Con --create-missing-spaces, el resolver auto-crea space para clients
 *     sin space pero con hubspot_company_id (caso Aguas Andinas + Motogas).
 *     Default OFF — opt-in explícito.
 *   - Loyal y similares (sin client en GH) quedan reportados como
 *     huérfanos reales — operador resuelve creando client en Greenhouse.
 *
 * Idempotente: UPSERT por hubspot_service_id UNIQUE. Re-correr es safe.
 *
 * Uso:
 *   HUBSPOT_ACCESS_TOKEN=$(gcloud secrets versions access latest \
 *     --secret=hubspot-access-token --project=efeonce-group) \
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/services/backfill-from-hubspot.ts [--apply] [--create-missing-spaces]
 *
 *   Default: --dry-run (solo lista lo que haría sin mutar).
 */

import process from 'node:process'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { fetchServicesForCompany, type HubSpotServiceObject } from '@/lib/hubspot/list-services-for-company'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

interface CliOptions {
  apply: boolean
  createMissingSpaces: boolean
}

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2)

  return {
    apply: args.includes('--apply'),
    createMissingSpaces: args.includes('--create-missing-spaces')
  }
}

interface ClientTarget extends Record<string, unknown> {
  client_id: string
  client_name: string
  hubspot_company_id: string
  has_space: boolean
}

interface SpaceLookup extends Record<string, unknown> {
  space_id: string
  client_id: string
  organization_id: string | null
}

const CLIENTS_SQL = `
  SELECT
    c.client_id,
    c.client_name,
    c.hubspot_company_id,
    EXISTS (SELECT 1 FROM greenhouse_core.spaces s WHERE s.client_id = c.client_id) AS has_space
  FROM greenhouse_core.clients c
  WHERE c.hubspot_company_id IS NOT NULL
    AND c.hubspot_company_id != ''
    AND c.active = TRUE
  ORDER BY c.client_name
`

const SPACE_LOOKUP_SQL = `
  SELECT s.space_id, s.client_id, s.organization_id
  FROM greenhouse_core.spaces s
  WHERE s.client_id = $1
  LIMIT 1
`

const allocateSpaceCode = async (): Promise<string> => {
  const rows = await runGreenhousePostgresQuery<{ numeric_code: string }>(
    `SELECT numeric_code FROM greenhouse_core.spaces ORDER BY numeric_code DESC LIMIT 1`
  )

  const last = parseInt(rows[0]?.numeric_code ?? '00', 10)
  const next = last + 1

  if (next > 99) throw new Error('numeric_code allocator full (99 spaces)')

  return String(next).padStart(2, '0')
}

const createSpaceForClient = async (target: ClientTarget): Promise<SpaceLookup> => {
  const spaceId = `space-${target.client_id}`

  const orgRows = await runGreenhousePostgresQuery<{ organization_id: string | null }>(
    `SELECT o.organization_id
     FROM greenhouse_core.organizations o
     WHERE o.hubspot_company_id = $1
     LIMIT 1`,
    [target.hubspot_company_id]
  )

  const orgId = orgRows[0]?.organization_id ?? null
  const numericCode = await allocateSpaceCode()

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_core.spaces (
      space_id, client_id, organization_id, space_name, space_type, status, active, numeric_code,
      notes, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, 'client_space', 'active', TRUE, $5,
      $6, NOW(), NOW()
    )
    ON CONFLICT (space_id) DO NOTHING`,
    [
      spaceId,
      target.client_id,
      orgId,
      target.client_name,
      numericCode,
      `Auto-created by TASK-813 backfill for HubSpot p_services materialization`
    ]
  )

  await publishOutboxEvent({
    aggregateType: 'space',
    aggregateId: spaceId,
    eventType: 'commercial.space.auto_created',
    payload: {
      version: 1,
      spaceId,
      clientId: target.client_id,
      organizationId: orgId,
      clientName: target.client_name,
      source: 'backfill-from-hubspot.ts',
      createdAt: new Date().toISOString()
    }
  })

  return { space_id: spaceId, client_id: target.client_id, organization_id: orgId }
}

interface UpsertResult {
  action: 'created' | 'updated' | 'skipped'
  serviceId: string
}

const upsertService = async (
  svc: HubSpotServiceObject,
  space: SpaceLookup
): Promise<UpsertResult> => {
  const hubspotServiceId = svc.id
  const serviceId = `SVC-HS-${hubspotServiceId}`
  const props = svc.properties
  const name = props.hs_name || `Service ${hubspotServiceId}`
  // Si ef_linea_de_servicio NULL → marcar 'unmapped' para que downstream filtre.
  const lineaDeServicio = props.ef_linea_de_servicio ?? 'efeonce_digital'
  const servicioEspecifico = props.ef_servicio_especifico ?? 'consulting'
  const modalidad = props.ef_modalidad ?? 'continua'
  const billingFrequency = props.ef_billing_frequency ?? 'monthly'
  const country = props.ef_country ?? 'CL'
  const currency = props.ef_currency ?? 'CLP'
  const totalCost = props.ef_total_cost ? Number(props.ef_total_cost) : 0
  const amountPaid = props.ef_amount_paid ? Number(props.ef_amount_paid) : 0
  const startDate = props.ef_start_date || null
  const targetEndDate = props.ef_target_end_date || null
  const notionProjectId = props.ef_notion_project_id || null
  const hubspotDealId = props.ef_deal_id || null
  // Robust signal: si el operador HubSpot no clasificó (ef_linea NULL),
  // marcar sync_status='unmapped' para que downstream filtre y P&L no
  // contamine. El default operacional sigue siendo 'synced' cuando hay datos.
  const syncStatus = props.ef_linea_de_servicio ? 'synced' : 'unmapped'

  const result = await runGreenhousePostgresQuery<{ action: string }>(
    `INSERT INTO greenhouse_core.services (
      service_id, hubspot_service_id, name, space_id, organization_id,
      hubspot_company_id, hubspot_deal_id,
      pipeline_stage, start_date, target_end_date,
      total_cost, amount_paid, currency,
      linea_de_servicio, servicio_especifico, modalidad, billing_frequency, country,
      notion_project_id, hubspot_last_synced_at, hubspot_sync_status,
      active, status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      'active', $8::date, $9::date,
      $10, $11, $12,
      $13, $14, $15, $16, $17,
      $18, NOW(), $19,
      TRUE, 'active', NOW(), NOW()
    )
    ON CONFLICT (hubspot_service_id) DO UPDATE SET
      name = EXCLUDED.name,
      total_cost = EXCLUDED.total_cost,
      amount_paid = EXCLUDED.amount_paid,
      currency = EXCLUDED.currency,
      start_date = EXCLUDED.start_date,
      target_end_date = EXCLUDED.target_end_date,
      notion_project_id = EXCLUDED.notion_project_id,
      hubspot_deal_id = EXCLUDED.hubspot_deal_id,
      hubspot_last_synced_at = NOW(),
      hubspot_sync_status = EXCLUDED.hubspot_sync_status,
      updated_at = NOW()
    RETURNING CASE WHEN xmax = 0 THEN 'created' ELSE 'updated' END AS action`,
    [
      serviceId, hubspotServiceId, name, space.space_id, space.organization_id,
      space.client_id, hubspotDealId,
      startDate, targetEndDate,
      totalCost, amountPaid, currency,
      lineaDeServicio, servicioEspecifico, modalidad, billingFrequency, country,
      notionProjectId, syncStatus
    ]
  )

  const action = (result[0]?.action ?? 'skipped') as 'created' | 'updated' | 'skipped'

  if (action === 'created' || action === 'updated') {
    await publishOutboxEvent({
      aggregateType: 'service_engagement',
      aggregateId: serviceId,
      eventType: 'commercial.service_engagement.materialized',
      payload: {
        version: 1,
        action,
        serviceId,
        hubspotServiceId,
        name,
        spaceId: space.space_id,
        clientId: space.client_id,
        organizationId: space.organization_id,
        syncStatus,
        materializedAt: new Date().toISOString()
      }
    })
  }

  return { action, serviceId }
}

const main = async () => {
  const { apply, createMissingSpaces } = parseArgs()

  console.log(`\n=== TASK-813 Slice 3 — backfill services from HubSpot ${apply ? '(APPLY)' : '(DRY-RUN)'} ===`)
  console.log(`create-missing-spaces: ${createMissingSpaces ? 'YES' : 'no'}`)
  console.log(`hubspot-source: direct API (bypass bridge)\n`)

  const targets = await runGreenhousePostgresQuery<ClientTarget>(CLIENTS_SQL)

  console.log(`Found ${targets.length} clients with hubspot_company_id.\n`)

  const summary = {
    clients: 0,
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    spacesAutoCreated: 0,
    unmapped: 0,
    errors: [] as Array<{ client: string; error: string }>
  }

  for (const target of targets) {
    summary.clients++
    const flag = target.has_space ? '   ' : ' ⚠ '

    try {
      const services = await fetchServicesForCompany(target.hubspot_company_id)

      summary.fetched += services.length

      if (!apply) {
        const unmapped = services.filter(s => !s.properties.ef_linea_de_servicio).length

        console.log(`  ${flag} ${target.client_name}: ${services.length} services in HubSpot, unmapped=${unmapped}, has_space=${target.has_space}`)
        continue
      }

      // Resolve space (or create)
      const existing = await runGreenhousePostgresQuery<SpaceLookup>(SPACE_LOOKUP_SQL, [target.client_id])
      let space = existing[0]

      if (!space && createMissingSpaces) {
        space = await createSpaceForClient(target)
        summary.spacesAutoCreated++
      }

      if (!space) {
        console.log(`  ✗ ${target.client_name}: no space, skipping ${services.length} services. Use --create-missing-spaces to auto-create.`)
        continue
      }

      let created = 0
      let updated = 0
      let unmapped = 0

      for (const svc of services) {
        try {
          const r = await upsertService(svc, space)

          if (r.action === 'created') created++
          else if (r.action === 'updated') updated++
          if (!svc.properties.ef_linea_de_servicio) unmapped++
        } catch (e) {
          summary.errors.push({
            client: target.client_name,
            error: `service ${svc.id}: ${e instanceof Error ? e.message : String(e)}`
          })
        }
      }

      summary.created += created
      summary.updated += updated
      summary.unmapped += unmapped

      const auto = !existing[0] && createMissingSpaces ? ' [space auto-created]' : ''

      console.log(
        `  ✓ ${target.client_name}: created=${created} updated=${updated} unmapped=${unmapped}${auto}`
      )
    } catch (err) {
      summary.errors.push({
        client: target.client_name,
        error: err instanceof Error ? err.message : String(err)
      })
      console.log(`  ✗ ${target.client_name}: ${err instanceof Error ? err.message : err}`)
    }
  }

  if (!apply) {
    console.log(`\n[DRY-RUN] No changes applied. Re-run with --apply to mutate.`)
    console.log(`Tip: clients sin space (⚠) requieren --create-missing-spaces.\n`)
    console.log(`HubSpot services fetched: ${summary.fetched} from ${summary.clients} clients.\n`)
    
return
  }

  console.log(`\n=== Summary ===`)
  console.log(`  Clients processed:    ${summary.clients}`)
  console.log(`  Services fetched:     ${summary.fetched}`)
  console.log(`  Services created:     ${summary.created}`)
  console.log(`  Services updated:     ${summary.updated}`)
  console.log(`  Services unmapped:    ${summary.unmapped}  (status='unmapped' — operador clasifica)`)
  console.log(`  Spaces auto-created:  ${summary.spacesAutoCreated}`)
  console.log(`  Errors:               ${summary.errors.length}`)

  if (summary.errors.length > 0) {
    console.log(`\nErrors:`)

    for (const e of summary.errors) {
      console.log(`  - ${e.client}: ${e.error}`)
    }
  }

  console.log()
}

main().catch(error => {
  console.error('Script failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
