'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'

import { getMicrocopy } from '@/lib/copy'

import type { PayrollEntry, PayrollPeriod } from '@/types/payroll'
import { useOperatingEntity } from '@/context/OperatingEntityContext'
import { downloadPayrollReceiptPdf } from '@/lib/payroll/download-payroll-receipt'
import PayrollReceiptCard from './PayrollReceiptCard'

const GREENHOUSE_COPY = getMicrocopy()

type Props = {
  open: boolean
  onClose: () => void
  entry: PayrollEntry | null
  period: PayrollPeriod
}

const PayrollReceiptDialog = ({ open, onClose, entry, period }: Props) => {
  const operatingEntity = useOperatingEntity()
  const [downloadError, setDownloadError] = useState<string | null>(null)

  if (!entry) return null

  const employerInfo = operatingEntity
    ? { legalName: operatingEntity.legalName, taxId: operatingEntity.taxId, legalAddress: operatingEntity.legalAddress ?? undefined }
    : undefined

  const handleDownload = async () => {
    setDownloadError(null)

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
      const message = error instanceof Error ? error.message : 'No fue posible descargar el recibo.'

      setDownloadError(message)
      console.error('Unable to download payroll receipt.', error)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth closeAfterTransition={false}>
      <DialogTitle>Recibo — {entry.memberName}</DialogTitle>
      <DialogContent dividers>
        {downloadError && (
          <Alert severity='error' sx={{ mb: 2 }} onClose={() => setDownloadError(null)}>
            {downloadError}
          </Alert>
        )}
        <PayrollReceiptCard entry={entry} period={period} employerInfo={employerInfo} />
      </DialogContent>
      <DialogActions>
        <Button
          variant='tonal'
          startIcon={<i className='tabler-file-download' />}
          onClick={() => { void handleDownload() }}
          aria-label={`Descargar PDF del recibo de ${entry.memberName}`}
        >
          Descargar PDF
        </Button>
        <Button variant='tonal' color='secondary' onClick={onClose}>{GREENHOUSE_COPY.actions.close}</Button>
      </DialogActions>
    </Dialog>
  )
}

export default PayrollReceiptDialog
