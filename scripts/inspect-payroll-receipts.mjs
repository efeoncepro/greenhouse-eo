import pg from 'pg'

const pool = new pg.Pool({
  host: '127.0.0.1',
  port: 15432,
  database: process.env.GREENHOUSE_POSTGRES_DATABASE || 'greenhouse_app',
  user: process.env.GREENHOUSE_POSTGRES_OPS_USER || 'greenhouse_ops',
  password: process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD,
  ssl: false
})

try {
  const cols = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='greenhouse_payroll' AND table_name='payroll_receipts'
    ORDER BY ordinal_position`)

  console.log('=== payroll_receipts columns ===')
  cols.rows.forEach(c => console.log(`  ${c.column_name.padEnd(28)} ${c.data_type.padEnd(28)} ${c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${c.column_default ?? ''}`))

  const constraints = await pool.query(`
    SELECT con.conname, pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname='greenhouse_payroll' AND rel.relname='payroll_receipts'`)

  console.log('\n=== constraints ===')
  constraints.rows.forEach(c => console.log(`  ${c.conname}: ${c.def}`))

  const counts = await pool.query(`
    SELECT status, COUNT(*) AS n
    FROM greenhouse_payroll.payroll_receipts
    GROUP BY status ORDER BY n DESC`)

  console.log('\n=== status counts ===')
  counts.rows.forEach(r => console.log(`  ${r.status.padEnd(20)} ${r.n}`))

  const recent = await pool.query(`
    SELECT receipt_id, period_id, member_id, status, email_sent_at, email_recipient, generated_at
    FROM greenhouse_payroll.payroll_receipts
    ORDER BY generated_at DESC NULLS LAST
    LIMIT 5`)

  console.log('\n=== recent 5 ===')
  recent.rows.forEach(r => console.log(`  ${r.receipt_id} period=${r.period_id} status=${r.status} sent=${r.email_sent_at ?? '—'} to=${r.email_recipient ?? '—'}`))

  // Verificar payment_order_lines linkage
  const lineLink = await pool.query(`
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE pol.line_id IS NOT NULL) AS with_line,
           COUNT(*) FILTER (WHERE po.state = 'paid') AS paid_orders
    FROM greenhouse_finance.payment_obligations po_obl
    LEFT JOIN greenhouse_finance.payment_order_lines pol ON pol.obligation_id = po_obl.obligation_id
    LEFT JOIN greenhouse_finance.payment_orders po ON po.order_id = pol.order_id
    WHERE po_obl.source_kind='payroll' AND po_obl.obligation_kind='employee_net_pay'`)

  console.log('\n=== net_pay obligations linkage ===')
  console.log(`  total=${lineLink.rows[0].total} linked_to_line=${lineLink.rows[0].with_line} via_paid_order=${lineLink.rows[0].paid_orders}`)

  const evCheck = await pool.query(`
    SELECT event_type, COUNT(*) AS n
    FROM greenhouse_sync.outbox_events
    WHERE event_type IN ('payroll_period.exported', 'finance.payment_order.paid', 'finance.payment_order.submitted')
    GROUP BY event_type`)

  console.log('\n=== relevant outbox events seen ===')
  evCheck.rows.forEach(r => console.log(`  ${r.event_type.padEnd(40)} ${r.n}`))
} finally {
  await pool.end()
}
