'use client'

import { Fragment, useState } from 'react'

import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Collapse from '@mui/material/Collapse'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import type { PayrollEntry, PeriodStatus } from '@/types/payroll'
import { getInitials } from '@/utils/getInitials'
import BonusInput from './BonusInput'
import ChileDeductionBreakdown from './ChileDeductionBreakdown'
import { formatCurrency, formatPercent, formatDecimal, formatFactor, formatAttendanceRatio, otdSemaphore, rpaSemaphore, regimeLabel, regimeColor } from './helpers'

type Props = {
  entries: PayrollEntry[]
  periodStatus: PeriodStatus
  onEntryUpdate: (entryId: string, field: string, value: number | string | boolean | null) => void
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
            <TableCell align='center'>Asistencia</TableCell>
            <TableCell align='right'>Base</TableCell>
            <TableCell align='center'>OTD%</TableCell>
            <TableCell align='right'>Bono OTD</TableCell>
            <TableCell align='center'>RpA</TableCell>
            <TableCell align='right'>Bono RpA</TableCell>
            <TableCell align='right'>Teletrabajo</TableCell>
            <TableCell align='right'>Bruto</TableCell>
            <TableCell align='right'>Descuentos</TableCell>
            <TableCell align='right' sx={{ fontWeight: 700 }}>Neto</TableCell>
            <TableCell sx={{ width: 40 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map(entry => {
            const isChile = entry.payRegime === 'chile'
            const isExpanded = expandedId === entry.entryId
            const otd = otdSemaphore(entry.kpiOtdPercent, entry.bonusOtdProrationFactor)
            const rpa = rpaSemaphore(entry.kpiRpaAvg, entry.bonusRpaProrationFactor)
            const isManualKpi = entry.kpiDataSource === 'manual'
            const canExpand = isChile || isEditable || entry.workingDaysInPeriod != null

            return (
              <Fragment key={entry.entryId}>
                <TableRow hover sx={{ '& > td': { borderBottom: isExpanded ? 'none' : undefined } }}>
                  {/* Expand */}
                  <TableCell>
                    {canExpand && (
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
                        <CustomChip
                          round='true'
                          size='small'
                          label={regimeLabel[entry.payRegime]}
                          color={regimeColor[entry.payRegime]}
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      </Box>
                    </Stack>
                  </TableCell>

                  {/* Attendance */}
                  <TableCell align='center'>
                    {entry.workingDaysInPeriod != null ? (
                      <Tooltip title={`Presentes: ${entry.daysPresent ?? 0} | Ausentes: ${entry.daysAbsent ?? 0} | Licencia: ${entry.daysOnLeave ?? 0}`}>
                        <span>
                          <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                            {formatAttendanceRatio(entry.daysPresent, entry.workingDaysInPeriod)}
                          </Typography>
                          {(entry.daysAbsent ?? 0) > 0 && (
                            <CustomChip round='true' size='small' label={`-${entry.daysAbsent}`} color='error' sx={{ height: 16, fontSize: '0.55rem', mt: 0.25 }} />
                          )}
                        </span>
                      </Tooltip>
                    ) : (
                      <Typography variant='body2' color='text.disabled'>—</Typography>
                    )}
                  </TableCell>

                  {/* Base */}
                  <TableCell align='right'>
                    <Tooltip title={entry.adjustedBaseSalary != null && entry.adjustedBaseSalary !== entry.baseSalary
                      ? `Original: ${formatCurrency(entry.baseSalary, entry.currency)} | Ajustado por inasistencia`
                      : ''
                    }>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {formatCurrency(entry.adjustedBaseSalary ?? entry.baseSalary, entry.currency)}
                      </Typography>
                    </Tooltip>
                  </TableCell>

                  {/* OTD% */}
                  <TableCell align='center'>
                    <Stack alignItems='center' spacing={0.5}>
                      <Typography variant='body2'>{formatPercent(entry.kpiOtdPercent)}</Typography>
                      <CustomChip round='true' size='small' label={otd.label} color={otd.color} sx={{ height: 18, fontSize: '0.6rem' }} />
                      {isManualKpi && (
                        <Tooltip title='KPI ingresado manualmente'>
                          <span>
                            <CustomChip round='true' size='small' label='Manual' color='warning' sx={{ height: 16, fontSize: '0.55rem' }} />
                          </span>
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
                      <CustomChip round='true' size='small' label={rpa.label} color={rpa.color} sx={{ height: 18, fontSize: '0.6rem' }} />
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
                    <Tooltip title={entry.adjustedRemoteAllowance != null && entry.adjustedRemoteAllowance !== entry.remoteAllowance
                      ? `Original: ${formatCurrency(entry.remoteAllowance, entry.currency)} | Ajustado por inasistencia`
                      : ''
                    }>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {formatCurrency(entry.adjustedRemoteAllowance ?? entry.remoteAllowance, entry.currency)}
                      </Typography>
                    </Tooltip>
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
                        <span>
                          <CustomChip round='true' size='small' label='Override' color='warning' sx={{ height: 16, fontSize: '0.55rem', mt: 0.5 }} />
                        </span>
                      </Tooltip>
                    )}
                  </TableCell>

                  {/* Receipt */}
                  <TableCell>
                    {(periodStatus === 'approved' || periodStatus === 'exported') && (
                      <Tooltip title='Descargar recibo'>
                        <IconButton size='small' onClick={() => window.open(`/api/hr/payroll/entries/${entry.entryId}/receipt`, '_blank')}>
                          <i className='tabler-file-invoice' />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>

                {/* Expanded detail row */}
                {canExpand && (
                  <TableRow>
                    <TableCell colSpan={13} sx={{ py: 0, px: 0 }}>
                      <Collapse in={isExpanded} timeout='auto' unmountOnExit>
                        <Box sx={{ p: 2 }}>
                          <Stack spacing={3}>
                            {/* Attendance & proration breakdown */}
                            {entry.workingDaysInPeriod != null && (
                              <Card
                                elevation={0}
                                sx={{
                                  border: t => `1px solid ${t.palette.divider}`,
                                  borderLeftWidth: '4px',
                                  borderLeftStyle: 'solid',
                                  borderLeftColor: 'primary.main'
                                }}
                              >
                                <CardContent sx={{ py: 2 }}>
                                  <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 2 }}>
                                    <i className='tabler-calendar-stats' style={{ fontSize: 16, verticalAlign: 'text-bottom', marginRight: 4 }} />
                                    Asistencia y prorrateo
                                  </Typography>
                                  <Grid container spacing={2}>
                                    <Grid size={{ xs: 6, sm: 2 }}>
                                      <Typography variant='caption' color='text.secondary'>Días hábiles</Typography>
                                      <Typography variant='body2' fontWeight={500}>{entry.workingDaysInPeriod}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6, sm: 2 }}>
                                      <Typography variant='caption' color='text.secondary'>Presentes</Typography>
                                      <Typography variant='body2' fontWeight={500}>{entry.daysPresent ?? '—'}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6, sm: 2 }}>
                                      <Typography variant='caption' color='text.secondary'>Ausentes</Typography>
                                      <Typography variant='body2' fontWeight={500} color={(entry.daysAbsent ?? 0) > 0 ? 'error.main' : undefined}>
                                        {entry.daysAbsent ?? 0}
                                      </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6, sm: 2 }}>
                                      <Typography variant='caption' color='text.secondary'>Licencia</Typography>
                                      <Typography variant='body2' fontWeight={500}>{entry.daysOnLeave ?? 0}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6, sm: 2 }}>
                                      <Typography variant='caption' color='text.secondary'>Factor OTD</Typography>
                                      <Typography variant='body2' fontWeight={500}>{formatFactor(entry.bonusOtdProrationFactor)}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6, sm: 2 }}>
                                      <Typography variant='caption' color='text.secondary'>Factor RpA</Typography>
                                      <Typography variant='body2' fontWeight={500}>{formatFactor(entry.bonusRpaProrationFactor)}</Typography>
                                    </Grid>
                                  </Grid>
                                </CardContent>
                              </Card>
                            )}

                            {/* Chile deduction breakdown */}
                            {isChile && (
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <ChileDeductionBreakdown entry={entry} />
                              </Box>
                            )}

                            {/* Manual KPI fields */}
                            {isEditable && isManualKpi && (
                              <Card
                                elevation={0}
                                sx={{
                                  border: t => `1px solid ${t.palette.divider}`,
                                  borderLeftWidth: '4px',
                                  borderLeftStyle: 'solid',
                                  borderLeftColor: 'warning.main'
                                }}
                              >
                                <CardContent sx={{ py: 2 }}>
                                  <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 2 }}>
                                    <i className='tabler-edit' style={{ fontSize: 16, verticalAlign: 'text-bottom', marginRight: 4 }} />
                                    KPI manual
                                  </Typography>
                                  <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                      <CustomTextField
                                        fullWidth
                                        size='small'
                                        label='OTD %'
                                        type='number'
                                        defaultValue={entry.kpiOtdPercent ?? ''}
                                        onBlur={e => {
                                          const v = e.target.value === '' ? null : Number(e.target.value)

                                          onEntryUpdate(entry.entryId, 'kpiOtdPercent', v)
                                        }}
                                        inputProps={{ min: 0, max: 100, step: 0.1 }}
                                      />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                      <CustomTextField
                                        fullWidth
                                        size='small'
                                        label='RpA promedio'
                                        type='number'
                                        defaultValue={entry.kpiRpaAvg ?? ''}
                                        onBlur={e => {
                                          const v = e.target.value === '' ? null : Number(e.target.value)

                                          onEntryUpdate(entry.entryId, 'kpiRpaAvg', v)
                                        }}
                                        inputProps={{ min: 0, step: 0.1 }}
                                      />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                      <CustomTextField
                                        fullWidth
                                        size='small'
                                        label='Tareas completadas'
                                        type='number'
                                        defaultValue={entry.kpiTasksCompleted ?? ''}
                                        onBlur={e => {
                                          const v = e.target.value === '' ? null : Number(e.target.value)

                                          onEntryUpdate(entry.entryId, 'kpiTasksCompleted', v)
                                        }}
                                        inputProps={{ min: 0 }}
                                      />
                                    </Grid>
                                  </Grid>
                                </CardContent>
                              </Card>
                            )}

                            {/* Tax override (Chile only) */}
                            {isEditable && isChile && (
                              <Card
                                elevation={0}
                                sx={{
                                  border: t => `1px solid ${t.palette.divider}`,
                                  borderLeftWidth: '4px',
                                  borderLeftStyle: 'solid',
                                  borderLeftColor: 'error.main'
                                }}
                              >
                                <CardContent sx={{ py: 2 }}>
                                  <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 2 }}>
                                    <i className='tabler-receipt-tax' style={{ fontSize: 16, verticalAlign: 'text-bottom', marginRight: 4 }} />
                                    Impuesto
                                  </Typography>
                                  <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 4 }}>
                                      <CustomTextField
                                        fullWidth
                                        size='small'
                                        label='Impuesto único (CLP)'
                                        type='number'
                                        defaultValue={entry.chileTaxAmount ?? ''}
                                        onBlur={e => {
                                          const v = e.target.value === '' ? null : Number(e.target.value)

                                          onEntryUpdate(entry.entryId, 'chileTaxAmount', v)
                                        }}
                                        inputProps={{ min: 0 }}
                                      />
                                    </Grid>
                                  </Grid>
                                </CardContent>
                              </Card>
                            )}

                            {/* Manual override */}
                            {isEditable && (
                              <Card
                                elevation={0}
                                sx={{
                                  border: t => `1px solid ${t.palette.divider}`,
                                  borderLeftWidth: '4px',
                                  borderLeftStyle: 'solid',
                                  borderLeftColor: 'info.main'
                                }}
                              >
                                <CardContent sx={{ py: 2 }}>
                                  <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 2 }}>
                                    <i className='tabler-adjustments' style={{ fontSize: 16, verticalAlign: 'text-bottom', marginRight: 4 }} />
                                    Override manual
                                  </Typography>
                                  <Stack spacing={2}>
                                    <FormControlLabel
                                      control={
                                        <Switch
                                          checked={entry.manualOverride}
                                          onChange={e => onEntryUpdate(entry.entryId, 'manualOverride', e.target.checked)}
                                        />
                                      }
                                      label='Activar override de neto'
                                    />
                                    {entry.manualOverride && (
                                      <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, sm: 4 }}>
                                          <CustomTextField
                                            fullWidth
                                            size='small'
                                            label='Neto override'
                                            type='number'
                                            defaultValue={entry.netTotalOverride ?? entry.netTotal}
                                            onBlur={e => {
                                              const v = Number(e.target.value)

                                              if (!isNaN(v)) onEntryUpdate(entry.entryId, 'netTotal', v)
                                            }}
                                            inputProps={{ min: 0 }}
                                          />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 8 }}>
                                          <CustomTextField
                                            fullWidth
                                            size='small'
                                            label='Motivo del override'
                                            defaultValue={entry.manualOverrideNote ?? ''}
                                            onBlur={e => onEntryUpdate(entry.entryId, 'manualOverrideNote', e.target.value)}
                                          />
                                        </Grid>
                                      </Grid>
                                    )}
                                  </Stack>
                                </CardContent>
                              </Card>
                            )}
                          </Stack>
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
