import { Connector } from '@google-cloud/cloud-sql-connector'
import pg from 'pg'

const connector = new Connector()
const opts = await connector.getOptions({ instanceConnectionName: process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME, ipType: 'PUBLIC', authType: 'IAM' })
const pool = new pg.Pool({ ...opts, user: process.env.GREENHOUSE_POSTGRES_OPS_USER || 'greenhouse_ops', password: process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD, database: process.env.GREENHOUSE_POSTGRES_DATABASE, max: 1 })

try {
  // 1) Cancelar las 3 provider_payroll Deel con amount=0 (placeholders V1
  //    obsoletos — ya existen las correctas como employee_net_pay).
  const r1 = await pool.query(`
    UPDATE greenhouse_finance.payment_obligations
       SET status = 'cancelled',
           cancelled_reason = 'cleanup: V1 placeholder Deel amount=0 — replaced by employee_net_pay with real net',
           updated_at = NOW()
     WHERE period_id = '2026-04'
       AND obligation_kind = 'provider_payroll'
       AND amount = 0
       AND status = 'generated'
     RETURNING obligation_id, beneficiary_name
  `)

  console.log('Cancelled obsolete Deel placeholders:', r1.rowCount)
  r1.rows.forEach(r => console.log('  -', r.beneficiary_name, r.obligation_id))

  // 2) Cancelar la SII vieja con sourceRef=period_id (era una sola row de
  //    Humberly $45750 sin distinguir entry_id; ahora hay 2 nuevas con
  //    sourceRef='period_id:sii:entry_id' que sí distinguen Humberly+Luis).
  const r2 = await pool.query(`
    UPDATE greenhouse_finance.payment_obligations
       SET status = 'cancelled',
           cancelled_reason = 'cleanup: SII obligation con sourceRef ambiguo — replaced by per-entry sourceRef',
           updated_at = NOW()
     WHERE period_id = '2026-04'
       AND obligation_kind = 'employee_withheld_component'
       AND beneficiary_id = 'cl_sii'
       AND source_ref = '2026-04'
       AND status = 'generated'
     RETURNING obligation_id, amount
  `)

  console.log('\nCancelled obsolete SII (legacy sourceRef):', r2.rowCount)
  r2.rows.forEach(r => console.log('  -', r.obligation_id, 'amount=' + r.amount))

  // 3) Final state
  const final = await pool.query(`
    SELECT obligation_kind, beneficiary_name, amount, currency, status, source_ref
    FROM greenhouse_finance.payment_obligations
    WHERE period_id = '2026-04'
    ORDER BY status, obligation_kind, beneficiary_name
  `)

  console.log('\n=== FINAL STATE ===')
  final.rows.forEach(r => console.log('  [' + r.status.padEnd(11) + '] ' + (r.beneficiary_name || '').padEnd(38) + ' ' + r.obligation_kind.padEnd(28) + String(r.amount).padStart(12) + ' ' + r.currency))
} finally {
  await pool.end()
  await connector.close()
}
