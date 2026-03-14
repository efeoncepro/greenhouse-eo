'use client'

import Grid from '@mui/material/Grid'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import type { PeopleListPayload } from '@/types/people'

type Props = {
  summary: PeopleListPayload['summary']
}

const PeopleListStats = ({ summary }: Props) => {
  const cards = [
    {
      title: 'Activos',
      stats: summary.activeMembers.toLocaleString('es-CL'),
      avatarIcon: 'tabler-users',
      avatarColor: 'primary' as const,
      subtitle: 'Colaboradores activos'
    },
    {
      title: 'FTE asignado',
      stats: summary.totalFte.toFixed(1),
      avatarIcon: 'tabler-clock-hour-4',
      avatarColor: 'info' as const,
      subtitle: 'FTE distribuido en cuentas'
    },
    {
      title: 'Spaces cubiertos',
      stats: summary.coveredClients.toLocaleString('es-CL'),
      avatarIcon: 'tabler-building',
      avatarColor: 'warning' as const,
      subtitle: 'Cuentas con equipo'
    },
    {
      title: 'Distribución',
      stats: `${summary.chileCount} CL · ${summary.internationalCount} Intl`,
      avatarIcon: 'tabler-world',
      avatarColor: 'success' as const,
      subtitle: 'Por régimen de pago'
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

export default PeopleListStats
