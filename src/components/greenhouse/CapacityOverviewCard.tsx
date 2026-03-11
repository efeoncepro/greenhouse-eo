'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import ExecutiveCardShell from './ExecutiveCardShell'
import MetricList from './MetricList'
import type { MetricListItem } from './MetricList'

type CapacitySummaryItem = {
  label: string
  value: string
  detail: string
}

type CapacityMemberTone = 'success' | 'info' | 'warning' | 'error'

export type CapacityOverviewMember = {
  id: string
  name: string
  role: string
  avatarPath?: string | null
  allocationPct: number | null
  monthlyHours: number | null
  allocationLabel?: string
  allocationTone?: CapacityMemberTone
  hoursLabel?: string
  sourceLabel: string
  sourceTone?: CapacityMemberTone
}

type CapacityOverviewCardProps = {
  title: string
  subtitle: string
  summaryItems: CapacitySummaryItem[]
  members: CapacityOverviewMember[]
  insightTitle: string
  insightSubtitle: string
  insightItems: MetricListItem[]
}

const getInitials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')

const resolveAllocationTone = (member: CapacityOverviewMember): CapacityMemberTone => {
  if (member.allocationTone) return member.allocationTone
  if (member.allocationPct !== null && member.allocationPct >= 100) return 'success'
  if (member.allocationPct !== null && member.allocationPct >= 70) return 'info'

  return 'warning'
}

const resolveAllocationLabel = (member: CapacityOverviewMember) => {
  if (member.allocationLabel) return member.allocationLabel
  if (member.allocationPct === null) return 'Asignacion pendiente'

  return `${member.allocationPct}% dedicado`
}

const resolveHoursLabel = (member: CapacityOverviewMember) => {
  if (member.hoursLabel) return member.hoursLabel
  if (member.monthlyHours === null) return 'Horas pendientes'

  return `${member.monthlyHours} h/mes`
}

const CapacityOverviewCard = ({
  title,
  subtitle,
  summaryItems,
  members,
  insightTitle,
  insightSubtitle,
  insightItems
}: CapacityOverviewCardProps) => {
  const theme = useTheme()

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.2fr 1fr' } }}>
      <ExecutiveCardShell title={title} subtitle={subtitle}>
        <Stack spacing={3}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.min(Math.max(summaryItems.length, 1), 3)}, minmax(0, 1fr))` }
            }}
          >
            {summaryItems.map(item => (
              <Box
                key={item.label}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`
                }}
              >
                <Typography variant='caption' color='text.secondary'>
                  {item.label}
                </Typography>
                <Typography variant='h4'>{item.value}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {item.detail}
                </Typography>
              </Box>
            ))}
          </Box>

          {members.map(member => {
            const allocationTone = resolveAllocationTone(member)
            const allocationValue = member.allocationPct ?? 0

            return (
              <Box
                key={member.id}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: theme => `1px solid ${theme.palette.divider}`,
                  display: 'grid',
                  gap: 2.5,
                  gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' }
                }}
              >
                <Stack spacing={2.5}>
                  <Stack direction='row' spacing={2} alignItems='center'>
                    <Avatar src={member.avatarPath || undefined} sx={{ width: 48, height: 48 }}>
                      {getInitials(member.name)}
                    </Avatar>
                    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                      <Typography variant='h6'>{member.name}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {member.role}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Box>
                    <Stack direction='row' justifyContent='space-between' alignItems='center' className='mbe-1'>
                      <Typography variant='body2' color='text.secondary'>
                        Allocation
                      </Typography>
                      <Typography variant='body2' color='text.primary'>
                        {member.allocationPct !== null ? `${member.allocationPct}%` : 'Pendiente'}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant='determinate'
                      color={allocationTone}
                      value={allocationValue}
                      sx={{ height: 8, borderRadius: 999 }}
                    />
                  </Box>
                </Stack>

                <Stack direction='row' flexWrap='wrap' gap={1.5} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                  <Chip variant='tonal' color={allocationTone} label={resolveAllocationLabel(member)} />
                  <Chip variant='tonal' color='primary' label={resolveHoursLabel(member)} />
                  <Chip variant='outlined' color={member.sourceTone || 'info'} label={member.sourceLabel} />
                </Stack>
              </Box>
            )
          })}
        </Stack>
      </ExecutiveCardShell>

      <ExecutiveCardShell title={insightTitle} subtitle={insightSubtitle}>
        <MetricList items={insightItems} />
      </ExecutiveCardShell>
    </Box>
  )
}

export default CapacityOverviewCard
