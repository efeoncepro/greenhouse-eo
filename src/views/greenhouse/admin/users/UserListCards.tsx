'use client'

import Grid from '@mui/material/Grid'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import type { AdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import { formatNumber as formatGreenhouseNumber } from '@/lib/format'

type Props = {
  data: AdminAccessOverview
}

const getShare = (part: number, total: number) => {
  if (total === 0) return '0%'

  return `${Math.round((part / total) * 100)}%`
}

const UserListCards = ({ data }: Props) => {
  const cards = [
    {
      title: GH_INTERNAL_MESSAGES.admin_users_total,
      stats: formatGreenhouseNumber(data.totals.totalUsers, 'es-CL'),
      avatarIcon: 'tabler-users',
      avatarColor: 'primary' as const,
      trend: 'neutral' as const,
      trendNumber: getShare(data.totals.clientUsers, data.totals.totalUsers),
      subtitle: GH_INTERNAL_MESSAGES.admin_users_total_subtitle
    },
    {
      title: GH_INTERNAL_MESSAGES.admin_users_active,
      stats: formatGreenhouseNumber(data.totals.activeUsers, 'es-CL'),
      avatarIcon: 'tabler-user-check',
      avatarColor: 'success' as const,
      trend: 'positive' as const,
      trendNumber: getShare(data.totals.activeUsers, data.totals.totalUsers),
      subtitle: GH_INTERNAL_MESSAGES.admin_users_active_subtitle
    },
    {
      title: GH_INTERNAL_MESSAGES.admin_users_invited,
      stats: formatGreenhouseNumber(data.totals.invitedUsers, 'es-CL'),
      avatarIcon: 'tabler-user-search',
      avatarColor: 'warning' as const,
      trend: 'neutral' as const,
      trendNumber: getShare(data.totals.invitedUsers, data.totals.totalUsers),
      subtitle: GH_INTERNAL_MESSAGES.admin_users_invited_subtitle
    },
    {
      title: GH_INTERNAL_MESSAGES.admin_users_internal,
      stats: formatGreenhouseNumber(data.totals.internalUsers, 'es-CL'),
      avatarIcon: 'tabler-building-community',
      avatarColor: 'info' as const,
      trend: 'neutral' as const,
      trendNumber: getShare(data.totals.internalUsers, data.totals.totalUsers),
      subtitle: GH_INTERNAL_MESSAGES.admin_users_internal_subtitle
    }
  ]

  return (
    <Grid container spacing={6}>
      {cards.map(card => (
        <Grid key={card.title} size={{ xs: 12, sm: 6, xl: 3 }}>
          <HorizontalWithSubtitle {...card} />
        </Grid>
      ))}
    </Grid>
  )
}

export default UserListCards
