import { BigQuery } from '@google-cloud/bigquery'

import { loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const main = async () => {
  loadGreenhouseToolEnv()

  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    || (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64
      ? Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64, 'base64').toString()
      : null)

  if (!raw) { console.error('No BQ credentials'); process.exit(1) }

  const credentials = JSON.parse(raw.replace(/^["']|["']$/g, ''))
  const projectId = process.env.GCP_PROJECT || credentials.project_id
  const bq = new BigQuery({ projectId, credentials })

  const tables = [
    'metric_snapshots_monthly',
    'metrics_by_member',
    'metrics_by_project',
    'metrics_by_sprint',
    'rpa_trend',
    'stuck_assets_detail'
  ]

  console.log(`Project: ${projectId}\n`)

  for (const t of tables) {
    try {
      const [rows] = await bq.query({ query: `SELECT COUNT(*) as cnt FROM \`${projectId}.ico_engine.${t}\`` })

      console.log(`  ${t}: ${rows[0]?.cnt} rows`)
    } catch (e) {
      console.log(`  ${t}: ERROR — ${(e as Error).message?.slice(0, 60)}`)
    }
  }

  // Check v_tasks_enriched
  try {
    const [rows] = await bq.query({ query: `SELECT COUNT(*) as cnt FROM \`${projectId}.ico_engine.v_tasks_enriched\`` })

    console.log(`  v_tasks_enriched: ${rows[0]?.cnt} rows`)
  } catch (e) {
    console.log(`  v_tasks_enriched: ERROR — ${(e as Error).message?.slice(0, 60)}`)
  }

  // Check delivery_tasks
  try {
    const [rows] = await bq.query({ query: `SELECT COUNT(*) as cnt FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`` })

    console.log(`  delivery_tasks: ${rows[0]?.cnt} rows`)
  } catch (e) {
    console.log(`  delivery_tasks: ERROR — ${(e as Error).message?.slice(0, 60)}`)
  }
}

main()
