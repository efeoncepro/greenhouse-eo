'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'

import type { PayrollEntry, PayrollPeriod } from '@/types/payroll'
import PayrollReceiptCard from './PayrollReceiptCard'

type Props = {
  open: boolean
  onClose: () => void
  entry: PayrollEntry | null
  period: PayrollPeriod
}

const PayrollReceiptDialog = ({ open, onClose, entry, period }: Props) => {
  if (!entry) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth closeAfterTransition={false}>
      <DialogTitle>Recibo — {entry.memberName}</DialogTitle>
      <DialogContent dividers>
        <PayrollReceiptCard entry={entry} period={period} />
      </DialogContent>
      <DialogActions>
        <Button
          variant='tonal'
          startIcon={<i className='tabler-file-download' />}
          onClick={() => window.open(`/api/hr/payroll/entries/${entry.entryId}/receipt`, '_blank')}
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
