/**
 * ETL: PostgreSQL greenhouse_core.business_line_metadata → BigQuery greenhouse_conformed.dim_business_lines
 *
 * Full-replace sync. Reads all active BL metadata from Postgres and writes to BigQuery
 * with DELETE + INSERT (dimension is small — 5 rows).
 *
 * Usage: npx tsx scripts/etl-business-lines-to-bigquery.ts
 */

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

interface MetadataRow extends Record<string, unknown> {
  module_code: string
  label: string
  label_full: string | null
  claim: string | null
  loop_phase: string | null
  loop_phase_label: string | null
  lead_name: string | null
  color_hex: string
  color_bg: string | null
  icon_name: string | null
  hubspot_enum_value: string
  notion_label: string | null
  is_active: boolean
  sort_order: number
  description: string | null
}

async function main() {
  console.log('=== ETL: business_line_metadata PostgreSQL → BigQuery ===\n')

  const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('@/lib/postgres/client')
  const { getBigQueryClient, getBigQueryProjectId } = await import('@/lib/bigquery')

  try {
    const rows = await runGreenhousePostgresQuery<MetadataRow>(
      `SELECT
        module_code, label, label_full, claim,
        loop_phase, loop_phase_label, lead_name,
        color_hex, color_bg, icon_name,
        hubspot_enum_value, notion_label,
        is_active, sort_order, description
       FROM greenhouse_core.business_line_metadata
       ORDER BY sort_order`
    )

    console.log(`Read ${rows.length} business lines from PostgreSQL`)

    if (rows.length === 0) {
      console.log('Nothing to write.')

      return
    }

    const projectId = getBigQueryProjectId()
    const bigQuery = getBigQueryClient()
    const dataset = bigQuery.dataset('greenhouse_conformed')
    const table = dataset.table('dim_business_lines')

    // Ensure table exists
    const [tableExists] = await table.exists()

    if (!tableExists) {
      console.log('Creating greenhouse_conformed.dim_business_lines table...')

      await dataset.createTable('dim_business_lines', {
        schema: {
          fields: [
            { name: 'module_code', type: 'STRING', mode: 'REQUIRED' },
            { name: 'label', type: 'STRING', mode: 'REQUIRED' },
            { name: 'label_full', type: 'STRING' },
            { name: 'claim', type: 'STRING' },
            { name: 'loop_phase', type: 'STRING' },
            { name: 'loop_phase_label', type: 'STRING' },
            { name: 'lead_name', type: 'STRING' },
            { name: 'color_hex', type: 'STRING', mode: 'REQUIRED' },
            { name: 'color_bg', type: 'STRING' },
            { name: 'icon_name', type: 'STRING' },
            { name: 'hubspot_enum_value', type: 'STRING', mode: 'REQUIRED' },
            { name: 'notion_label', type: 'STRING' },
            { name: 'is_active', type: 'BOOL', mode: 'REQUIRED' },
            { name: 'sort_order', type: 'INT64', mode: 'REQUIRED' },
            { name: 'description', type: 'STRING' },
            { name: 'synced_at', type: 'TIMESTAMP' }
          ]
        }
      })

      console.log('Table created.')
    }

    // Full replace: DELETE + INSERT
    const fullTable = `${projectId}.greenhouse_conformed.dim_business_lines`

    await bigQuery.query({
      query: `DELETE FROM \`${fullTable}\` WHERE TRUE`
    }).catch(() => {
      // Table might be empty on first run
    })

    const bqRows = rows.map(r => ({
      module_code: r.module_code,
      label: r.label,
      label_full: r.label_full,
      claim: r.claim,
      loop_phase: r.loop_phase,
      loop_phase_label: r.loop_phase_label,
      lead_name: r.lead_name,
      color_hex: r.color_hex,
      color_bg: r.color_bg,
      icon_name: r.icon_name,
      hubspot_enum_value: r.hubspot_enum_value,
      notion_label: r.notion_label,
      is_active: r.is_active,
      sort_order: r.sort_order,
      description: r.description,
      synced_at: new Date().toISOString()
    }))

    await table.insert(bqRows)

    console.log(`Wrote ${bqRows.length} business lines to BigQuery greenhouse_conformed.dim_business_lines`)
    console.log('\nDone.')
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(err => {
  console.error('ETL failed:', err)
  process.exit(1)
})
