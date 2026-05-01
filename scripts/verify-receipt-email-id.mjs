import pg from 'pg'

const pool = new pg.Pool({ host: '127.0.0.1', port: 15432, database: 'greenhouse_app', user: 'greenhouse_ops', password: process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD, ssl: false })

try {
  const r = await pool.query(`
    SELECT receipt_id, status, email_recipient, email_sent_at::text,
           email_delivery_id, delivery_trigger, payment_order_line_id, updated_at::text
    FROM greenhouse_payroll.payroll_receipts
    WHERE member_id = 'luis-reyes'
    ORDER BY updated_at DESC LIMIT 1`)

  console.log('=== Luis receipt (current) ===')
  r.rows.forEach(d => console.log(`  receipt_id: ${d.receipt_id}\n  status: ${d.status}\n  to: ${d.email_recipient}\n  sent_at: ${d.email_sent_at}\n  resend_id: ${d.email_delivery_id}\n  delivery_trigger: ${d.delivery_trigger}\n  payment_order_line_id: ${d.payment_order_line_id}\n  updated_at: ${d.updated_at}`))
} finally { await pool.end() }
