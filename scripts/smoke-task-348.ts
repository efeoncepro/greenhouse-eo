import { config } from 'dotenv'

config({ path: '.env.local' })

import { query, withTransaction } from '@/lib/db'
import { createNewVersion , listQuotationVersions } from '@/lib/commercial/governance/versions-store'
import { requestApproval, decideApprovalStep } from '@/lib/commercial/governance/approval-steps-store'
import { listQuotationAudit } from '@/lib/commercial/governance/audit-log'
import { listQuotationTerms, seedQuotationDefaultTerms } from '@/lib/commercial/governance/terms-store'

const log = (section: string, payload: unknown) => {
  console.log('\n── ' + section + ' ──')
  console.log(JSON.stringify(payload, null, 2))
}

async function main() {
  const agentUserId = 'user-agent-e2e-001'
  const agentName = 'Agent E2E'

  const existing = await query<any>(
    `SELECT quotation_id, quotation_number, status, current_version, space_id, total_price, effective_margin_pct
       FROM greenhouse_commercial.quotations
       WHERE quotation_number LIKE 'EO-QUO-SMOKE-348%'
       ORDER BY created_at DESC
       LIMIT 1`
  )

  let quotationId: string

  if (existing.length > 0) {
    quotationId = existing[0].quotation_id
    console.log('reusing existing smoke quote:', quotationId)
  } else {
    const rows = await query<{ quotation_id: string }>(
      `INSERT INTO greenhouse_commercial.quotations (
         quotation_number, pricing_model, status, current_version, currency,
         business_line_code, target_margin_pct, margin_floor_pct,
         global_discount_type, global_discount_value,
         billing_frequency, revenue_type,
         total_cost, total_price_before_discount, total_discount, total_price, effective_margin_pct,
         total_amount, total_amount_clp,
         quote_date, description, source_system, space_resolution_source, created_by
       ) VALUES (
         'EO-QUO-SMOKE-348-' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDD-HH24MISS'),
         'project', 'draft', 1, 'CLP',
         NULL, 30, 15,
         'percentage', 40,
         'one_time', 'one_time',
         1000000, 2000000, 800000, 1200000, 16.67,
         1200000, 1200000,
         CURRENT_DATE, 'Smoke test TASK-348', 'manual', 'unresolved', $1
       )
       RETURNING quotation_id`,
      [agentUserId]
    )

    quotationId = rows[0].quotation_id
    console.log('created smoke quote:', quotationId)

    // Seed a line item so versions/diff has content
    await query(
      `INSERT INTO greenhouse_commercial.quotation_line_items (
         quotation_id, version_number, line_type, sort_order, line_number, label,
         unit, quantity, unit_cost, subtotal_cost, unit_price, subtotal_price,
         discount_type, discount_value, discount_amount, subtotal_after_discount,
         margin_pct, effective_margin_pct, recurrence_type, source_system
       ) VALUES (
         $1, 1, 'deliverable', 0, 1, 'Servicio piloto',
         'unit', 1, 1000000, 1000000, 2000000, 2000000,
         'percentage', 40, 800000, 1200000,
         50, 16.67, 'one_time', 'manual'
       )`,
      [quotationId]
    )
    await query(
      `INSERT INTO greenhouse_commercial.quotation_versions (
         quotation_id, version_number, snapshot_json, total_cost, total_price,
         total_discount, effective_margin_pct, created_by, notes
       ) VALUES (
         $1, 1,
         $2::jsonb, 1000000, 1200000, 800000, 16.67,
         $3, 'Smoke initial version'
       )
       ON CONFLICT (quotation_id, version_number) DO NOTHING`,
      [quotationId, JSON.stringify([{label: 'Servicio piloto', quantity: 1, unitPrice: 2000000, subtotalAfterDiscount: 1200000}]), agentUserId]
    )
  }

  log('initial quotation', existing[0] ?? { quotationId, status: 'draft', current_version: 1 })

  log('1. seed default terms (if empty)', {})

  const seededCount = await seedQuotationDefaultTerms({
    quotationId,
    pricingModel: 'project',
    businessLineCode: null,
    variables: {
      paymentTermsDays: 30,
      contractDurationMonths: null,
      billingFrequency: 'one_time',
      validUntil: null,
      organizationName: 'Acme SpA (smoke)',
      escalationPct: null
    }
  })

  console.log('seeded terms:', seededCount)
  const terms = await listQuotationTerms(quotationId)

  log('terms applied', terms.map(t => ({ code: t.termCode, included: t.included, resolved: t.bodyResolved.slice(0, 80) })))

  log('2. request approval (margin 16.67% is above floor 15%, discount 40% > 30% → should trigger discount policy)', {})

  const approvalResult = await requestApproval({
    quotationId,
    versionNumber: 1,
    actor: { userId: agentUserId, name: agentName },
    evaluationInput: {
      businessLineCode: null,
      pricingModel: 'project',
      quotationMarginPct: 16.67,
      marginTargetPct: 30,
      marginFloorPct: 15,
      totalPrice: 1200000,
      discountPct: 40
    }
  })

  log('approval steps created', approvalResult.steps.map(s => ({ stepId: s.stepId, role: s.requiredRole, label: s.conditionLabel, status: s.status })))

  const pendingStep = approvalResult.steps.find(s => s.status === 'pending')

  if (pendingStep) {
    log('3a. approve the pending step', {})

    const decided = await decideApprovalStep({
      stepId: pendingStep.stepId,
      decision: 'approved',
      actor: { userId: agentUserId, name: agentName, roleCodes: ['efeonce_admin', 'finance_admin', 'finance'] },
      notes: 'Approved in smoke test — descuento justificado por negociación estratégica.'
    })

    log('decision', {
      decidedStep: decided.step.status,
      allResolved: decided.allResolved,
      anyRejected: decided.anyRejected,
      newStatus: decided.quotationNewStatus
    })
  }

  log('4. create new version (clone + diff)', {})

  const versionResult = await createNewVersion({
    quotationId,
    actor: { userId: agentUserId, name: agentName },
    notes: 'Smoke: adjust after approval'
  })

  log('version created', versionResult)

  const versions = await listQuotationVersions(quotationId)

  log('versions listed', versions.map(v => ({ v: v.versionNumber, total: v.totalPrice, notes: v.notes, diffSummary: v.diffFromPrevious ? `added=${v.diffFromPrevious.added.length} removed=${v.diffFromPrevious.removed.length} changed=${v.diffFromPrevious.changed.length}` : null })))

  log('5. audit trail', {})
  const audit = await listQuotationAudit({ quotationId, limit: 20 })

  audit.forEach(entry => console.log(` - ${entry.action} v${entry.versionNumber ?? '?'} by ${entry.actorName} at ${entry.createdAt}`))

  const finalStatus = await query<any>(
    `SELECT status, current_version FROM greenhouse_commercial.quotations WHERE quotation_id = $1`,
    [quotationId]
  )

  log('final quotation state', finalStatus[0])

  // Cleanup: delete the smoke quote so it doesn't linger
  await withTransaction(async client => {
    await client.query('DELETE FROM greenhouse_commercial.quotation_audit_log WHERE quotation_id = $1', [quotationId])
    await client.query('DELETE FROM greenhouse_commercial.approval_steps WHERE quotation_id = $1', [quotationId])
    await client.query('DELETE FROM greenhouse_commercial.quotation_terms WHERE quotation_id = $1', [quotationId])
    await client.query('DELETE FROM greenhouse_commercial.quotation_versions WHERE quotation_id = $1', [quotationId])
    await client.query('DELETE FROM greenhouse_commercial.quotation_line_items WHERE quotation_id = $1', [quotationId])
    await client.query('DELETE FROM greenhouse_sync.outbox_events WHERE aggregate_id = $1', [quotationId])
    await client.query('DELETE FROM greenhouse_commercial.quotations WHERE quotation_id = $1', [quotationId])
  })
  console.log('\ncleanup done — smoke quote removed')
  process.exit(0)
}

main().catch(err => { console.error('SMOKE FAILED:', err); process.exit(1) })
