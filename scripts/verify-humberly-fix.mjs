import pg from 'pg'
const pool = new pg.Pool({ host:'127.0.0.1', port:15432, database:'greenhouse_app', user:'greenhouse_ops', password: process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD, ssl:false })
try {
  const r = await pool.query(`
    SELECT receipt_id, status, email_recipient, email_sent_at::text,
           email_delivery_id, delivery_trigger, payment_order_line_id, updated_at::text
      FROM greenhouse_payroll.payroll_receipts
     WHERE member_id = 'humberly-henriquez'
     ORDER BY updated_at DESC LIMIT 1`)
  console.log('=== Humberly receipt actual ===')
  r.rows.forEach(r => console.log(` ${JSON.stringify(r, null, 2)}`))

  const d = await pool.query(`
    SELECT delivery_id, delivery_kind, status, sent_at::text, email_provider_id
      FROM greenhouse_payroll.payslip_deliveries
     WHERE entry_id = '2026-04_humberly-henriquez'
     ORDER BY created_at DESC LIMIT 5`)
  console.log('\n=== Humberly payslip_deliveries (audit chain) ===')
  d.rows.forEach(r => console.log(`  ${r.delivery_id}\n    kind=${r.delivery_kind} status=${r.status} sent=${r.sent_at} resend=${r.email_provider_id}`))
} finally { await pool.end() }
