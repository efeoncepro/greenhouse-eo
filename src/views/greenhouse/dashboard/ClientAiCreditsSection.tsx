'use client'

import { useCallback, useEffect, useState } from 'react'

import dynamic from 'next/dynamic'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'
import { useTheme } from '@mui/material/styles'

import type { ApexOptions } from 'apexcharts'

import CustomChip from '@core/components/mui/Chip'
import CustomAvatar from '@core/components/mui/Avatar'

import { EmptyState, ExecutiveCardShell } from '@/components/greenhouse'
import CardStatsSquare from '@components/card-statistics/CardStatsSquare'
import type { AiCreditWallet, ClientCreditSummary } from '@/types/ai-tools'
import { balanceHealthConfig, walletStatusConfig, formatDate } from '@views/greenhouse/ai-tools/helpers'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

const ClientAiCreditsSection = () => {
  const theme = useTheme()
  const [data, setData] = useState<ClientCreditSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-credits/summary?period=current_month')

      if (!res.ok) return

      const json: ClientCreditSummary = await res.json()

      setData(json)
    } catch {
      // Silently fail — section error boundary handles display
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <ExecutiveCardShell title='Créditos AI' subtitle='Cargando tus wallets de créditos...'>
        <Stack spacing={2}>
          <Skeleton variant='rounded' height={120} />
          <Skeleton variant='rounded' height={120} />
        </Stack>
      </ExecutiveCardShell>
    )
  }

  if (!data || data.wallets.length === 0) {
    return (
      <ExecutiveCardShell title='Créditos AI' subtitle='Consumo de inteligencia artificial en tu cuenta'>
        <EmptyState
          icon='tabler-wallet'
          title='Aun no tienes créditos AI'
          description='Cuando tu cuenta tenga wallets de créditos AI activos, podrás ver tu balance y consumo aquí.'
          minHeight={200}
        />
      </ExecutiveCardShell>
    )
  }

  const totalAvailable = data.totalCreditsAvailable
  const totalConsumed = data.totalCreditsConsumed
  const totalBalance = totalAvailable + totalConsumed
  const activeWallets = data.wallets.filter(w => w.walletStatus === 'active').length

  return (
    <ExecutiveCardShell
      title='Créditos AI'
      subtitle='Balance y consumo de inteligencia artificial en tu cuenta'
      action={
        <CustomChip
          round='true'
          size='small'
          icon={<i className='tabler-wallet' />}
          label={`${activeWallets} wallet${activeWallets !== 1 ? 's' : ''} activo${activeWallets !== 1 ? 's' : ''}`}
          color='primary'
        />
      }
    >
      <Stack spacing={4}>
        {/* KPI summary row */}
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(3, 1fr)'
            }
          }}
        >
          <CardStatsSquare
            stats={totalAvailable.toLocaleString('es-CL')}
            statsTitle='Créditos disponibles'
            avatarIcon='tabler-coins'
            avatarColor='success'
          />
          <CardStatsSquare
            stats={totalConsumed.toLocaleString('es-CL')}
            statsTitle='Consumidos este mes'
            avatarIcon='tabler-chart-arrows-vertical'
            avatarColor='warning'
          />
          <CardStatsSquare
            stats={totalBalance > 0 ? `${Math.round((totalConsumed / totalBalance) * 100)}%` : '0%'}
            statsTitle='Uso del periodo'
            avatarIcon='tabler-percentage'
            avatarColor='info'
          />
        </Box>

        {/* Wallet cards */}
        <Grid container spacing={3}>
          {data.wallets.map(wallet => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={wallet.walletId}>
              <WalletCard wallet={wallet} theme={theme} />
            </Grid>
          ))}
        </Grid>

        {/* Top consuming projects */}
        {data.topConsumingProjects.length > 0 && (
          <Box>
            <Typography variant='subtitle2' sx={{ mb: 1.5 }}>
              Proyectos con mayor consumo
            </Typography>
            <Stack spacing={1}>
              {data.topConsumingProjects.map((project, idx) => {
                const maxCredits = data.topConsumingProjects[0].creditsConsumed
                const percent = maxCredits > 0 ? (project.creditsConsumed / maxCredits) * 100 : 0

                return (
                  <Stack key={idx} spacing={0.5}>
                    <Stack direction='row' justifyContent='space-between' alignItems='center'>
                      <Stack direction='row' spacing={1} alignItems='center'>
                        <CustomAvatar variant='rounded' skin='light' color='primary' size={24}>
                          <i className='tabler-folder' style={{ fontSize: 14 }} />
                        </CustomAvatar>
                        <Typography variant='body2'>{project.projectName}</Typography>
                      </Stack>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                        {project.creditsConsumed.toLocaleString('es-CL')}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant='determinate'
                      value={percent}
                      color='primary'
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                  </Stack>
                )
              })}
            </Stack>
          </Box>
        )}
      </Stack>
    </ExecutiveCardShell>
  )
}

// ── Wallet card sub-component ────────────────────────────────────

type WalletCardProps = {
  wallet: AiCreditWallet
  theme: Theme
}

const WalletCard = ({ wallet, theme }: WalletCardProps) => {
  const healthConf = balanceHealthConfig[wallet.balanceHealth]
  const statusConf = walletStatusConfig[wallet.walletStatus]
  const usedPercent = Math.min(100, Math.round(wallet.usagePercent))

  const resolveColor = (health: string) => {
    const conf = balanceHealthConfig[health as keyof typeof balanceHealthConfig]
    const c = conf?.color === 'default' ? 'secondary' : conf?.color ?? 'secondary'
    const paletteEntry = theme.palette[c as keyof typeof theme.palette]

    if (paletteEntry && typeof paletteEntry === 'object' && 'main' in paletteEntry) {
      return (paletteEntry as { main: string }).main
    }

    return theme.palette.secondary.main
  }

  const gaugeColor = resolveColor(wallet.balanceHealth)

  const chartOptions: ApexOptions = {
    chart: { parentHeightOffset: 0, sparkline: { enabled: true } },
    colors: [gaugeColor],
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: { size: '60%' },
        track: { background: theme.palette.action.hover },
        dataLabels: {
          name: { show: false },
          value: {
            show: true,
            fontSize: '13px',
            fontWeight: 600,
            offsetY: -2,
            formatter: () => `${wallet.availableBalance} / ${wallet.initialBalance}`
          }
        }
      }
    },
    stroke: { lineCap: 'round' }
  }

  return (
    <Card
      elevation={0}
      sx={{
        border: t => `1px solid ${t.palette.divider}`,
        borderTop: '3px solid',
        borderTopColor: gaugeColor,
        height: '100%'
      }}
    >
      <CardContent sx={{ pb: '16px !important' }}>
        {/* Header */}
        <Stack direction='row' justifyContent='space-between' alignItems='flex-start' sx={{ mb: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='subtitle2' fontWeight={600} noWrap>
              {wallet.toolName}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {wallet.providerName ?? '—'}
            </Typography>
          </Box>
          <CustomChip
            round='true'
            size='small'
            icon={<i className={statusConf?.icon ?? 'tabler-circle'} />}
            label={statusConf?.label ?? wallet.walletStatus}
            color={statusConf?.color === 'default' ? 'secondary' : statusConf?.color ?? 'secondary'}
          />
        </Stack>

        {/* Gauge */}
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.5 }}>
          <AppReactApexCharts
            type='radialBar'
            height={120}
            options={chartOptions}
            series={[100 - usedPercent]}
            width={160}
          />
        </Box>

        {/* Health chip */}
        <Stack alignItems='center' sx={{ mb: 1.5 }}>
          <CustomChip
            round='true'
            size='small'
            icon={<i className={healthConf?.icon ?? 'tabler-circle'} />}
            label={healthConf?.label ?? wallet.balanceHealth}
            color={healthConf?.color === 'default' ? 'secondary' : healthConf?.color ?? 'secondary'}
          />
        </Stack>

        {/* Monthly progress */}
        {wallet.monthlyLimit != null && wallet.monthlyLimit > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Stack direction='row' justifyContent='space-between' sx={{ mb: 0.5 }}>
              <Typography variant='caption' color='text.secondary'>Consumo mensual</Typography>
              <Typography variant='caption' sx={{ fontFamily: 'monospace' }}>
                {wallet.monthlyConsumed} / {wallet.monthlyLimit}
              </Typography>
            </Stack>
            <LinearProgress
              variant='determinate'
              value={Math.min(100, (wallet.monthlyConsumed / wallet.monthlyLimit) * 100)}
              color={healthConf?.color === 'default' ? 'secondary' : (healthConf?.color ?? 'secondary') as 'success' | 'warning' | 'error' | 'secondary'}
              sx={{ height: 5, borderRadius: 3 }}
            />
          </Box>
        )}

        {/* Info rows */}
        <Divider sx={{ my: 1 }} />
        <Stack spacing={0.5}>
          <Stack direction='row' justifyContent='space-between'>
            <Typography variant='caption' color='text.secondary'>Unidad</Typography>
            <Typography variant='caption'>{wallet.creditUnitName}</Typography>
          </Stack>
          <Stack direction='row' justifyContent='space-between'>
            <Typography variant='caption' color='text.secondary'>Vigencia</Typography>
            <Typography variant='caption'>{formatDate(wallet.validFrom)} — {formatDate(wallet.validUntil)}</Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default ClientAiCreditsSection
