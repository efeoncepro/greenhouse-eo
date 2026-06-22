'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

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

const padMonth = (month: number) => String(month).padStart(2, '0')

const formatPeriodLabel = (periodId: string) => {
  const [year, month] = periodId.split('-')
  const monthLabels = ['', ...GREENHOUSE_COPY.months.short]

  return `${monthLabels[Number(month)] ?? periodId} ${year}`
}

export interface F29Period {
  year: number
  month: number
}

const periodKey = (p: F29Period) => `${p.year}-${padMonth(p.month)}`
const samePeriod = (a: F29Period, b: F29Period) => a.year === b.year && a.month === b.month

/** TASK-1207 — Últimos N meses terminando en `latest` (cliente, sin Date.now en SoT). */
const buildPeriodOptions = (latest: F29Period, count = 12): F29Period[] => {
  const options: F29Period[] = []
  let { year, month } = latest

  for (let i = 0; i < count; i++) {
    options.push({ year, month })
    month -= 1

    if (month === 0) {
      month = 12
      year -= 1
    }
  }

  return options
}

type F29TotalStatus = 'official' | 'provisional' | 'none'

/**
 * TASK-1207 — Total F29 a pagar = suma simple de los 3 montos del VM (NO recalcula
 * ninguna posición). Estado honesto: `official` solo si las 3 líneas están presentes
 * y oficiales; `provisional` si alguna está en shadow o falta materializar.
 */
const buildF29Total = (payload: F29ConsolidatedPayload) => {
  const lines = [
    { present: payload.vat != null, official: payload.enabledByLine.vat, amount: payload.vat?.netVatPositionClp ?? 0 },
    {
      present: payload.retention != null,
      official: payload.enabledByLine.retention,
      amount: payload.retention?.totalRetentionAmountClp ?? 0
    },
    { present: payload.ppm != null, official: payload.enabledByLine.ppm, amount: payload.ppm?.ppmAmountClp ?? 0 }
  ]

  const presentLines = lines.filter(line => line.present)
  const total = presentLines.reduce((sum, line) => sum + line.amount, 0)
  const anyMissing = lines.some(line => !line.present)
  const anyShadow = presentLines.some(line => !line.official)

  let status: F29TotalStatus = 'provisional'

  if (presentLines.length === 0) status = 'none'
  else if (!anyShadow && !anyMissing) status = 'official'

  return { total, status, anyMissing, hasData: presentLines.length > 0 }
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

/**
 * TASK-1207 — Fila destacada con el total a pagar del F29. Marca el estado
 * honesto (oficial vs provisional) y nota si falta materializar alguna línea.
 */
const F29TotalRow = ({ payload }: { payload: F29ConsolidatedPayload }) => {
  const { total, status, anyMissing, hasData } = buildF29Total(payload)

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        border: theme => `1px solid ${theme.palette.primary.main}`,
        bgcolor: 'primary.lightOpacity',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
            {COPY.totalLabel}
          </Typography>
          {status === 'official' ? (
            <Chip size='small' color='success' variant='tonal' label={COPY.totalOfficial} />
          ) : status === 'provisional' ? (
            <Tooltip title={anyMissing ? COPY.totalIncompleteNote : COPY.totalProvisionalNote}>
              <Chip size='small' color='warning' variant='outlined' label={COPY.totalProvisional} />
            </Tooltip>
          ) : null}
        </Box>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
          {status === 'provisional' ? (anyMissing ? COPY.totalIncompleteNote : COPY.totalProvisionalNote) : COPY.totalHelper}
        </Typography>
      </Box>
      <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
        {hasData ? (
          <Typography variant='kpiValue' sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatCLP(total)}
          </Typography>
        ) : (
          <Typography variant='subtitle2' sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {COPY.totalNoData}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

/**
 * TASK-1207 — Selector de período del F29. Distingue mes en curso (proyección)
 * de mes cerrado (a declarar). Reusa CustomTextField (Vuexy), no inventa primitive.
 */
const PeriodSelector = ({
  selected,
  current,
  onChange
}: {
  selected: F29Period
  current: F29Period
  onChange: (period: F29Period) => void
}) => {
  // Lista terminando en el mes más reciente entre current y selected (por si el
  // seleccionado fuese futuro respecto al período vigente del endpoint).
  const latest = periodKey(selected) > periodKey(current) ? selected : current
  const options = buildPeriodOptions(latest, 12)

  return (
    <CustomTextField
      select
      size='small'
      label={COPY.periodSelectorLabel}
      value={periodKey(selected)}
      onChange={event => {
        const [year, month] = event.target.value.split('-').map(Number)

        onChange({ year, month })
      }}
      sx={{ minWidth: 200 }}
    >
      {options.map(option => {
        const isCurrent = samePeriod(option, current)

        return (
          <MenuItem key={periodKey(option)} value={periodKey(option)}>
            {formatPeriodLabel(periodKey(option))} · {isCurrent ? COPY.periodCurrentHint : COPY.periodClosedHint}
          </MenuItem>
        )
      })}
    </CustomTextField>
  )
}

const CardShell = ({
  subheader,
  avatarTone = 'secondary',
  action,
  children
}: {
  subheader: string
  avatarTone?: 'secondary' | 'warning'
  action?: React.ReactNode
  children: React.ReactNode
}) => (
  <Card elevation={0} data-capture='f29-consolidated-card' sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
    <CardHeader
      title={COPY.cardTitle}
      subheader={subheader}
      action={action}
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
  onRetry,
  currentPeriod,
  onPeriodChange
}: {
  loading: boolean
  payload: F29ConsolidatedPayload | null
  /** Degradación honesta local: el fallo del fetch se muestra acá, sin prosa cruda del backend. */
  error?: string | null
  onRetry?: () => void
  /** TASK-1207 — período vigente del endpoint (para distinguir proyección vs a declarar). */
  currentPeriod?: F29Period
  /** TASK-1207 — cambio de período en el selector (refetch con year/month). */
  onPeriodChange?: (period: F29Period) => void
}) => {
  // Selector visible cuando hay payload (sabemos el período seleccionado) + callback + período vigente.
  const periodSelector =
    payload && currentPeriod && onPeriodChange ? (
      <PeriodSelector
        selected={{ year: payload.year, month: payload.month }}
        current={currentPeriod}
        onChange={onPeriodChange}
      />
    ) : undefined

  if (loading) {
    return (
      <CardShell subheader={COPY.cardSubtitleLoading} action={periodSelector}>
        {[0, 1, 2].map(item => (
          <Skeleton key={item} variant='rounded' height={88} />
        ))}
      </CardShell>
    )
  }

  if (error || !payload) {
    if (!error) return null

    return (
      <CardShell subheader={GREENHOUSE_COPY.empty.noData} avatarTone='warning' action={periodSelector}>
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
  const isCurrent = currentPeriod ? samePeriod({ year: payload.year, month: payload.month }, currentPeriod) : false
  const periodHint = isCurrent ? COPY.periodCurrentHint : COPY.periodClosedHint
  const subheader = `${formatPeriodLabel(periodId)} · ${periodHint} · ${legalEntity.legalName}`

  return (
    <CardShell subheader={subheader} action={periodSelector}>
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
      <F29TotalRow payload={payload} />
    </CardShell>
  )
}

export default F29ConsolidatedPositionCard
