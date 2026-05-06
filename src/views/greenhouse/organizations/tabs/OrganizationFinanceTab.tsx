'use client'

import { useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import type { OrganizationDetailData, OrganizationFinanceSummary } from '../types'
import { getMicrocopy } from '@/lib/copy'

const GREENHOUSE_COPY = getMicrocopy()

// ── Helpers ────────────────────────────────────────────────────────────

const MONTH_SHORT = ['', ...GREENHOUSE_COPY.months.short]

const formatCLP = (amount: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const formatPercent = (value: number | null): string =>
  value != null ? `${(value * 100).toFixed(1)}%` : '—'

const marginColor = (value: number | null): 'success' | 'warning' | 'error' | 'secondary' => {
  if (value == null) return 'secondary'
  if (value >= 0.3) return 'success'
  if (value >= 0.15) return 'warning'

  return 'error'
}

// ── Component ──────────────────────────────────────────────────────────

type Props = {
  detail: OrganizationDetailData
}

const OrganizationFinanceTab = ({ detail }: Props) => {
  const now = new Date()

  // Default to previous month (last closed month) — current month often has no data yet
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const [year, setYear] = useState(prevMonth.getFullYear())
  const [month, setMonth] = useState(prevMonth.getMonth() + 1)
  const [data, setData] = useState<OrganizationFinanceSummary | null>(null)
  const [financeYtd, setFinanceYtd] = useState<{ revenueYTD: number; invoiceCount: number; outstandingAmount: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      try {
        const asOf = `${year}-${String(month).padStart(2, '0')}-01`

        const [resLegacy, res360] = await Promise.all([
          fetch(`/api/organizations/${detail.organizationId}/finance?year=${year}&month=${month}`)
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`/api/organization/${detail.organizationId}/360?facets=finance&asOf=${asOf}`)
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null)
        ])

        if (resLegacy) setData(resLegacy)

        if (res360?.finance) {
          setFinanceYtd({
            revenueYTD: res360.finance.revenueYTD ?? 0,
            invoiceCount: res360.finance.invoiceCount ?? 0,
            outstandingAmount: res360.finance.outstandingAmount ?? 0
          })
        } else {
          setFinanceYtd(null)
        }
      } catch {
        // Non-blocking
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [detail.organizationId, year, month])

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)

  return (
    <Grid container spacing={6}>
      {/* Period selectors */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <CustomTextField
            select
            size='small'
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            sx={{ minWidth: 120 }}
          >
            {MONTH_SHORT.slice(1).map((label, i) => (
              <MenuItem key={i + 1} value={i + 1}>{label}</MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            select
            size='small'
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            sx={{ minWidth: 100 }}
          >
            {years.map(y => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </CustomTextField>
        </Box>
      </Grid>

      {loading ? (
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </Grid>
      ) : !data || data.clientCount === 0 ? (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
                <Typography variant='h6' sx={{ mb: 1 }}>No hay datos financieros para este período</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Calcula la rentabilidad de los Spaces de {detail.organizationName} en la sección de Inteligencia Financiera para ver datos aquí.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ) : (
        <>
          {/* KPI row */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Spaces con datos'
              stats={String(data.clientCount)}
              subtitle={`${MONTH_SHORT[data.periodMonth]} ${data.periodYear}`}
              avatarIcon='tabler-layout-grid'
              avatarColor='info'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Ingreso total'
              stats={formatCLP(data.totalRevenueClp)}
              subtitle='consolidado del período'
              avatarIcon='tabler-cash'
              avatarColor='primary'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Margen bruto prom.'
              stats={formatPercent(data.avgGrossMarginPercent)}
              subtitle='ponderado por ingreso'
              avatarIcon='tabler-trending-up'
              avatarColor={marginColor(data.avgGrossMarginPercent)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Margen neto prom.'
              stats={formatPercent(data.avgNetMarginPercent)}
              subtitle='ponderado por ingreso'
              avatarIcon='tabler-chart-line'
              avatarColor={marginColor(data.avgNetMarginPercent)}
            />
          </Grid>

          {/* 360 YTD supplementary KPIs */}
          {financeYtd ? (
            <>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <HorizontalWithSubtitle
                  title='Ingreso YTD'
                  stats={formatCLP(financeYtd.revenueYTD)}
                  subtitle='acumulado del año (360)'
                  avatarIcon='tabler-report-money'
                  avatarColor='success'
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <HorizontalWithSubtitle
                  title='Documentos emitidos'
                  stats={String(financeYtd.invoiceCount)}
                  subtitle='facturas YTD (360)'
                  avatarIcon='tabler-file-invoice'
                  avatarColor='warning'
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <HorizontalWithSubtitle
                  title='Saldo pendiente'
                  stats={formatCLP(financeYtd.outstandingAmount)}
                  subtitle='por cobrar (360)'
                  avatarIcon='tabler-clock-dollar'
                  avatarColor={financeYtd.outstandingAmount > 0 ? 'error' : 'success'}
                />
              </Grid>
            </>
          ) : null}

          {/* Client breakdown table */}
          <Grid size={{ xs: 12 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader
                title='Rentabilidad por Space'
                subheader={`${MONTH_SHORT[data.periodMonth]} ${data.periodYear} — ${data.clientCount} Space${data.clientCount !== 1 ? 's' : ''}`}
                avatar={
                  <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                    <i className='tabler-report-money' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
                  </Avatar>
                }
              />
              <Divider />
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Space</TableCell>
                      <TableCell align='right'>Ingreso</TableCell>
                      <TableCell align='right'>Costo laboral</TableCell>
                      <TableCell align='right'>C. Directos</TableCell>
                      <TableCell align='right'>C. Indirectos</TableCell>
                      <TableCell align='center'>Margen Bruto</TableCell>
                      <TableCell align='center'>Margen Neto</TableCell>
                      <TableCell align='right'>FTE</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.clients.map(c => (
                      <TableRow key={c.clientId} hover>
                        <TableCell>
                          <Typography variant='body2' fontWeight={600}>{c.clientName}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2'>{formatCLP(c.totalRevenueClp)}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2'>{formatCLP(c.laborCostClp)}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2'>{formatCLP(c.directCostsClp)}</Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2'>{formatCLP(c.indirectCostsClp)}</Typography>
                        </TableCell>
                        <TableCell align='center'>
                          <CustomChip
                            round='true'
                            size='small'
                            variant='tonal'
                            color={marginColor(c.grossMarginPercent)}
                            label={formatPercent(c.grossMarginPercent)}
                          />
                        </TableCell>
                        <TableCell align='center'>
                          <CustomChip
                            round='true'
                            size='small'
                            variant='tonal'
                            color={marginColor(c.netMarginPercent)}
                            label={formatPercent(c.netMarginPercent)}
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2'>
                            {c.headcountFte != null ? c.headcountFte.toFixed(1) : '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>
        </>
      )}
    </Grid>
  )
}

export default OrganizationFinanceTab
