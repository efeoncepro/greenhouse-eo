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
  // 1. Find Luis members
  const members = await pool.query(`
    SELECT member_id, display_name
    FROM greenhouse_core.members
    WHERE LOWER(display_name) LIKE '%luis%'
    ORDER BY display_name`)

  console.log('=== Luis members ===')
  members.rows.forEach(m => console.log(`  ${m.member_id} | ${m.display_name}`))

  // 2. Find his orders
  const orders = await pool.query(`
    SELECT po.order_id, po.title, po.state, po.total_amount, po.currency,
           po.created_at, po.paid_at, po.scheduled_for,
           COUNT(pol.line_id) AS lines_count,
           STRING_AGG(DISTINCT pob.beneficiary_name, ', ') AS beneficiaries
    FROM greenhouse_finance.payment_orders po
    LEFT JOIN greenhouse_finance.payment_order_lines pol ON pol.order_id = po.order_id
    LEFT JOIN greenhouse_finance.payment_obligations pob ON pob.obligation_id = pol.obligation_id
    WHERE pob.beneficiary_name ILIKE '%luis%'
       OR po.title ILIKE '%luis%'
    GROUP BY po.order_id, po.title, po.state, po.total_amount, po.currency, po.created_at, po.paid_at, po.scheduled_for
    ORDER BY po.created_at DESC`)

  console.log('\n=== Orders mentioning Luis ===')
  orders.rows.forEach(o => console.log(`  ${o.order_id}\n    title: ${o.title}\n    state: ${o.state} | amount: ${o.total_amount} ${o.currency} | lines: ${o.lines_count}\n    beneficiaries: ${o.beneficiaries}\n    scheduled_for: ${o.scheduled_for ?? '—'} | paid_at: ${o.paid_at ?? '—'}`))

  // 3. Find any order with a Luis line waiting to be paid
  const linesAwaitingPay = await pool.query(`
    SELECT po.order_id, po.state AS order_state, po.title,
           pol.line_id, pol.state AS line_state,
           pob.beneficiary_name, pob.obligation_kind, pob.amount, pob.currency,
           pob.metadata_json->>'payrollEntryId' AS payroll_entry_id
    FROM greenhouse_finance.payment_order_lines pol
    INNER JOIN greenhouse_finance.payment_orders po ON po.order_id = pol.order_id
    INNER JOIN greenhouse_finance.payment_obligations pob ON pob.obligation_id = pol.obligation_id
    WHERE pob.beneficiary_name ILIKE '%luis%'
      AND po.state IN ('draft', 'pending_approval', 'approved', 'scheduled', 'submitted')
    ORDER BY po.created_at DESC`)

  console.log('\n=== Lines for Luis awaiting payment ===')
  linesAwaitingPay.rows.forEach(l => console.log(`  order ${l.order_id} (${l.order_state}) | line ${l.line_id} (${l.line_state}) | ${l.beneficiary_name} | ${l.obligation_kind} | ${l.amount} ${l.currency} | entryId: ${l.payroll_entry_id ?? '—'}`))
} finally {
  await pool.end()
}
