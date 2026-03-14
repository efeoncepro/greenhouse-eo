'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import type { PayrollPeriod } from '@/types/payroll'
import { formatPeriodLabel, formatTimestamp, periodStatusConfig } from './helpers'

type Props = {
  periods: PayrollPeriod[]
  onSelectPeriod: (periodId: string) => void
}

const PayrollHistoryTab = ({ periods, onSelectPeriod }: Props) => {
  const closedPeriods = periods.filter(p => p.status === 'approved' || p.status === 'exported')

  return (
    <Card>
      <CardHeader
        title='Historial de nóminas'
        subheader={`${closedPeriods.length} período${closedPeriods.length !== 1 ? 's' : ''} cerrado${closedPeriods.length !== 1 ? 's' : ''}`}
      />
      <CardContent>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Período</TableCell>
                <TableCell align='center'>Estado</TableCell>
                <TableCell>Aprobado</TableCell>
                <TableCell>Exportado</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {closedPeriods.map(period => {
                const status = periodStatusConfig[period.status]

                return (
                  <TableRow
                    key={period.periodId}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => onSelectPeriod(period.periodId)}
                  >
                    <TableCell>
                      <Typography variant='body2' fontWeight={500}>
                        {formatPeriodLabel(period.year, period.month)}
                      </Typography>
                    </TableCell>
                    <TableCell align='center'>
                      <Chip
                        size='small'
                        icon={<i className={status.icon} />}
                        label={status.label}
                        color={status.color}
                        variant='tonal'
                        sx={{ height: 22 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {formatTimestamp(period.approvedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {formatTimestamp(period.exportedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <i className='tabler-chevron-right' style={{ color: 'var(--mui-palette-text-disabled)' }} />
                    </TableCell>
                  </TableRow>
                )
              })}
              {closedPeriods.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align='center' sx={{ py: 6 }}>
                    <Typography color='text.secondary'>No hay períodos cerrados todavía.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  )
}

export default PayrollHistoryTab
