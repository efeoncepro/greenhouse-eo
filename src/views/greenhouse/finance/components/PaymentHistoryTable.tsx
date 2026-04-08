'use client'

import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import PaymentInstrumentChip from '@/components/greenhouse/PaymentInstrumentChip'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentRecord {
  paymentId: string
  paymentDate: string | null
  amount: number
  currency?: string
  reference: string | null
  paymentMethod: string | null
  paymentAccountId?: string | null
  providerSlug?: string | null
  instrumentCategory?: string | null
  notes: string | null
}

interface PaymentHistoryTableProps {
  payments: PaymentRecord[]
  currency: string
  emptyMessage?: string
  title?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '\u2014'

  const [y, m, d] = dateStr.split('-')

  return `${d}/${m}/${y}`
}

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2
  }).format(amount)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PaymentHistoryTable = ({
  payments,
  currency,
  emptyMessage = 'Sin pagos registrados',
  title = 'Historial de pagos'
}: PaymentHistoryTableProps) => {
  return (
    <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
      <CardHeader
        title={title}
        avatar={
          <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
            <i className='tabler-history' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
          </Avatar>
        }
      />
      <Divider />
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell align='right'>Monto</TableCell>
              <TableCell>Referencia</TableCell>
              <TableCell>Metodo</TableCell>
              <TableCell>Instrumento</TableCell>
              <TableCell>Notas</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align='center' sx={{ py: 6 }}>
                  <Typography variant='body2' color='text.secondary'>
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p, i) => (
                <TableRow key={p.paymentId || i}>
                  <TableCell>{formatDate(p.paymentDate)}</TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2' fontWeight={600} color='success.main'>
                      {formatAmount(p.amount, p.currency || currency)}
                    </Typography>
                  </TableCell>
                  <TableCell>{p.reference || '\u2014'}</TableCell>
                  <TableCell>{p.paymentMethod || '\u2014'}</TableCell>
                  <TableCell>
                    {p.providerSlug ? (
                      <PaymentInstrumentChip
                        providerSlug={p.providerSlug}
                        instrumentName={p.paymentMethod || 'Cuenta'}
                        instrumentCategory={p.instrumentCategory as any}
                        size='sm'
                        showName={false}
                      />
                    ) : '\u2014'}
                  </TableCell>
                  <TableCell>{p.notes || '\u2014'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  )
}

export default PaymentHistoryTable
export type { PaymentRecord, PaymentHistoryTableProps }
