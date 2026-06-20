'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import type {
  F29ConsolidatedPayload,
  F29PpmLine,
  F29RetentionLine,
  F29VatLine
} from './f29-consolidated-position-types'
import { getMicrocopy } from '@/lib/copy'
import { GH_F29_CONSOLIDATED } from '@/lib/copy/finance'
import {
  formatCurrency as formatGreenhouseCurrency,
  formatNumber as formatGreenhouseNumber,
  formatPercent as formatGreenhousePercent
} from '@/lib/format'

const COPY = GH_F29_CONSOLIDATED
const GREENHOUSE_COPY = getMicrocopy()

const formatCLP = (amount: number) =>
  formatGreenhouseCurrency(amount, 'CLP', { maximumFractionDigits: 0 }, 'es-CL')

const formatRate = (rate: number) =>
  formatGreenhousePercent(rate, { input: 'ratio', maximumFractionDigits: 3 }, 'es-CL')

const formatPeriodLabel = (periodId: string) => {
  const [year, month] = periodId.split('-')
  const monthLabels = ['', ...GREENHOUSE_COPY.months.short]

  return `${monthLabels[Number(month)] ?? periodId} ${year}`
}

/** Monto tabular alineado a la derecha; tabular-nums para columnas legibles. */
const Amount = ({ value }: { value: number }) => (
  <Typography variant='h5' sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
    {formatCLP(value)}
  </Typography>
)

/** Badge oficial vs shadow: texto + color (nunca solo color, a11y). */
const EnablementBadge = ({ official }: { official: boolean }) => {
  if (official) {
    return <Chip size='small' color='success' variant='tonal' label={COPY.badgeOfficial} />
  }

  return (
    <Tooltip title={COPY.shadowTooltip}>
      <Chip size='small' color='warning' variant='outlined' label={COPY.badgeShadow} />
    </Tooltip>
  )
}

/**
 * Fila de una línea del F29. `value === null` → degradación honesta ("Sin datos
 * del período", NO $0). Layout: label + helper + badge a la izquierda; monto +
 * sub-detalle a la derecha. Colapsa a columna en compacto.
 */
const F29LineRow = ({
  label,
  helper,
  official,
  value,
  subDetail
}: {
  label: string
  helper: string
  official: boolean
  value: number | null
  subDetail: string | null
}) => (
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
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <EnablementBadge official={official} />
      </Box>
      <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
        {helper}
      </Typography>
    </Box>
    <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
      {value === null ? (
        <>
          <Typography variant='subtitle2' sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {COPY.lineNoData}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {COPY.lineNoDataHelper}
          </Typography>
        </>
      ) : (
        <>
          <Amount value={value} />
          {subDetail ? (
            <Typography variant='caption' color='text.secondary'>
              {subDetail}
            </Typography>
          ) : null}
        </>
      )}
    </Box>
  </Box>
)

const buildVatSubDetail = (vat: F29VatLine) => {
  if (vat.netVatPositionClp > 0) return COPY.vatNetDebit
  if (vat.netVatPositionClp < 0) return COPY.vatNetCredit

  return COPY.vatNetEven
}

const buildRetentionSubDetail = (retention: F29RetentionLine) =>
  `${COPY.retentionDocsLabel}: ${formatGreenhouseNumber(retention.documentCount, {}, 'es-CL')}`

const buildPpmSubDetail = (ppm: F29PpmLine) => `${COPY.ppmRateLabel}: ${formatRate(ppm.ppmRate)}`

const CardShell = ({
  subheader,
  avatarTone = 'secondary',
  children
}: {
  subheader: string
  avatarTone?: 'secondary' | 'warning'
  children: React.ReactNode
}) => (
  <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
    <CardHeader
      title={COPY.cardTitle}
      subheader={subheader}
      avatar={
        <Avatar variant='rounded' sx={{ bgcolor: `${avatarTone}.lightOpacity` }}>
          <i className='tabler-file-invoice' style={{ fontSize: 22, color: `var(--mui-palette-${avatarTone}-main)` }} />
        </Avatar>
      }
    />
    <Divider />
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</CardContent>
  </Card>
)

/**
 * TASK-1197 — Card de la posición F29 mensual consolidada. Cliente puro del
 * contrato gobernado `GET /api/finance/f29/monthly-position` (TASK-1195): NO
 * recomputa ni reagrega; cada línea es la cifra que el reader canónico expone.
 * Propaga `enabledByLine` (oficial vs shadow) y degrada honesto por línea.
 */
const F29ConsolidatedPositionCard = ({
  loading,
  payload,
  error = null,
  onRetry
}: {
  loading: boolean
  payload: F29ConsolidatedPayload | null
  /** Degradación honesta local: el fallo del fetch se muestra acá, sin prosa cruda del backend. */
  error?: string | null
  onRetry?: () => void
}) => {
  if (loading) {
    return (
      <CardShell subheader={COPY.cardSubtitleLoading}>
        {[0, 1, 2].map(item => (
          <Skeleton key={item} variant='rounded' height={88} />
        ))}
      </CardShell>
    )
  }

  if (error || !payload) {
    if (!error) return null

    return (
      <CardShell subheader={GREENHOUSE_COPY.empty.noData} avatarTone='warning'>
        <Box
          role='status'
          sx={{
            p: 3,
            borderRadius: 2,
            border: theme => `1px dashed ${theme.palette.divider}`,
            bgcolor: 'action.hover',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box>
            <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
              {COPY.errorTitle}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              {error}
            </Typography>
          </Box>
          {onRetry ? (
            <Button variant='outlined' size='small' onClick={onRetry}>
              {GREENHOUSE_COPY.actions.retry}
            </Button>
          ) : null}
        </Box>
      </CardShell>
    )
  }

  const { vat, retention, ppm, enabledByLine, legalEntity, periodId } = payload
  const subheader = `${formatPeriodLabel(periodId)} · ${legalEntity.legalName} · ${COPY.cardSubtitle}`

  return (
    <CardShell subheader={subheader}>
      <F29LineRow
        label={COPY.vatLabel}
        helper={COPY.vatHelper}
        official={enabledByLine.vat}
        value={vat ? vat.netVatPositionClp : null}
        subDetail={vat ? buildVatSubDetail(vat) : null}
      />
      <F29LineRow
        label={COPY.retentionLabel}
        helper={COPY.retentionHelper}
        official={enabledByLine.retention}
        value={retention ? retention.totalRetentionAmountClp : null}
        subDetail={retention ? buildRetentionSubDetail(retention) : null}
      />
      <F29LineRow
        label={COPY.ppmLabel}
        helper={COPY.ppmHelper}
        official={enabledByLine.ppm}
        value={ppm ? ppm.ppmAmountClp : null}
        subDetail={ppm ? buildPpmSubDetail(ppm) : null}
      />
    </CardShell>
  )
}

export default F29ConsolidatedPositionCard
