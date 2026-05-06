'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import type { VatLedgerEntry, VatMonthlyPosition } from './vat-monthly-position-types'
import { getMicrocopy } from '@/lib/copy'

const GREENHOUSE_COPY = getMicrocopy()

const formatCLP = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const formatPeriodLabel = (periodId: string) => {
  const [year, month] = periodId.split('-')
  const monthIndex = Number(month)
  const monthLabels = ['', ...GREENHOUSE_COPY.months.short]

  return `${monthLabels[monthIndex] ?? periodId} ${year}`
}

const buildStatusMeta = (netAmount: number) => {
  if (netAmount > 0) {
    return {
      label: 'IVA por pagar',
      color: 'warning' as const,
      helper: 'El débito fiscal supera el crédito recuperable del período.'
    }
  }

  if (netAmount < 0) {
    return {
      label: 'Crédito a favor',
      color: 'success' as const,
      helper: 'El crédito fiscal recuperable supera el débito del período.'
    }
  }

  return {
    label: 'Saldo equilibrado',
    color: 'info' as const,
    helper: 'Débito y crédito fiscal quedaron compensados en este corte.'
  }
}

const SummaryMetric = ({
  label,
  value,
  tone
}: {
  label: string
  value: number
  tone: 'success' | 'warning' | 'error' | 'info'
}) => (
  <Box
    sx={{
      p: 3,
      borderRadius: 2,
      border: theme => `1px solid ${theme.palette.divider}`,
      bgcolor: `${tone}.lightOpacity`
    }}
  >
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='h6' sx={{ mt: 1, fontWeight: 600 }}>
      {formatCLP(value)}
    </Typography>
  </Box>
)

const LoadingState = () => (
  <Grid container spacing={4}>
    {[0, 1, 2, 3].map(item => (
      <Grid key={item} size={{ xs: 12, md: 3 }}>
        <Skeleton variant='rounded' height={92} />
      </Grid>
    ))}
    <Grid size={{ xs: 12 }}>
      <Skeleton variant='rounded' height={180} />
    </Grid>
  </Grid>
)

const VatMonthlyPositionCard = ({
  loading,
  position,
  recentPositions,
  entries
}: {
  loading: boolean
  position: VatMonthlyPosition | null
  recentPositions: VatMonthlyPosition[]
  entries: VatLedgerEntry[]
}) => {
  if (loading) {
    return (
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title='Posición IVA del mes'
          subheader='Cargando débito, crédito y saldo fiscal del período'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'secondary.lightOpacity' }}>
              <i className='tabler-receipt-tax' style={{ fontSize: 22, color: 'var(--mui-palette-secondary-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <CardContent>
          <LoadingState />
        </CardContent>
      </Card>
    )
  }

  if (!position) {
    return null
  }

  const statusMeta = buildStatusMeta(position.netVatPositionClp)
  const exportHref = `/api/finance/vat/monthly-position?year=${position.periodYear}&month=${position.periodMonth}&format=csv`

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardHeader
        title='Posición IVA del mes'
        subheader={`${formatPeriodLabel(position.periodId)} · Débito, crédito recuperable y saldo tributario materializado`}
        avatar={
          <Avatar variant='rounded' sx={{ bgcolor: 'secondary.lightOpacity' }}>
            <i className='tabler-receipt-tax' style={{ fontSize: 22, color: 'var(--mui-palette-secondary-main)' }} />
          </Avatar>
        }
        action={
          <Button
            variant='outlined'
            size='small'
            component='a'
            href={exportHref}
          >
            Exportar CSV
          </Button>
        }
      />
      <Divider />
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Box
          sx={{
            p: 3,
            borderRadius: 2,
            border: theme => `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box>
            <Typography variant='caption' color='text.secondary'>
              Saldo del período
            </Typography>
            <Typography variant='h5' sx={{ mt: 1, fontWeight: 700 }}>
              {formatCLP(position.netVatPositionClp)}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              {statusMeta.helper}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', md: 'flex-end' }, gap: 1 }}>
            <Chip label={statusMeta.label} color={statusMeta.color} />
            <Typography variant='caption' color='text.secondary'>
              {position.materializedAt
                ? `Actualizado ${new Date(position.materializedAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}`
                : 'Pendiente de materializar'}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 3 }}>
            <SummaryMetric label='Débito fiscal ventas' value={position.debitFiscalAmountClp} tone='warning' />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <SummaryMetric label='Crédito fiscal compras' value={position.creditFiscalAmountClp} tone='success' />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <SummaryMetric label='IVA no recuperable' value={position.nonRecoverableVatAmountClp} tone='error' />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <SummaryMetric label='Asientos del ledger' value={position.ledgerEntryCount} tone='info' />
          </Grid>
        </Grid>

        {entries.length === 0 ? (
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              border: theme => `1px dashed ${theme.palette.divider}`,
              bgcolor: 'action.hover'
            }}
          >
            <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
              Sin movimientos con IVA materializados
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              Este período no tiene documentos con débito fiscal ni crédito fiscal recuperable para el `space` activo.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 2 }}>
                Buckets del período
              </Typography>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Bucket</TableCell>
                    <TableCell>Documento</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell align='right'>Monto CLP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.slice(0, 6).map(entry => (
                    <TableRow key={entry.ledgerEntryId}>
                      <TableCell>
                        <Chip
                          size='small'
                          variant='outlined'
                          color={entry.vatBucket === 'debit_fiscal' ? 'warning' : entry.vatBucket === 'credito_fiscal' ? 'success' : 'error'}
                          label={entry.vatBucket === 'debit_fiscal'
                            ? 'Débito fiscal'
                            : entry.vatBucket === 'credito_fiscal'
                              ? 'Crédito fiscal'
                              : 'IVA no recuperable'}
                        />
                      </TableCell>
                      <TableCell>{entry.sourcePublicRef || entry.sourceId}</TableCell>
                      <TableCell>{new Date(entry.sourceDate).toLocaleDateString('es-CL')}</TableCell>
                      <TableCell align='right'>{formatCLP(entry.amountClp)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 2 }}>
                Últimos períodos materializados
              </Typography>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Período</TableCell>
                    <TableCell align='right'>Saldo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentPositions.slice(0, 5).map(item => (
                    <TableRow key={item.vatPositionId}>
                      <TableCell>{formatPeriodLabel(item.periodId)}</TableCell>
                      <TableCell align='right'>{formatCLP(item.netVatPositionClp)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  )
}

export default VatMonthlyPositionCard
