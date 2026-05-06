'use client'

import { useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import Grid from '@mui/material/Grid'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import { EmptyState, ExecutiveCardShell, MetricList } from '@/components/greenhouse'

const TASK407_COPY_GASTO_FINANCIERO_OBSERVADO = "Gasto financiero observado"
const TASK407_COPY_SUSCRIPCIONES_MODELADAS = "Suscripciones modeladas"
const TASK407_COPY_USO_POR_CREDITOS = "Uso por créditos"
const TASK407_COPY_EXPOSICION_DE_PAYROLL = "Exposición de payroll"


export interface SupplierProviderToolingSnapshot {
  providerId: string
  providerName: string
  providerType: string | null
  supplierCategory: string | null
  paymentCurrency: string | null
  periodId: string
  toolCount: number
  activeToolCount: number
  activeLicenseCount: number
  activeMemberCount: number
  walletCount: number
  activeWalletCount: number
  subscriptionCostTotalClp: number
  usageCostTotalClp: number
  financeExpenseCount: number
  financeExpenseTotalClp: number
  payrollMemberCount: number
  licensedMemberPayrollCostClp: number
  totalProviderCostClp: number
  latestExpenseDate: string | null
  latestLicenseChangeAt: string | null
  snapshotStatus: string
  materializedAt: string | null
}

type Props = {
  supplierId: string
  supplierName: string
  providerId: string | null
  providerTooling: SupplierProviderToolingSnapshot | null
  onLinkProvider?: () => Promise<void>
  linkingProvider?: boolean
}

const formatClp = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(value)

const formatDate = (value: string | null) => {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value))
}

const formatTimestamp = (value: string | null) => {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

const titleCase = (value: string | null) => {
  if (!value) return '—'

  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

const SupplierProviderToolingTab = ({ supplierId, supplierName, providerId, providerTooling, onLinkProvider, linkingProvider = false }: Props) => {
  const [linkError, setLinkError] = useState<string | null>(null)

  const handleLinkProvider = async () => {
    if (!onLinkProvider) {
      return
    }

    try {
      setLinkError(null)
      await onLinkProvider()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos crear el vínculo canónico.'

      setLinkError(message)
    }
  }

  if (!providerId) {
    return (
      <Stack spacing={3}>
        {linkError ? <Alert severity='error'>{linkError}</Alert> : null}
        <EmptyState
          icon='tabler-link-off'
          title='Sin vínculo canónico de provider'
          description='Este supplier existe en Finanzas, pero todavía no está enlazado al objeto provider canónico. Sin ese vínculo no podemos consolidar tooling, costos proyectados ni exposición de payroll.'
          action={
            onLinkProvider ? (
              <Button variant='contained' size='small' onClick={handleLinkProvider} disabled={linkingProvider}>
                {linkingProvider ? 'Vinculando...' : 'Crear vínculo canónico'}
              </Button>
            ) : undefined
          }
        />
      </Stack>
    )
  }

  if (!providerTooling) {
    return (
      <EmptyState
        icon='tabler-database-off'
        title='Provider enlazado, pero sin snapshot operativo'
        description='El vínculo canónico existe, pero todavía no hay una proyección materializada para este provider. Cuando corra el flujo reactivo, aquí aparecerá la lectura consolidada de tooling, costos y payroll.'
        action={
          <Button component={Link} href='/admin/ai-tools' variant='outlined' size='small'>
            Revisar AI Tooling
          </Button>
        }
      />
    )
  }

  return (
    <Stack spacing={4}>
      <Alert severity='info' variant='outlined'>
        <Typography variant='body2' fontWeight={600}>
          Vista consolidada por provider canónico
        </Typography>
        <Typography variant='body2'>
          Esta lectura combina gasto financiero observado, costos de tooling modelados y exposición de payroll. El período visible es {providerTooling.periodId} y no debe interpretarse como tiempo real continuo.
        </Typography>
      </Alert>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <HorizontalWithSubtitle
            title='Costo total'
            stats={formatClp(providerTooling.totalProviderCostClp)}
            subtitle={`Período ${providerTooling.periodId}`}
            avatarIcon='tabler-cash-banknote'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <HorizontalWithSubtitle
            title='Herramientas activas'
            stats={String(providerTooling.activeToolCount)}
            subtitle={`${providerTooling.toolCount} registradas en total`}
            avatarIcon='tabler-tools'
            avatarColor='warning'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <HorizontalWithSubtitle
            title='Licencias activas'
            stats={String(providerTooling.activeLicenseCount)}
            subtitle={`${providerTooling.activeMemberCount} personas con acceso`}
            avatarIcon='tabler-key'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <HorizontalWithSubtitle
            title='Wallets activas'
            stats={String(providerTooling.activeWalletCount)}
            subtitle={`${providerTooling.walletCount} wallets totales`}
            avatarIcon='tabler-wallet'
            avatarColor='success'
          />
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <ExecutiveCardShell
            title='Composición de costo'
            subtitle='Costo observado y modelado que hoy converge en este provider.'
          >
            <MetricList
              items={[
                {
                  label: TASK407_COPY_GASTO_FINANCIERO_OBSERVADO,
                  value: formatClp(providerTooling.financeExpenseTotalClp),
                  detail: `${providerTooling.financeExpenseCount} egresos asociados a ${supplierName}.`
                },
                {
                  label: TASK407_COPY_SUSCRIPCIONES_MODELADAS,
                  value: formatClp(providerTooling.subscriptionCostTotalClp),
                  detail: `${providerTooling.activeLicenseCount} licencias activas con costo recurrente proyectado.`
                },
                {
                  label: TASK407_COPY_USO_POR_CREDITOS,
                  value: formatClp(providerTooling.usageCostTotalClp),
                  detail: `${providerTooling.activeWalletCount} wallets activas con consumo imputado al período.`
                },
                {
                  label: TASK407_COPY_EXPOSICION_DE_PAYROLL,
                  value: formatClp(providerTooling.licensedMemberPayrollCostClp),
                  detail: `${providerTooling.payrollMemberCount} personas con costo empresa vinculadas al uso del provider.`
                }
              ]}
            />
          </ExecutiveCardShell>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <ExecutiveCardShell
            title='Cobertura y proveniencia'
            subtitle='Contexto para leer el snapshot sin sobreprometer precisión.'
          >
            <Stack spacing={3}>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                <CustomChip
                  round='true'
                  size='small'
                  variant='tonal'
                  color='primary'
                  label={`Provider ${providerTooling.providerId}`}
                />
                <CustomChip
                  round='true'
                  size='small'
                  variant='tonal'
                  color='secondary'
                  label={titleCase(providerTooling.providerType)}
                />
                <CustomChip
                  round='true'
                  size='small'
                  variant='tonal'
                  color='success'
                  label={titleCase(providerTooling.snapshotStatus)}
                />
              </Stack>

              <Box>
                <Typography variant='caption' color='text.disabled' sx={{ textTransform: 'uppercase' }}>
                  Alcance operativo
                </Typography>
                <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                  <Typography variant='body2'>
                    Supplier fuente: <strong>{supplierId}</strong>
                  </Typography>
                  <Typography variant='body2'>
                    Categoría supplier: <strong>{titleCase(providerTooling.supplierCategory)}</strong>
                  </Typography>
                  <Typography variant='body2'>
                    Moneda de pago base: <strong>{providerTooling.paymentCurrency ?? '—'}</strong>
                  </Typography>
                  <Typography variant='body2'>
                    Último gasto detectado: <strong>{formatDate(providerTooling.latestExpenseDate)}</strong>
                  </Typography>
                  <Typography variant='body2'>
                    Último cambio de licencia: <strong>{formatTimestamp(providerTooling.latestLicenseChangeAt)}</strong>
                  </Typography>
                  <Typography variant='body2'>
                    Materializado: <strong>{formatTimestamp(providerTooling.materializedAt)}</strong>
                  </Typography>
                </Stack>
              </Box>

              <Button component={Link} href='/admin/ai-tools' variant='text' sx={{ alignSelf: 'flex-start', px: 0 }}>
                Abrir AI Tooling
              </Button>
            </Stack>
          </ExecutiveCardShell>
        </Grid>
      </Grid>

      <ExecutiveCardShell
        title='Drilldowns rápidos'
        subtitle='Atajos para continuar la exploración sin perder el contexto del provider.'
      >
        <Stack spacing={2.5}>
          <Typography variant='body2' color='text.secondary'>
            Usa estos accesos cuando quieras pasar de lectura a acción. Finanzas y AI Tooling conservan el contexto del supplier o provider cuando la ruta ya soporta filtros por URL.
          </Typography>

          <ButtonGroup
            orientation='vertical'
            variant='outlined'
            sx={{
              alignItems: 'stretch',
              '& .MuiButtonGroup-grouped': {
                justifyContent: 'flex-start'
              }
            }}
          >
            <Button
              component={Link}
              href={`/finance/expenses?supplierId=${encodeURIComponent(supplierId)}`}
              startIcon={<i className='tabler-receipt-2' />}
              sx={{ justifyContent: 'flex-start', px: 2.5, py: 1.25 }}
            >
              Ver egresos del supplier
            </Button>
            <Button
              component={Link}
              href={`/admin/ai-tools?tab=catalog&providerId=${encodeURIComponent(providerTooling.providerId)}`}
              startIcon={<i className='tabler-tools' />}
              sx={{ justifyContent: 'flex-start', px: 2.5, py: 1.25 }}
            >
              Abrir AI Tooling por provider
            </Button>
            <Button
              component={Link}
              href={`/admin/ai-tools?tab=licenses&providerId=${encodeURIComponent(providerTooling.providerId)}`}
              startIcon={<i className='tabler-key' />}
              sx={{ justifyContent: 'flex-start', px: 2.5, py: 1.25 }}
            >
              Ver licencias del provider
            </Button>
            <Button
              component={Link}
              href='/hr/payroll'
              startIcon={<i className='tabler-user-dollar' />}
              sx={{ justifyContent: 'flex-start', px: 2.5, py: 1.25 }}
            >
              Revisar payroll expuesto
            </Button>
          </ButtonGroup>

          <Divider />

          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color='primary'
              label={`${providerTooling.financeExpenseCount} egresos`}
            />
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color='warning'
              label={`${providerTooling.activeToolCount} tools activas`}
            />
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color='info'
              label={`${providerTooling.activeMemberCount} miembros`}
            />
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color='success'
              label={`${providerTooling.payrollMemberCount} payroll`}
            />
          </Stack>
        </Stack>
      </ExecutiveCardShell>
    </Stack>
  )
}

export default SupplierProviderToolingTab
