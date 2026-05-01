'use client'

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import type { PaymentOrdersKpis } from '@/lib/finance/payment-orders/get-kpis'

interface PaymentOrdersKpiRowProps {
  kpis: PaymentOrdersKpis | null
  loading: boolean
}

const formatCount = (n: number) => new Intl.NumberFormat('es-CL').format(n)

const formatAmount = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(n)

const KpiSkeleton = () => (
  <Box
    sx={theme => ({
      borderRadius: 2,
      border: `1px solid ${theme.palette.divider}`,
      p: 4,
      height: '100%',
      backgroundColor: theme.palette.background.paper,
      opacity: 0.6
    })}
  >
    <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      <Box
        sx={theme => ({
          width: 48,
          height: 48,
          borderRadius: '50%',
          backgroundColor: theme.palette.action.hover
        })}
      />
      <Box sx={{ flex: 1 }}>
        <Box
          sx={theme => ({
            height: 14,
            backgroundColor: theme.palette.action.hover,
            borderRadius: 1,
            mb: 1.5,
            width: '70%'
          })}
        />
        <Box
          sx={theme => ({
            height: 24,
            backgroundColor: theme.palette.action.hover,
            borderRadius: 1,
            width: '40%'
          })}
        />
      </Box>
    </Box>
  </Box>
)

const PaymentOrdersKpiRow = ({ kpis, loading }: PaymentOrdersKpiRowProps) => {
  if (loading || !kpis) {
    return (
      <Grid container spacing={6}>
        {[0, 1, 2, 3].map(i => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiSkeleton />
          </Grid>
        ))}
      </Grid>
    )
  }

  const cards = [
    {
      title: 'Por programar',
      stats: formatCount(kpis.toScheduleCount),
      subtitle: formatAmount(kpis.toScheduleAmountClp),
      avatarIcon: 'tabler-clipboard-list',
      avatarColor: 'warning' as const
    },
    {
      title: 'Esta semana',
      stats: formatCount(kpis.thisWeekCount),
      subtitle: formatAmount(kpis.thisWeekAmountClp),
      avatarIcon: 'tabler-calendar-event',
      avatarColor: 'info' as const
    },
    {
      title: 'Vencidas',
      stats: formatCount(kpis.overdueCount),
      subtitle: formatAmount(kpis.overdueAmountClp),
      avatarIcon: 'tabler-alert-triangle',
      avatarColor: 'error' as const
    },
    {
      title: 'Pagadas este mes',
      stats: formatCount(kpis.paidThisMonthCount),
      subtitle: formatAmount(kpis.paidThisMonthAmountClp),
      avatarIcon: 'tabler-circle-check',
      avatarColor: 'success' as const
    }
  ]

  return (
    <Grid container spacing={6} role='status' aria-live='polite'>
      {cards.map(card => (
        <Grid key={card.title} size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title={card.title}
            stats={card.stats}
            subtitle={card.subtitle}
            avatarIcon={card.avatarIcon}
            avatarColor={card.avatarColor}
          />
        </Grid>
      ))}
    </Grid>
  )
}

export default PaymentOrdersKpiRow
