'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

const TASK407_ARIA_CAMBIAR_VISTA_DE_MONEDA = "Cambiar vista de moneda"
const TASK407_ARIA_VER_EN_MONEDA_DEL_CLIENTE = "Ver en moneda del cliente"
const TASK407_ARIA_VER_EN_USD_CANONICAL = "Ver en USD canonical"


interface FxSnapshotPayload {
  quotationId: string
  outputCurrency: string
  status: string
  exchangeSnapshotDate: string | null
  totalPriceOutput: number | null
  totalPriceBase: number | null
  snapshot: {
    version: string
    outputCurrency: string
    baseCurrency: string
    rate: number
    rateDateResolved: string | null
    source: string | null
    composedViaUsd: boolean
    readinessState: string
    stalenessThresholdDays: number
    clientFacingThresholdDays: number
    ageDays: number | null
    frozenAt: string
    domain: string
  } | null
}

type CurrencyView = 'client' | 'base'

const formatMoney = (value: number | null, currency: string): string => {
  if (value === null || !Number.isFinite(value)) return '—'

  const upper = currency.toUpperCase()
  const fractionDigits = upper === 'CLP' || upper === 'COP' ? 0 : 2

  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value)
}

const formatRate = (value: number): string =>
  new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(value)

const formatDate = (iso: string | null): string => {
  if (!iso) return '—'
  const parts = iso.slice(0, 10).split('-')

  if (parts.length !== 3) return iso
  const [y, m, d] = parts

  
return `${d}/${m}/${y}`
}

interface QuoteCurrencyViewProps {
  quotationId: string
  outputCurrency: string
  totalAmountOutput: number | null
}

const QuoteCurrencyView = ({
  quotationId,
  outputCurrency,
  totalAmountOutput
}: QuoteCurrencyViewProps) => {
  const [view, setView] = useState<CurrencyView>('client')
  const [data, setData] = useState<FxSnapshotPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/finance/quotes/${quotationId}/fx-snapshot`)

        if (!res.ok) {
          throw new Error('No pudimos cargar el snapshot FX.')
        }

        const payload = (await res.json()) as FxSnapshotPayload

        if (!cancelled) setData(payload)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No pudimos cargar el snapshot FX.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [quotationId])

  const snapshot = data?.snapshot ?? null

  const hasUsdView =
    snapshot !== null && snapshot.baseCurrency !== snapshot.outputCurrency && snapshot.rate > 0

  const displayCurrency = view === 'base' && hasUsdView ? (snapshot?.baseCurrency ?? 'USD') : outputCurrency.toUpperCase()

  const displayAmount =
    view === 'base' && hasUsdView ? (data?.totalPriceBase ?? null) : (totalAmountOutput ?? data?.totalPriceOutput ?? null)

  return (
    <Card variant='outlined'>
      <CardHeader
        title='Moneda y tipo de cambio'
        subheader='Vista interna — no afecta al documento enviado al cliente.'
        action={
          hasUsdView ? (
            <ToggleButtonGroup
              size='small'
              value={view}
              exclusive
              onChange={(_, next) => {
                if (next) setView(next as CurrencyView)
              }}
              aria-label={TASK407_ARIA_CAMBIAR_VISTA_DE_MONEDA}
            >
              <ToggleButton value='client' aria-label={TASK407_ARIA_VER_EN_MONEDA_DEL_CLIENTE}>
                {outputCurrency.toUpperCase()}
              </ToggleButton>
              <ToggleButton value='base' aria-label={TASK407_ARIA_VER_EN_USD_CANONICAL}>
                {snapshot?.baseCurrency ?? 'USD'}
              </ToggleButton>
            </ToggleButtonGroup>
          ) : null
        }
      />
      <CardContent>
        {loading ? (
          <Stack spacing={1}>
            <Skeleton variant='text' width='60%' />
            <Skeleton variant='text' width='40%' />
          </Stack>
        ) : error ? (
          <Alert severity='warning' variant='outlined'>
            {error}
          </Alert>
        ) : (
          <Stack spacing={2}>
            <Box>
              <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total ({displayCurrency})
              </Typography>
              <Typography variant='h4' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(displayAmount, displayCurrency)}
              </Typography>
            </Box>

            {snapshot ? (
              <Stack direction='row' spacing={2} flexWrap='wrap' rowGap={1} alignItems='center'>
                <Chip
                  size='small'
                  variant='outlined'
                  label={`${snapshot.baseCurrency} 1 = ${snapshot.outputCurrency} ${formatRate(snapshot.rate)}`}
                />
                {snapshot.rateDateResolved ? (
                  <Chip
                    size='small'
                    variant='outlined'
                    label={`Fecha tasa: ${formatDate(snapshot.rateDateResolved)}`}
                  />
                ) : null}
                {snapshot.source ? (
                  <Chip size='small' variant='outlined' label={`Fuente: ${snapshot.source}`} />
                ) : null}
                {snapshot.composedViaUsd ? (
                  <Chip
                    size='small'
                    color='info'
                    variant='outlined'
                    label='Tasa derivada vía USD'
                  />
                ) : null}
                <Chip
                  size='small'
                  variant='outlined'
                  label={`Congelada: ${formatDate(snapshot.frozenAt.slice(0, 10))}`}
                />
              </Stack>
            ) : (
              <Alert severity='info' variant='outlined'>
                Esta cotización no tiene snapshot FX todavía. Se congelará al emitirla.
              </Alert>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

export default QuoteCurrencyView
