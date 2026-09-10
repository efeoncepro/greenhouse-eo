#!/usr/bin/env tsx
/**
 * CLI — Cerrar un payable de contractor que el banco YA pagó antes de que la
 * boleta llegara a Greenhouse (readiness bloqueada por `invoice_asset_missing`).
 *
 * Camino canónico, sin atajos: adjuntar boleta (asset privado + link
 * append-only) → readiness (`ready_for_finance`) → obligación (la crea la
 * projection reactiva del ops-worker; este CLI sólo espera/lee) → orden de
 * pago con `sourceAccountId` → approve → submit → `markPaymentOrderPaidAtomic`
 * con `paidAt` = fecha del banco (backdating soportado). La conciliación de la
 * fila bancaria se hace después con `finance:reconcile-rows`
 * (`link_existing_payment`).
 *
 *   pnpm finance:contractor-settle --payable cpay-… --attach data/bank/boleta.pdf --folio 47 --issued 2026-08-30
 *   pnpm finance:contractor-settle --payable cpay-… --ready
 *   pnpm finance:contractor-settle --payable cpay-… --status
 *   pnpm finance:contractor-settle --payable cpay-… --pay --source-account santander-clp --paid-at 2026-09-07 --external-ref "cartola 07/09" --approver <userId>
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

import { attachContractorInvoiceAsset } from '@/lib/contractor-engagements/invoice-assets'
import { getContractorPayableById, transitionPayableToReadyForFinance } from '@/lib/contractor-engagements/payables/store'
import { listPaymentObligations } from '@/lib/finance/payment-obligations/list-obligations'
import { approvePaymentOrder } from '@/lib/finance/payment-orders/approve-order'
import { createPaymentOrderFromObligations } from '@/lib/finance/payment-orders/create-from-obligations'
import { markPaymentOrderPaidAtomic } from '@/lib/finance/payment-orders/mark-paid-atomic'
import { submitPaymentOrder } from '@/lib/finance/payment-orders/submit-order'
import { createPrivatePendingAsset } from '@/lib/storage/greenhouse-assets'

const DEFAULT_ACTOR = 'user-efeonce-admin-julio-reyes'

const parseArgs = () => {
  const argv = process.argv.slice(2)
  const args: Record<string, string | boolean> = {}

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]

    if (!token.startsWith('--')) continue

    const next = argv[i + 1]

    if (next === undefined || next.startsWith('--')) args[token.slice(2)] = true
    else {
      args[token.slice(2)] = next
      i++
    }
  }

  return args
}

const str = (args: Record<string, string | boolean>, key: string) =>
  typeof args[key] === 'string' && (args[key] as string).trim() ? (args[key] as string).trim() : null

const printPayable = (p: NonNullable<Awaited<ReturnType<typeof getContractorPayableById>>>) => {
  console.log(
    `[payable] ${p.publicId} (${p.contractorPayableId}) status=${p.status} bruto=${p.grossAmount} ret=${p.withholdingAmount} neto=${p.netPayable} ${p.currency} due=${p.dueDate ?? '—'} obligation=${p.financeObligationId ?? '—'} order=${p.paymentOrderId ?? '—'}`
  )
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')

  const args = parseArgs()
  const actor = str(args, 'actor') ?? DEFAULT_ACTOR
  const payableId = str(args, 'payable')

  if (!payableId) throw new Error('--payable <cpay-…> es obligatorio')

  let payable = await getContractorPayableById(payableId)

  if (!payable) throw new Error(`Payable ${payableId} no existe`)

  printPayable(payable)

  if (str(args, 'attach')) {
    const file = path.resolve(str(args, 'attach') as string)
    const bytes = readFileSync(file)
    const folio = str(args, 'folio')
    const issued = str(args, 'issued')

    if (!payable.beneficiaryId) throw new Error('El payable no tiene beneficiario (member) para asignar el asset')

    const asset = await createPrivatePendingAsset({
      contextType: 'contractor_invoice_draft',
      uploadedByUserId: actor,
      fileName: path.basename(file),
      contentType: 'application/pdf',
      bytes,
      ownerMemberId: payable.beneficiaryId,
      metadata: { folio, issuedAt: issued, contractorPayableId: payable.contractorPayableId, uploadedOnBehalf: true }
    })

    const link = await attachContractorInvoiceAsset({
      contractorEngagementId: payable.contractorEngagementId,
      contractorWorkSubmissionId: payable.contractorWorkSubmissionId,
      assetId: asset.assetId,
      assetRole: 'invoice_pdf',
      artifactKind: 'human_readable',
      source: 'finance_upload_on_behalf',
      countryCode: 'CL',
      metadata: {
        documentType: 'boleta_honorarios_electronica',
        folio,
        issuedAt: issued,
        grossAmount: payable.grossAmount,
        withholdingAmount: payable.withholdingAmount,
        netAmount: payable.netPayable,
        contractorPayableId: payable.contractorPayableId,
        note: 'Boleta entregada fuera de Greenhouse; adjuntada por Finance en la recuperación de conciliación ago–sep 2026.'
      },
      actorUserId: actor
    })

    console.log(`[attach] asset ${asset.assetId} → link ${link.invoiceAssetId}`)
  }

  if (args.ready === true) {
    payable = await transitionPayableToReadyForFinance({ contractorPayableId: payableId, actorUserId: actor })
    printPayable(payable)
  }

  const obligations = await listPaymentObligations({
    sourceKind: 'contractor_payable',
    beneficiaryId: payable.beneficiaryId ?? undefined,
    status: 'all',
    limit: 50
  })

  const obligation = obligations.items.find(o => o.sourceRef === payable?.contractorPayableId)

  console.log(`[obligation] ${obligation ? `${obligation.obligationId} status=${obligation.status} amount=${obligation.amount} ${obligation.currency}` : 'aún no creada (la crea la projection reactiva del ops-worker; reintenta en unos minutos)'}`)

  if (args.pay === true) {
    if (!obligation) throw new Error('Sin obligación todavía: no se puede crear la orden de pago')

    const sourceAccountId = str(args, 'source-account')
    const paidAt = str(args, 'paid-at')

    if (!sourceAccountId || !paidAt) throw new Error('--source-account y --paid-at son obligatorios con --pay')

    let orderId = payable.paymentOrderId

    if (!orderId) {
      const created = await createPaymentOrderFromObligations({
        batchKind: 'manual',
        title: `Honorarios ${payable.publicId} — pagado por banco ${paidAt}`,
        description: `Regularización: transferencia bancaria ya ejecutada el ${paidAt} desde ${sourceAccountId}. Orden creada para dejar el pago en el ledger canónico.`,
        obligationIds: [obligation.obligationId],
        sourceAccountId,
        paymentMethod: 'bank_transfer',
        requireApproval: true,
        createdBy: actor,
        metadata: { backdatedSettlement: true, paidAt, contractorPayableId: payable.contractorPayableId }
      })

      orderId = created.order.orderId
      console.log(`[order] creada ${orderId} state=${created.order.state}`)
    }

    const approver = str(args, 'approver')

    if (!approver) throw new Error('--approver <userId> (distinto del creador: maker-checker) es obligatorio con --pay')

    const approved = await approvePaymentOrder({ orderId, approvedBy: approver }).catch(err => {
      console.log(`[order] approve: ${err instanceof Error ? err.message : String(err)}`)

      return null
    })

    if (approved) console.log(`[order] approved state=${approved.order.state}`)

    const submitted = await submitPaymentOrder({ orderId, submittedBy: actor, externalReference: str(args, 'external-ref') ?? undefined }).catch(err => {
      console.log(`[order] submit: ${err instanceof Error ? err.message : String(err)}`)

      return null
    })

    if (submitted) console.log(`[order] submitted state=${submitted.order.state}`)

    const paid = await markPaymentOrderPaidAtomic({ orderId, paidBy: actor, paidAt, externalReference: str(args, 'external-ref') ?? undefined })

    console.log(`[order] PAID ${paid.order.orderId} state=${paid.order.state} expensePayments=${paid.expensePaymentIds.join(',')}`)
  }

  payable = await getContractorPayableById(payableId)

  if (payable) printPayable(payable)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(`  ✗ ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  })
