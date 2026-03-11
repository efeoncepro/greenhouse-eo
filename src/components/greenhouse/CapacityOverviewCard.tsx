'use client'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import ExecutiveCardShell from './ExecutiveCardShell'
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
  coverageLabel?: string
  coverageTone?: CapacityMemberTone
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
  insightItems,
  coverageLabel = 'Healthy',
  coverageTone = 'success'
}: CapacityOverviewCardProps) => {
  const theme = useTheme()

  return (
    <ExecutiveCardShell
      title={title}
      subtitle={subtitle}
      action={<Chip size='small' variant='tonal' color={coverageTone} label={coverageLabel} />}
      contentSx={{ pt: 3.5 }}
    >
      <Stack spacing={3.5}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))'
          }}
        >
          {summaryItems.map(item => (
            <Box
              key={item.label}
              sx={{
                p: 2.5,
                borderRadius: 3,
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                minHeight: 116,
                display: 'grid',
                gap: 0.75,
                alignContent: 'start'
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

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
          }}
        >
          {members.map(member => {
            const allocationTone = resolveAllocationTone(member)
            const allocationValue = member.allocationPct ?? 0

            return (
              <Box
                key={member.id}
                sx={{
                  p: 2.75,
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  display: 'grid',
                  gap: 2,
                  alignContent: 'start',
                  minHeight: 220
                }}
              >
                <Stack direction='row' spacing={1.75} alignItems='center'>
                  <Avatar src={member.avatarPath || undefined} sx={{ width: 52, height: 52 }}>
                    {getInitials(member.name)}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant='h6'>{member.name}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {member.role}
                    </Typography>
                  </Box>
                </Stack>

                <Box>
                  <Stack direction='row' justifyContent='space-between' alignItems='center' className='mbe-1'>
                    <Typography variant='body2' color='text.secondary'>
                      Allocation
                    </Typography>
                    <Typography variant='body2'>{member.allocationPct !== null ? `${member.allocationPct}%` : 'Pendiente'}</Typography>
                  </Stack>
                  <LinearProgress
                    variant='determinate'
                    color={allocationTone}
                    value={allocationValue}
                    sx={{ height: 8, borderRadius: 999 }}
                  />
                </Box>

                <Stack direction='row' gap={1} flexWrap='wrap'>
                  <Chip size='small' variant='tonal' color={allocationTone} label={resolveAllocationLabel(member)} />
                  <Chip size='small' variant='tonal' color='primary' label={resolveHoursLabel(member)} />
                </Stack>

                <Box
                  sx={{
                    p: 1.75,
                    borderRadius: 2.5,
                    backgroundColor: alpha(theme.palette.info.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.12)}`
                  }}
                >
                  <Typography variant='caption' color='text.secondary'>
                    Fuente
                  </Typography>
                  <Stack direction='row' justifyContent='space-between' gap={2} alignItems='center'>
                    <Typography variant='body2'>{member.sourceLabel}</Typography>
                    <Chip size='small' variant='outlined' color={member.sourceTone || 'info'} label={member.sourceTone === 'warning' ? 'Controlado' : 'Detectado'} />
                  </Stack>
                </Box>
              </Box>
            )
          })}
        </Box>

        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            backgroundColor: alpha(theme.palette.background.default, 0.48),
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <Stack spacing={2.5}>
            <Box>
              <Typography variant='h6'>{insightTitle}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {insightSubtitle}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'
              }}
            >
              {insightItems.map(item => (
                <Box
                  key={item.label}
                  sx={{
                    p: 2.25,
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                    border: `1px solid ${theme.palette.divider}`,
                    minHeight: 112,
                    display: 'grid',
                    gap: 0.75,
                    alignContent: 'start'
                  }}
                >
                  <Typography variant='caption' color='text.secondary'>
                    {item.label}
                  </Typography>
                  <Typography variant='h5'>{item.value}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {item.detail}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Stack>
        </Box>
      </Stack>
    </ExecutiveCardShell>
  )
}

export default CapacityOverviewCard
