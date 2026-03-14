'use client'

import { Fragment, useState } from 'react'

import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import type { PayrollEntry, PeriodStatus } from '@/types/payroll'
import { getInitials } from '@/utils/getInitials'
import BonusInput from './BonusInput'
import ChileDeductionBreakdown from './ChileDeductionBreakdown'
import { formatCurrency, formatPercent, formatDecimal, otdSemaphore, rpaSemaphore, regimeLabel, regimeColor } from './helpers'

type Props = {
  entries: PayrollEntry[]
  periodStatus: PeriodStatus
  onEntryUpdate: (entryId: string, field: string, value: number) => void
}

const PayrollEntryTable = ({ entries, periodStatus, onEntryUpdate }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const isEditable = periodStatus === 'calculated'

  const toggleExpand = (entryId: string) => {
    setExpandedId(prev => (prev === entryId ? null : entryId))
  }

  return (
    <TableContainer>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }} />
            <TableCell>Colaborador</TableCell>
            <TableCell align='right'>Base</TableCell>
            <TableCell align='center'>OTD%</TableCell>
            <TableCell align='right'>Bono OTD</TableCell>
            <TableCell align='center'>RpA</TableCell>
            <TableCell align='right'>Bono RpA</TableCell>
            <TableCell align='right'>Teletrabajo</TableCell>
            <TableCell align='right'>Bruto</TableCell>
            <TableCell align='right'>Descuentos</TableCell>
            <TableCell align='right' sx={{ fontWeight: 700 }}>Neto</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map(entry => {
            const isChile = entry.payRegime === 'chile'
            const isExpanded = expandedId === entry.entryId
            const otd = otdSemaphore(entry.kpiOtdPercent)
            const rpa = rpaSemaphore(entry.kpiRpaAvg)

            return (
              <Fragment key={entry.entryId}>
                <TableRow hover sx={{ '& > td': { borderBottom: isExpanded ? 'none' : undefined } }}>
                  {/* Expand */}
                  <TableCell>
                    {isChile && (
                      <IconButton size='small' onClick={() => toggleExpand(entry.entryId)}>
                        <i className={isExpanded ? 'tabler-chevron-up' : 'tabler-chevron-down'} />
                      </IconButton>
                    )}
                  </TableCell>

                  {/* Name */}
                  <TableCell>
                    <Stack direction='row' spacing={2} alignItems='center'>
                      <Avatar
                        src={entry.memberAvatarUrl || undefined}
                        sx={{ width: 32, height: 32, fontSize: '0.875rem' }}
                      >
                        {getInitials(entry.memberName)}
                      </Avatar>
                      <Box>
                        <Link href={`/hr/payroll/member/${entry.memberId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <Typography variant='body2' fontWeight={500} sx={{ '&:hover': { textDecoration: 'underline' } }}>
                            {entry.memberName}
                          </Typography>
                        </Link>
                        <Chip
                          size='small'
                          label={regimeLabel[entry.payRegime]}
                          color={regimeColor[entry.payRegime]}
                          variant='tonal'
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      </Box>
                    </Stack>
                  </TableCell>

                  {/* Base */}
                  <TableCell align='right'>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                      {formatCurrency(entry.baseSalary, entry.currency)}
                    </Typography>
                  </TableCell>

                  {/* OTD% */}
                  <TableCell align='center'>
                    <Stack alignItems='center' spacing={0.5}>
                      <Typography variant='body2'>{formatPercent(entry.kpiOtdPercent)}</Typography>
                      <Chip size='small' label={otd.label} color={otd.color} variant='tonal' sx={{ height: 18, fontSize: '0.6rem' }} />
                      {entry.kpiDataSource === 'manual' && (
                        <Tooltip title='KPI ingresado manualmente'>
                          <Chip size='small' label='Manual' color='warning' variant='tonal' sx={{ height: 16, fontSize: '0.55rem' }} />
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>

                  {/* Bono OTD */}
                  <TableCell align='right'>
                    {isEditable ? (
                      <BonusInput
                        value={entry.bonusOtdAmount}
                        min={entry.bonusOtdMin}
                        max={entry.bonusOtdMax}
                        currency={entry.currency}
                        qualifies={entry.kpiOtdQualifies}
                        label='OTD'
                        onChange={v => onEntryUpdate(entry.entryId, 'bonusOtdAmount', v)}
                      />
                    ) : (
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {formatCurrency(entry.bonusOtdAmount, entry.currency)}
                      </Typography>
                    )}
                  </TableCell>

                  {/* RpA */}
                  <TableCell align='center'>
                    <Stack alignItems='center' spacing={0.5}>
                      <Typography variant='body2'>{formatDecimal(entry.kpiRpaAvg)}</Typography>
                      <Chip size='small' label={rpa.label} color={rpa.color} variant='tonal' sx={{ height: 18, fontSize: '0.6rem' }} />
                    </Stack>
                  </TableCell>

                  {/* Bono RpA */}
                  <TableCell align='right'>
                    {isEditable ? (
                      <BonusInput
                        value={entry.bonusRpaAmount}
                        min={entry.bonusRpaMin}
                        max={entry.bonusRpaMax}
                        currency={entry.currency}
                        qualifies={entry.kpiRpaQualifies}
                        label='RpA'
                        onChange={v => onEntryUpdate(entry.entryId, 'bonusRpaAmount', v)}
                      />
                    ) : (
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {formatCurrency(entry.bonusRpaAmount, entry.currency)}
                      </Typography>
                    )}
                  </TableCell>

                  {/* Teletrabajo */}
                  <TableCell align='right'>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                      {formatCurrency(entry.remoteAllowance, entry.currency)}
                    </Typography>
                  </TableCell>

                  {/* Bruto */}
                  <TableCell align='right'>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                      {formatCurrency(entry.grossTotal, entry.currency)}
                    </Typography>
                  </TableCell>

                  {/* Descuentos */}
                  <TableCell align='right'>
                    {isChile ? (
                      <Typography
                        variant='body2'
                        color='error.main'
                        sx={{ fontFamily: 'monospace', cursor: 'pointer' }}
                        onClick={() => toggleExpand(entry.entryId)}
                      >
                        - {formatCurrency(entry.chileTotalDeductions, 'CLP')}
                      </Typography>
                    ) : (
                      <Typography variant='body2' color='text.disabled'>—</Typography>
                    )}
                  </TableCell>

                  {/* Neto */}
                  <TableCell align='right'>
                    <Typography variant='subtitle2' sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                      {formatCurrency(entry.netTotal, entry.currency)}
                    </Typography>
                    {entry.manualOverride && (
                      <Tooltip title={entry.manualOverrideNote || 'Override manual'}>
                        <Chip size='small' label='Override' color='warning' variant='tonal' sx={{ height: 16, fontSize: '0.55rem', mt: 0.5 }} />
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>

                {/* Chile expanded row */}
                {isChile && (
                  <TableRow>
                    <TableCell colSpan={11} sx={{ py: 0, px: 0 }}>
                      <Collapse in={isExpanded} timeout='auto' unmountOnExit>
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                          <ChileDeductionBreakdown entry={entry} />
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default PayrollEntryTable
