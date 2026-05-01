import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { query } from '@/lib/db'
import {
  PayrollAdjustmentValidationError,
  checkChileDependentCompliance,
  createAdjustment,
  getAdjustmentsByEntry
} from '@/lib/payroll/adjustments/apply-adjustment'
import {
  ADJUSTMENT_REASON_CODES,
  isAdjustmentReasonCode
} from '@/lib/payroll/adjustments/reason-codes'
import { recalculatePayrollEntry } from '@/lib/payroll/recalculate-entry'
import { requireHrTenantContext } from '@/lib/tenant/authorization'
import type { AdjustmentKind } from '@/types/payroll-adjustments'

export const dynamic = 'force-dynamic'

const ALLOWED_KINDS: AdjustmentKind[] = [
  'exclude',
  'gross_factor',
  'gross_factor_per_component',
  'fixed_deduction',
  'manual_override'
]

interface EntrySnapshotRow extends Record<string, unknown> {
  member_id: string
  period_id: string
  pay_regime: string
  contract_type_snapshot: string | null
  currency: string
}

const fetchEntrySnapshot = async (entryId: string): Promise<EntrySnapshotRow | null> => {
  const rows = await query<EntrySnapshotRow>(
    `SELECT member_id, period_id, pay_regime, contract_type_snapshot, currency
       FROM greenhouse_payroll.payroll_entries
      WHERE entry_id = $1
      LIMIT 1`,
    [entryId]
  )

  return rows[0] ?? null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { entryId } = await params

  try {
    const adjustments = await getAdjustmentsByEntry(entryId)

    return NextResponse.json({ adjustments, total: adjustments.length })
  } catch (error) {
    console.error('GET /adjustments failed', error)

    return NextResponse.json({ error: 'No fue posible cargar los ajustes.' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { entryId } = await params
    const session = await getServerAuthSession()
    const userId = session?.user?.id ?? tenant.userId

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

    const kind = String(body.kind ?? '')

    if (!ALLOWED_KINDS.includes(kind as AdjustmentKind)) {
      return NextResponse.json({ error: `kind invalido. Allowed: ${ALLOWED_KINDS.join(', ')}` }, { status: 400 })
    }

    const reasonCode = String(body.reasonCode ?? '')

    if (!isAdjustmentReasonCode(reasonCode)) {
      return NextResponse.json(
        { error: `reasonCode invalido. Allowed: ${ADJUSTMENT_REASON_CODES.join(', ')}` },
        { status: 400 }
      )
    }

    const reasonNote = String(body.reasonNote ?? '').trim()

    if (reasonNote.length < 5) {
      return NextResponse.json(
        { error: 'reasonNote requiere al menos 5 caracteres explicativos.' },
        { status: 400 }
      )
    }

    const rawPayload = (body.payload && typeof body.payload === 'object' ? body.payload : {}) as Record<
      string,
      unknown
    >

    const entrySnap = await fetchEntrySnapshot(entryId)

    if (!entrySnap) {
      return NextResponse.json({ error: 'Entry no encontrada' }, { status: 404 })
    }

    // Inyectar currency desde entry para kinds con monto absoluto. Si el client
    // no mando currency, asumimos la del entry (defensive). Si mando una
    // distinta, dejamos que el trigger DB la rechace para honrar la fuente
    // canonica (entry.currency).
    const payload: Record<string, unknown> =
      kind === 'fixed_deduction' || kind === 'manual_override'
        ? {
            ...rawPayload,
            currency: (rawPayload as { currency?: string }).currency ?? entrySnap.currency
          }
        : rawPayload

    // Compliance Chile dependiente: chequeo en TS antes de hit DB para mejor mensaje UX.
    const complianceError = checkChileDependentCompliance({
      payRegime: entrySnap.pay_regime as 'chile' | 'international',
      contractTypeSnapshot: entrySnap.contract_type_snapshot,
      kind: kind as AdjustmentKind,
      payload,
      reasonCode
    })

    if (complianceError) {
      return NextResponse.json({ error: complianceError }, { status: 422 })
    }

    const { adjustment, eventId } = await createAdjustment({
      payrollEntryId: entryId,
      memberId: entrySnap.member_id,
      periodId: entrySnap.period_id,
      kind: kind as AdjustmentKind,
      payload,
      reasonCode,
      reasonNote,
      requestedBy: userId,
      sourceKind: 'manual'
    })

    // TASK-745c — auto-recalculate del entry para reflejar el adjustment en
    // grossTotal/netTotal/SII/deducciones inmediatamente. Si el adjustment
    // nacio active, el recalc lo aplica; si nacio pending_approval, el
    // entry no cambia hasta que approveAdjustment dispare otro recalc.
    let recalculated = false

    if (adjustment.status === 'active') {
      try {
        await recalculatePayrollEntry({
          entryId,
          input: {},
          actorIdentifier: userId
        })
        recalculated = true
      } catch (recalcError) {
        // No fallamos la creacion: el adjustment ya quedo persistido y el
        // operador puede recalcular manual desde el header del periodo.
        console.warn(
          `[adjustments POST] auto-recalc failed for entry ${entryId}:`,
          recalcError instanceof Error ? recalcError.message : recalcError
        )
      }
    }

    return NextResponse.json({ adjustment, eventId, created: true, recalculated }, { status: 201 })
  } catch (error) {
    if (error instanceof PayrollAdjustmentValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('POST /adjustments failed', error)

    // Surface DB compliance trigger violations with the original message
    const message = error instanceof Error ? error.message : String(error)

    if (message.includes('Chile dependent payroll cannot be excluded')) {
      return NextResponse.json({ error: message }, { status: 422 })
    }

    return NextResponse.json({ error: 'No fue posible crear el ajuste.' }, { status: 500 })
  }
}
