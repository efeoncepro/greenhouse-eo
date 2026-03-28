'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'

import type { PayrollEntry, PayrollPeriod } from '@/types/payroll'
import { useOperatingEntity } from '@/context/OperatingEntityContext'
import { downloadPayrollReceiptPdf } from '@/lib/payroll/download-payroll-receipt'
import PayrollReceiptCard from './PayrollReceiptCard'

type Props = {
  open: boolean
  onClose: () => void
  entry: PayrollEntry | null
  period: PayrollPeriod
}

const PayrollReceiptDialog = ({ open, onClose, entry, period }: Props) => {
  const operatingEntity = useOperatingEntity()

  if (!entry) return null

  const employerInfo = operatingEntity
    ? { legalName: operatingEntity.legalName, taxId: operatingEntity.taxId, legalAddress: operatingEntity.legalAddress ?? undefined }
    : undefined

  const handleDownload = async () => {
    try {
      await downloadPayrollReceiptPdf({
        route: `/api/hr/payroll/entries/${entry.entryId}/receipt`,
        entryId: entry.entryId,
        periodId: period.periodId,
        memberId: entry.memberId,
        memberName: entry.memberName,
        payRegime: entry.payRegime,
        currency: entry.currency
      })
    } catch (error) {
      console.error('Unable to download payroll receipt.', error)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth closeAfterTransition={false}>
      <DialogTitle>Recibo — {entry.memberName}</DialogTitle>
      <DialogContent dividers>
        <PayrollReceiptCard entry={entry} period={period} employerInfo={employerInfo} />
      </DialogContent>
      <DialogActions>
        <Button
          variant='tonal'
          startIcon={<i className='tabler-file-download' />}
          onClick={() => { void handleDownload() }}
        >
          Descargar PDF
        </Button>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PayrollReceiptDialog
