'use client'

import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import type { PayrollPeriod } from '@/types/payroll'
import { formatPeriodLabel, formatTimestamp, periodStatusConfig } from './helpers'

type Props = {
  periods: PayrollPeriod[]
  selectedPeriodId: string | null
  onSelectPeriod: (periodId: string) => void
}

const PayrollHistoryTab = ({ periods, selectedPeriodId, onSelectPeriod }: Props) => {
  const closedPeriods = periods.filter(p => p.status === 'approved' || p.status === 'exported')

  return (
    <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
      <CardHeader
        title='Historial de nóminas'
        subheader={`${closedPeriods.length} período${closedPeriods.length !== 1 ? 's' : ''} cerrado${closedPeriods.length !== 1 ? 's' : ''}`}
        avatar={
          <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
            <i className='tabler-history' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
          </Avatar>
        }
      />
      <Divider />
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
                    selected={selectedPeriodId === period.periodId}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => onSelectPeriod(period.periodId)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelectPeriod(period.periodId)
                      }
                    }}
                    role='button'
                    tabIndex={0}
                    aria-label={`Abrir período ${formatPeriodLabel(period.year, period.month)}`}
                  >
                    <TableCell>
                      <Typography variant='body2' fontWeight={500}>
                        {formatPeriodLabel(period.year, period.month)}
                      </Typography>
                    </TableCell>
                    <TableCell align='center'>
                      <CustomChip
                        round='true'
                        size='small'
                        icon={<i className={status.icon} />}
                        label={status.label}
                        color={status.color === 'default' ? 'secondary' : status.color}
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
                    <Stack alignItems='center' spacing={1}>
                      <i className='tabler-history-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                      <Typography color='text.secondary'>No hay períodos cerrados todavía.</Typography>
                      <Typography variant='caption' color='text.disabled'>
                        Los períodos aparecerán aquí una vez aprobados o exportados.
                      </Typography>
                    </Stack>
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
