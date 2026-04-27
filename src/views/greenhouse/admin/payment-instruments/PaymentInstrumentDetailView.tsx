'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'

import PaymentInstrumentChip from '@/components/greenhouse/PaymentInstrumentChip'
import {
  DEFAULT_FOR_OPTIONS,
  INSTRUMENT_CATEGORY_COLORS,
  INSTRUMENT_CATEGORY_ICONS,
  INSTRUMENT_CATEGORY_LABELS,
  getProvider,
  type InstrumentCategory
} from '@/config/payment-instruments'

type PaymentInstrumentDetail = {
  accountId: string
  accountName: string
  bankName: string | null
  accountNumber: string | null
  accountNumberFull: string | null
  currency: string
  accountType: string
  country: string
  isActive: boolean
  openingBalance: number
  openingBalanceDate: string | null
  notes: string | null
  instrumentCategory: string
  providerSlug: string | null
  providerIdentifier: string | null
  cardLastFour: string | null
  cardNetwork: string | null
  creditLimit: number | null
  responsibleUserId: string | null
  defaultFor: string[]
  displayOrder: number
  metadataJson: Record<string, unknown>
  createdAt: string | null
  updatedAt: string | null
}

type Props = {
  accountId: string
}

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeZone: 'America/Santiago'
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Santiago'
})

const formatDate = (value: string | null) => {
  if (!value) return '-'

  try {
    return dateFormatter.format(new Date(value))
  } catch {
    return '-'
  }
}

const formatDateTime = (value: string | null) => {
  if (!value) return '-'

  try {
    return dateTimeFormatter.format(new Date(value))
  } catch {
    return '-'
  }
}

const formatCurrency = (amount: number | null | undefined, currency: string) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2
  }).format(Number(amount ?? 0))

const maskIdentifier = (value: string | null | undefined) => {
  if (!value) return '-'

  const visible = value.replace(/\s+/g, '').slice(-4)

  return visible ? `•••• ${visible}` : '••••'
}

const labelDefaultFor = (value: string) => DEFAULT_FOR_OPTIONS.find(option => option.value === value)?.label ?? value

const isSafeMetadataValue = (value: unknown): value is string | number | boolean =>
  ['string', 'number', 'boolean'].includes(typeof value)

const DetailRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <Stack spacing={0.5}>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='body2' sx={{ overflowWrap: 'anywhere' }}>
      {value === null || value === undefined || value === '' ? '-' : value}
    </Typography>
  </Stack>
)

const PaymentInstrumentDetailView = ({ accountId }: Props) => {
  const [detail, setDetail] = useState<PaymentInstrumentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const loadDetail = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotFound(false)

    try {
      const response = await fetch(`/api/admin/payment-instruments/${encodeURIComponent(accountId)}`, {
        cache: 'no-store'
      })

      if (response.status === 404) {
        setDetail(null)
        setNotFound(true)

        return
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))

        setError(body.error ?? `No se pudo cargar el instrumento (HTTP ${response.status}).`)

        return
      }

      setDetail(await response.json())
    } catch {
      setError('No se pudo conectar con el servidor. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  const category = (detail?.instrumentCategory || 'bank_account') as InstrumentCategory
  const provider = getProvider(detail?.providerSlug)

  const metadataEntries = useMemo(
    () =>
      Object.entries(detail?.metadataJson ?? {})
        .filter(([, value]) => isSafeMetadataValue(value))
        .slice(0, 8),
    [detail?.metadataJson]
  )

  if (loading) {
    return (
      <Grid container spacing={6} role='status' aria-live='polite' aria-label='Cargando detalle del instrumento de pago'>
        <Grid size={{ xs: 12 }}>
          <Stack spacing={1}>
            <Skeleton variant='text' width={280} height={28} />
            <Skeleton variant='text' width={420} height={36} />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <CardContent>
              <Stack spacing={4} alignItems='center'>
                <Skeleton variant='rounded' width={72} height={72} />
                <Stack spacing={1} alignItems='center' sx={{ width: '100%' }}>
                  <Skeleton variant='text' width='70%' height={32} />
                  <Skeleton variant='text' width='45%' height={22} />
                </Stack>
                <Divider flexItem />
                <Grid container spacing={4} sx={{ width: '100%' }}>
                  {[0, 1, 2, 3].map(index => (
                    <Grid key={index} size={{ xs: 6 }}>
                      <Skeleton variant='text' width='45%' height={18} />
                      <Skeleton variant='text' width='85%' height={24} />
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={6}>
            {[0, 1].map(index => (
              <Card key={index} elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
                <CardHeader
                  title={<Skeleton variant='text' width={220} height={28} />}
                  subheader={<Skeleton variant='text' width={360} height={22} />}
                />
                <Divider />
                <CardContent>
                  <Grid container spacing={4}>
                    {[0, 1, 2, 3, 4, 5].map(row => (
                      <Grid key={row} size={{ xs: 12, md: 6 }}>
                        <Skeleton variant='text' width='40%' height={18} />
                        <Skeleton variant='text' width='80%' height={24} />
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>
      </Grid>
    )
  }

  if (notFound) {
    return (
      <Stack spacing={4}>
        <Breadcrumbs>
          <Typography component={Link} href='/admin' color='inherit'>
            Admin Center
          </Typography>
          <Typography component={Link} href='/admin/payment-instruments' color='inherit'>
            Instrumentos de pago
          </Typography>
          <Typography color='text.primary'>{accountId}</Typography>
        </Breadcrumbs>

        <Alert
          severity='warning'
          action={
            <Button component={Link} href='/admin/payment-instruments' color='inherit' size='small'>
              Volver
            </Button>
          }
        >
          No encontramos un instrumento de pago con el identificador {accountId}.
        </Alert>
      </Stack>
    )
  }

  if (error || !detail) {
    return (
      <Stack spacing={4}>
        <Breadcrumbs>
          <Typography component={Link} href='/admin' color='inherit'>
            Admin Center
          </Typography>
          <Typography component={Link} href='/admin/payment-instruments' color='inherit'>
            Instrumentos de pago
          </Typography>
          <Typography color='text.primary'>{accountId}</Typography>
        </Breadcrumbs>

        <Alert
          severity='error'
          action={
            <Button color='inherit' size='small' onClick={() => void loadDetail()}>
              Reintentar
            </Button>
          }
        >
          {error ?? 'No se pudo cargar el instrumento de pago.'}
        </Alert>
      </Stack>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Breadcrumbs>
          <Typography component={Link} href='/admin' color='inherit'>
            Admin Center
          </Typography>
          <Typography component={Link} href='/admin/payment-instruments' color='inherit'>
            Instrumentos de pago
          </Typography>
          <Typography color='text.primary'>{detail.accountName}</Typography>
        </Breadcrumbs>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} justifyContent='space-between'>
          <Stack spacing={2}>
            <PaymentInstrumentChip
              providerSlug={detail.providerSlug}
              instrumentName={detail.accountName}
              instrumentCategory={category}
              size='md'
            />
            <Stack direction='row' spacing={2} useFlexGap flexWrap='wrap'>
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color={detail.isActive ? 'success' : 'secondary'}
                label={detail.isActive ? 'Activo' : 'Inactivo'}
              />
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color={INSTRUMENT_CATEGORY_COLORS[category] ?? 'secondary'}
                label={INSTRUMENT_CATEGORY_LABELS[category] ?? detail.instrumentCategory}
              />
              <CustomChip round='true' size='small' variant='tonal' color='info' label={detail.currency} />
            </Stack>
          </Stack>

          <Button component={Link} href='/admin/payment-instruments' variant='tonal' startIcon={<i className='tabler-arrow-left' />}>
            Volver a instrumentos
          </Button>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardContent>
            <Stack spacing={4} alignItems='center'>
              <CustomAvatar skin='light' color={INSTRUMENT_CATEGORY_COLORS[category] ?? 'primary'} size={72} variant='rounded'>
                <i className={INSTRUMENT_CATEGORY_ICONS[category] ?? 'tabler-credit-card'} style={{ fontSize: 34 }} />
              </CustomAvatar>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant='h5'>{detail.accountName}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {provider?.name ?? detail.bankName ?? 'Proveedor no configurado'}
                </Typography>
              </Box>

              <Divider flexItem />

              <Grid container spacing={4} sx={{ width: '100%' }}>
                <Grid size={{ xs: 6 }}>
                  <DetailRow label='ID canonico' value={detail.accountId} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <DetailRow label='Pais' value={detail.country} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <DetailRow label='Tipo contable' value={detail.accountType} />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <DetailRow label='Orden' value={detail.displayOrder} />
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <Stack spacing={6}>
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <CardHeader title='Datos operativos' subheader='Configuracion visible para flujos de caja, cobros y pagos.' />
            <Divider />
            <CardContent>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DetailRow label='Proveedor' value={provider?.name ?? detail.providerSlug ?? detail.bankName} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DetailRow label='Identificador proveedor' value={maskIdentifier(detail.providerIdentifier)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DetailRow label='Cuenta visible' value={maskIdentifier(detail.accountNumber ?? detail.accountNumberFull)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DetailRow label='Tarjeta' value={detail.cardLastFour ? `•••• ${detail.cardLastFour}` : '-'} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DetailRow label='Red tarjeta' value={detail.cardNetwork} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DetailRow
                    label='Limite credito'
                    value={detail.creditLimit === null ? '-' : formatCurrency(detail.creditLimit, detail.currency)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DetailRow label='Saldo apertura' value={formatCurrency(detail.openingBalance, detail.currency)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DetailRow label='Fecha apertura' value={formatDate(detail.openingBalanceDate)} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <CardHeader title='Ruteo y gobierno' subheader='Uso por defecto y trazabilidad administrativa del instrumento.' />
            <Divider />
            <CardContent>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12 }}>
                  <Stack spacing={1}>
                    <Typography variant='caption' color='text.secondary'>
                      Default para
                    </Typography>
                    {detail.defaultFor.length > 0 ? (
                      <Stack direction='row' spacing={1.5} useFlexGap flexWrap='wrap'>
                        {detail.defaultFor.map(value => (
                          <CustomChip key={value} round='true' size='small' variant='tonal' color='primary' label={labelDefaultFor(value)} />
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant='body2'>-</Typography>
                    )}
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DetailRow label='Responsable' value={detail.responsibleUserId} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DetailRow label='Actualizado' value={formatDateTime(detail.updatedAt)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DetailRow label='Creado' value={formatDateTime(detail.createdAt)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DetailRow label='Notas' value={detail.notes} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {metadataEntries.length > 0 ? (
            <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
              <CardHeader title='Metadata segura' subheader='Valores simples guardados en el catalogo del instrumento.' />
              <Divider />
              <CardContent>
                <Grid container spacing={4}>
                  {metadataEntries.map(([key, value]) => (
                    <Grid key={key} size={{ xs: 12, md: 6 }}>
                      <DetailRow label={key} value={String(value)} />
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          ) : null}
        </Stack>
      </Grid>
    </Grid>
  )
}

export default PaymentInstrumentDetailView
