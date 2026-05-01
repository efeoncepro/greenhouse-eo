// TASK-759 — End-to-end test: reset Luis's order to 'submitted', mark as paid,
// verify projection fires and sends the new email.
//
// Usage: node scripts/test-payslip-on-payment-paid.mjs <step>
//   1 = reset state (order=submitted, line=submitted, obligation=scheduled, receipt=generated)
//   2 = inspect current state
//   3 = mark as paid via direct DB + outbox publish (simulates the API call)
//   4 = trigger reactive consumer manually
//   5 = verify final state (receipt status + delivery_trigger)
import pg from 'pg'

const STEP = process.argv[2] || '2'

const pool = new pg.Pool({
  host: '127.0.0.1',
  port: 15432,
  database: process.env.GREENHOUSE_POSTGRES_DATABASE || 'greenhouse_app',
  user: process.env.GREENHOUSE_POSTGRES_OPS_USER || 'greenhouse_ops',
  password: process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD,
  ssl: false
})

const ORDER_ID = 'por-66563173-bdda-4591-b9ef-f798ecc98b95'
const ENTRY_ID_PATTERN = '%luis-reyes%' // entry of Luis for period 2026-04

async function inspect() {
  const order = await pool.query(`SELECT order_id, state, paid_at FROM greenhouse_finance.payment_orders WHERE order_id = $1`, [ORDER_ID])
  const lines = await pool.query(`SELECT line_id, state FROM greenhouse_finance.payment_order_lines WHERE order_id = $1`, [ORDER_ID])
  const obligs = await pool.query(`SELECT obligation_id, status, beneficiary_name FROM greenhouse_finance.payment_obligations WHERE obligation_id IN (SELECT obligation_id FROM greenhouse_finance.payment_order_lines WHERE order_id = $1)`, [ORDER_ID])
  const receipt = await pool.query(`SELECT receipt_id, status, email_sent_at::text, delivery_trigger, payment_order_line_id FROM greenhouse_payroll.payroll_receipts WHERE member_id = 'luis-reyes' ORDER BY created_at DESC LIMIT 1`)
  const events = await pool.query(`SELECT event_id, event_type, status, occurred_at::text, published_at::text FROM greenhouse_sync.outbox_events WHERE aggregate_id = $1 ORDER BY occurred_at DESC LIMIT 5`, [ORDER_ID])

  console.log('=== ORDER ===')
  order.rows.forEach(r => console.log(`  ${r.order_id} | state=${r.state} | paid_at=${r.paid_at}`))
  console.log('=== LINES ===')
  lines.rows.forEach(r => console.log(`  ${r.line_id} | state=${r.state}`))
  console.log('=== OBLIGATIONS ===')
  obligs.rows.forEach(r => console.log(`  ${r.obligation_id} | status=${r.status} | ${r.beneficiary_name}`))
  console.log('=== RECEIPT ===')
  receipt.rows.forEach(r => console.log(`  ${r.receipt_id} | status=${r.status} | sent=${r.email_sent_at} | trigger=${r.delivery_trigger} | line=${r.payment_order_line_id}`))
  console.log('=== RECENT EVENTS ===')
  events.rows.forEach(e => console.log(`  ${e.event_id} | ${e.event_type} | ${e.status} | occurred=${e.occurred_at} | published=${e.published_at}`))
}

async function reset() {
  console.log('Resetting Luis order to submitted, line to submitted, obligation to scheduled, receipt to generated...')

  // 1. Order: paid → submitted
  await pool.query(`UPDATE greenhouse_finance.payment_orders SET state = 'submitted', paid_at = NULL, updated_at = NOW() WHERE order_id = $1`, [ORDER_ID])

  // 2. Lines: paid → submitted
  await pool.query(`UPDATE greenhouse_finance.payment_order_lines SET state = 'submitted', updated_at = NOW() WHERE order_id = $1`, [ORDER_ID])

  // 3. Obligations: paid → scheduled
  await pool.query(`UPDATE greenhouse_finance.payment_obligations SET status = 'scheduled', updated_at = NOW() WHERE obligation_id IN (SELECT obligation_id FROM greenhouse_finance.payment_order_lines WHERE order_id = $1)`, [ORDER_ID])

  // 4. Receipt: email_sent → generated (preserve audit trail; reset delivery_trigger)
  await pool.query(`UPDATE greenhouse_payroll.payroll_receipts SET status = 'generated', email_sent_at = NULL, email_delivery_id = NULL, delivery_trigger = NULL, updated_at = NOW() WHERE member_id = 'luis-reyes'`)

  console.log('Reset complete.')
}

async function markPaid() {
  console.log('Marking Luis order as paid via DB transaction + outbox event publish (simulates POST /mark-paid)...')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`UPDATE greenhouse_finance.payment_orders SET state = 'paid', paid_at = NOW(), updated_at = NOW() WHERE order_id = $1 AND state = 'submitted'`, [ORDER_ID])
    await client.query(`UPDATE greenhouse_finance.payment_order_lines SET state = 'paid', updated_at = NOW() WHERE order_id = $1 AND state = 'submitted'`, [ORDER_ID])
    await client.query(`UPDATE greenhouse_finance.payment_obligations SET status = 'paid', updated_at = NOW() WHERE obligation_id IN (SELECT obligation_id FROM greenhouse_finance.payment_order_lines WHERE order_id = $1) AND status = 'scheduled'`, [ORDER_ID])

    // Publish outbox event matching mark-paid.ts shape
    const eventId = `outbox-test-task759-${Date.now()}`
    await client.query(
      `INSERT INTO greenhouse_sync.outbox_events (event_id, aggregate_type, aggregate_id, event_type, payload_json, status, occurred_at)
       VALUES ($1, 'payment_order', $2, 'finance.payment_order.paid', $3::jsonb, 'pending', NOW())`,
      [eventId, ORDER_ID, JSON.stringify({ orderId: ORDER_ID, paidBy: 'task-759-test', paidAt: new Date().toISOString(), totalAmount: 148312.50, currency: 'CLP', externalReference: 'task-759-e2e-test' })]
    )

    await client.query('COMMIT')
    console.log(`Published event ${eventId}`)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function main() {
  try {
    if (STEP === '1') await reset()
    else if (STEP === '3') await markPaid()
    else if (STEP === '2' || STEP === '5') await inspect()
    else console.log('Unknown step. Use 1 (reset) | 2 (inspect) | 3 (mark paid) | 5 (verify)')
  } finally {
    await pool.end()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
