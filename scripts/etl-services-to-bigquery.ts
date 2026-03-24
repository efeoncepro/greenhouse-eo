/**
 * ETL: PostgreSQL greenhouse_core.services → BigQuery greenhouse_conformed.services
 *
 * Reads all services from Postgres and writes to BigQuery with WRITE_TRUNCATE.
 * Intended to run as a nightly cron or post-sync.
 *
 * Usage: npx tsx scripts/etl-services-to-bigquery.ts
 */

import { runGreenhousePostgresQuery } from '../src/lib/postgres/client'
import { getBigQueryClient, getBigQueryProjectId } from '../src/lib/bigquery'

interface ServiceRow extends Record<string, unknown> {
  service_id: string
  public_id: string | null
  hubspot_service_id: string | null
  name: string
  space_id: string
  organization_id: string | null
  hubspot_company_id: string | null
  hubspot_deal_id: string | null
  pipeline_stage: string
  start_date: string | null
  target_end_date: string | null
  total_cost: string | number | null
  amount_paid: string | number | null
  currency: string
  linea_de_servicio: string
  servicio_especifico: string
  modalidad: string | null
  billing_frequency: string | null
  country: string | null
  notion_project_id: string | null
  active: boolean
  status: string
  created_at: string
  updated_at: string
}

async function main() {
  console.log('=== ETL: services PostgreSQL → BigQuery ===\n')

  const rows = await runGreenhousePostgresQuery<ServiceRow>(
    `SELECT
      service_id, public_id, hubspot_service_id, name,
      space_id, organization_id, hubspot_company_id, hubspot_deal_id,
      pipeline_stage, start_date::text, target_end_date::text,
      total_cost, amount_paid, currency,
      linea_de_servicio, servicio_especifico, modalidad, billing_frequency, country,
      notion_project_id, active, status,
      created_at::text, updated_at::text
     FROM greenhouse_core.services`
  )

  console.log(`Read ${rows.length} services from PostgreSQL`)

  if (rows.length === 0) {
    console.log('Nothing to write.')

    return
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()
  const dataset = bigQuery.dataset('greenhouse_conformed')
  const table = dataset.table('services')

  // Ensure table exists
  const [tableExists] = await table.exists()

  if (!tableExists) {
    console.log('Creating greenhouse_conformed.services table...')

    await dataset.createTable('services', {
      schema: {
        fields: [
          { name: 'service_id', type: 'STRING', mode: 'REQUIRED' },
          { name: 'public_id', type: 'STRING' },
          { name: 'hubspot_service_id', type: 'STRING' },
          { name: 'name', type: 'STRING', mode: 'REQUIRED' },
          { name: 'space_id', type: 'STRING', mode: 'REQUIRED' },
          { name: 'organization_id', type: 'STRING' },
          { name: 'hubspot_company_id', type: 'STRING' },
          { name: 'hubspot_deal_id', type: 'STRING' },
          { name: 'pipeline_stage', type: 'STRING' },
          { name: 'start_date', type: 'DATE' },
          { name: 'target_end_date', type: 'DATE' },
          { name: 'total_cost', type: 'FLOAT64' },
          { name: 'amount_paid', type: 'FLOAT64' },
          { name: 'currency', type: 'STRING' },
          { name: 'linea_de_servicio', type: 'STRING' },
          { name: 'servicio_especifico', type: 'STRING' },
          { name: 'modalidad', type: 'STRING' },
          { name: 'billing_frequency', type: 'STRING' },
          { name: 'country', type: 'STRING' },
          { name: 'notion_project_id', type: 'STRING' },
          { name: 'active', type: 'BOOL' },
          { name: 'status', type: 'STRING' },
          { name: 'created_at', type: 'TIMESTAMP' },
          { name: 'updated_at', type: 'TIMESTAMP' }
        ]
      }
    })

    console.log('Table created.')
  }

  // Write with WRITE_TRUNCATE (full replace)
  const bqRows = rows.map(r => ({
    service_id: r.service_id,
    public_id: r.public_id,
    hubspot_service_id: r.hubspot_service_id,
    name: r.name,
    space_id: r.space_id,
    organization_id: r.organization_id,
    hubspot_company_id: r.hubspot_company_id,
    hubspot_deal_id: r.hubspot_deal_id,
    pipeline_stage: r.pipeline_stage,
    start_date: r.start_date?.slice(0, 10) || null,
    target_end_date: r.target_end_date?.slice(0, 10) || null,
    total_cost: Number(r.total_cost) || 0,
    amount_paid: Number(r.amount_paid) || 0,
    currency: r.currency,
    linea_de_servicio: r.linea_de_servicio,
    servicio_especifico: r.servicio_especifico,
    modalidad: r.modalidad,
    billing_frequency: r.billing_frequency,
    country: r.country,
    notion_project_id: r.notion_project_id,
    active: r.active,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at
  }))

  const tempTable = `${projectId}.greenhouse_conformed.services`

  await bigQuery.query({
    query: `DELETE FROM \`${tempTable}\` WHERE TRUE`
  }).catch(() => {
    // Table might be empty, ignore
  })

  await table.insert(bqRows)

  console.log(`Wrote ${bqRows.length} services to BigQuery greenhouse_conformed.services`)
  console.log('\nDone.')
}

main().catch(err => {
  console.error('ETL failed:', err)
  process.exit(1)
})
