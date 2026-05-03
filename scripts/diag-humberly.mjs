import pg from 'pg'

const pool = new pg.Pool({ host:'127.0.0.1', port:15432, database:'greenhouse_app', user:'greenhouse_ops', password: process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD, ssl:false })

try {
  console.log('=== Humberly member ===')
  const m = await pool.query(`SELECT member_id, display_name FROM greenhouse_core.members WHERE LOWER(display_name) LIKE '%humberly%'`)

  m.rows.forEach(r => console.log(' ', r))

  console.log('\n=== Recent payment orders involving Humberly ===')

  const o = await pool.query(`
    SELECT po.order_id, po.title, po.state, po.paid_at::text, po.created_at::text,
           STRING_AGG(DISTINCT pob.beneficiary_name, ',') AS bens
      FROM greenhouse_finance.payment_orders po
      LEFT JOIN greenhouse_finance.payment_order_lines pol ON pol.order_id = po.order_id
      LEFT JOIN greenhouse_finance.payment_obligations pob ON pob.obligation_id = pol.obligation_id
     WHERE pob.beneficiary_name ILIKE '%humberly%'
     GROUP BY po.order_id
     ORDER BY po.created_at DESC LIMIT 5`)

  o.rows.forEach(r => console.log(`  ${r.order_id} | state=${r.state} | paid_at=${r.paid_at} | beneficiaries=${r.bens}`))

  console.log('\n=== Lines + obligation metadata for Humberly ===')

  const lines = await pool.query(`
    SELECT pol.line_id, pol.state AS line_state, pol.order_id, po.state AS order_state,
           pob.obligation_id, pob.obligation_kind, pob.source_kind, pob.beneficiary_name,
           pob.metadata_json->>'payrollEntryId' AS payroll_entry_id
      FROM greenhouse_finance.payment_order_lines pol
      INNER JOIN greenhouse_finance.payment_orders po ON po.order_id = pol.order_id
      INNER JOIN greenhouse_finance.payment_obligations pob ON pob.obligation_id = pol.obligation_id
     WHERE pob.beneficiary_name ILIKE '%humberly%'
     ORDER BY po.created_at DESC LIMIT 10`)

  lines.rows.forEach(r => console.log(`  line=${r.line_id} line_state=${r.line_state}\n    order=${r.order_id} order_state=${r.order_state}\n    obligation_kind=${r.obligation_kind} source_kind=${r.source_kind}\n    payrollEntryId=${r.payroll_entry_id ?? '—'}`))

  console.log('\n=== Humberly receipts ===')

  const r = await pool.query(`
    SELECT receipt_id, status, email_recipient, email_sent_at::text,
           email_delivery_id, email_error, delivery_trigger, payment_order_line_id,
           updated_at::text
      FROM greenhouse_payroll.payroll_receipts
     WHERE member_id LIKE '%humberly%'
     ORDER BY updated_at DESC LIMIT 5`)

  r.rows.forEach(r => console.log(`  ${r.receipt_id}\n    status=${r.status} sent=${r.email_sent_at} trigger=${r.delivery_trigger}\n    to=${r.email_recipient} resend_id=${r.email_delivery_id ?? '—'}\n    line=${r.payment_order_line_id ?? '—'}\n    error=${r.email_error ?? '—'}\n    updated=${r.updated_at}`))

  console.log('\n=== Recent finance.payment_order.paid events ===')

  const ev = await pool.query(`
    SELECT event_id, aggregate_id, status, occurred_at::text, published_at::text
      FROM greenhouse_sync.outbox_events
     WHERE event_type = 'finance.payment_order.paid'
       AND occurred_at > NOW() - INTERVAL '30 minutes'
     ORDER BY occurred_at DESC LIMIT 10`)

  ev.rows.forEach(e => console.log(`  ${e.event_id}\n    order=${e.aggregate_id} status=${e.status}\n    occurred=${e.occurred_at} published=${e.published_at}`))

  console.log('\n=== projection_refresh_queue last entries for payslip projection ===')

  const q = await pool.query(`
    SELECT queue_id, projection, scope_id, status, retries, last_error, updated_at::text
      FROM greenhouse_sync.projection_refresh_queue
     WHERE projection IN ('payslip_on_payment_paid', 'payroll_receipts_delivery')
       AND updated_at > NOW() - INTERVAL '30 minutes'
     ORDER BY updated_at DESC LIMIT 10`)

  q.rows.forEach(r => console.log(`  ${r.queue_id}\n    projection=${r.projection} scope=${r.scope_id} status=${r.status} retries=${r.retries}\n    error=${r.last_error ?? '—'}\n    updated=${r.updated_at}`))

  console.log('\n=== Email recipient for Humberly ===')

  const ce = await pool.query(`
    SELECT cu.user_id, cu.email, cu.tenant_type
      FROM greenhouse.client_users cu
      JOIN greenhouse_core.members m ON cu.client_id LIKE m.member_id || '%' OR cu.user_id LIKE '%humberly%'
     WHERE m.member_id LIKE '%humberly%' OR cu.email ILIKE '%humberly%' OR cu.email ILIKE '%hhumberly%'
     LIMIT 3`).catch(e => ({ rows:[], err: e.message }))

  if (ce.err) {
    // Try direct email lookup
    const direct = await pool.query(`SELECT user_id, email FROM greenhouse.client_users WHERE email ILIKE '%humberly%' OR email ILIKE '%hhumberly%' OR email ILIKE '%hhenriquez%' LIMIT 3`).catch(()=>({rows:[]}))

    direct.rows.forEach(r => console.log(' ', r))
  } else {
    ce.rows.forEach(r => console.log(' ', r))
  }
} finally { await pool.end() }
