import { Connector } from '@google-cloud/cloud-sql-connector'
import pg from 'pg'

const connector = new Connector()

const opts = await connector.getOptions({
  instanceConnectionName: process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME,
  ipType: 'PUBLIC',
  authType: 'IAM'
})

const pool = new pg.Pool({
  ...opts,
  user: process.env.GREENHOUSE_POSTGRES_OPS_USER || 'greenhouse_ops',
  password: process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD,
  database: process.env.GREENHOUSE_POSTGRES_DATABASE,
  max: 1
})

try {
  const reset = await pool.query(`
    UPDATE greenhouse_sync.projection_refresh_queue
       SET status = 'pending',
           retry_count = 0,
           error_message = NULL,
           dead_at = NULL,
           archived = FALSE,
           archived_at = NULL,
           updated_at = NOW()
     WHERE projection_name = 'payment_obligations_from_payroll'
       AND entity_id = '2026-04'
     RETURNING refresh_id, status
  `)

  console.log('Reset queue entries:', reset.rowCount)
  reset.rows.forEach(r => console.log('  ', r.refresh_id, '→', r.status))

  if (reset.rowCount === 0) {
    console.log('\n⚠️  No entries to reset. Inserting fresh queue entry…')

    const eventRes = await pool.query(`
      SELECT event_id FROM greenhouse_sync.outbox_events
      WHERE event_type = 'payroll_period.exported' AND aggregate_id = '2026-04'
      ORDER BY occurred_at DESC LIMIT 1
    `)

    if (eventRes.rowCount > 0) {
      await pool.query(`
        INSERT INTO greenhouse_sync.projection_refresh_queue (
          refresh_id, projection_name, entity_type, entity_id, status,
          priority, triggered_by_event_id, retry_count, max_retries,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid()::text, 'payment_obligations_from_payroll',
          'finance_period', '2026-04', 'pending', 0, $1, 0, 2, NOW(), NOW()
        )
      `, [eventRes.rows[0].event_id])
      console.log('Inserted fresh queue entry')
    }
  }

  console.log('\n✓ Reactive worker procesará en próximos ~30-60s.')
} finally {
  await pool.end()
  await connector.close()
}
