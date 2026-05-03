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
  const orders = await pool.query(`
    SELECT po.order_id, po.title, po.state, po.total_amount, po.currency,
           po.created_at, po.scheduled_for, po.submitted_at,
           STRING_AGG(DISTINCT pob.beneficiary_name || ':' || pob.obligation_kind, ' / ') AS detail
    FROM greenhouse_finance.payment_orders po
    LEFT JOIN greenhouse_finance.payment_order_lines pol ON pol.order_id = po.order_id
    LEFT JOIN greenhouse_finance.payment_obligations pob ON pob.obligation_id = pol.obligation_id
    GROUP BY po.order_id, po.title, po.state, po.total_amount, po.currency, po.created_at, po.scheduled_for, po.submitted_at
    ORDER BY po.created_at DESC`)

  console.log('=== ALL payment_orders ===')
  orders.rows.forEach(o => console.log(`  ${o.order_id}\n    title: ${o.title}\n    state: ${o.state.padEnd(20)} amount: ${o.total_amount} ${o.currency}\n    detail: ${o.detail}\n`))

  // Luis receipt status
  const luis = await pool.query(`
    SELECT receipt_id, status, email_sent_at, email_recipient, delivery_trigger, payment_order_line_id
    FROM greenhouse_payroll.payroll_receipts
    WHERE member_id = 'luis-reyes'
    ORDER BY created_at DESC`)

  console.log('\n=== Luis Reyes receipts ===')
  luis.rows.forEach(r => console.log(`  ${r.receipt_id} | status=${r.status} | sent=${r.email_sent_at} | trigger=${r.delivery_trigger} | line=${r.payment_order_line_id}`))

  // Check if event finance.payment_order.paid was published for Luis order
  const ev = await pool.query(`
    SELECT event_id, event_type, aggregate_id, status, occurred_at::text, published_at::text
    FROM greenhouse_sync.outbox_events
    WHERE event_type = 'finance.payment_order.paid'
    ORDER BY occurred_at DESC
    LIMIT 5`)

  console.log('\n=== Recent finance.payment_order.paid events ===')
  ev.rows.forEach(e => console.log(`  ${e.event_id} | order=${e.aggregate_id} | status=${e.status} | occurred=${e.occurred_at} | published=${e.published_at ?? '—'}`))
} finally {
  await pool.end()
}
