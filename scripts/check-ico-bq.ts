import { BigQuery } from '@google-cloud/bigquery'

import { getGoogleAuthOptions, getGoogleProjectId } from '@/lib/google-credentials'
import { loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const main = async () => {
  loadGreenhouseToolEnv()

  const projectId = getGoogleProjectId()
  const bq = new BigQuery(getGoogleAuthOptions())

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
