import pg from 'pg'

const pool = new pg.Pool({ host:'127.0.0.1', port:15432, database:'greenhouse_app', user:'greenhouse_ops', password: process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD, ssl:false })

try {
  console.log('Fixing self-superseded Previred row to status=cancelled (clean state)...')

  const r = await pool.query(`
    UPDATE greenhouse_finance.payment_obligations
       SET status = 'cancelled',
           cancelled_reason = COALESCE(cancelled_reason, '') || ' [auto-cleanup: self-superseded bug, will be re-materialized]',
           updated_at = NOW()
     WHERE obligation_id = 'pob-fba71e32-296c-4ab3-9fa1-fa7c005a3701'
       AND status = 'superseded'
       AND superseded_by = obligation_id
     RETURNING obligation_id, status`)

  console.log('Updated rows:', r.rowCount)
  r.rows.forEach(row => console.log(' ', row))
} finally { await pool.end() }
