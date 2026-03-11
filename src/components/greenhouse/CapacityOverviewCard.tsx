'use client'

import { useId } from 'react'

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
  variant?: 'default' | 'compact'
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
  variant = 'default',
  insightTitle,
  insightSubtitle,
  insightItems,
  coverageLabel = 'Healthy',
  coverageTone = 'success'
}: CapacityOverviewCardProps) => {
  const theme = useTheme()
  const headingId = useId()
  const descriptionId = useId()
  const isCompact = variant === 'compact'

  return (
    <ExecutiveCardShell
      title={title}
      subtitle={subtitle}
      action={<Chip size='small' variant='tonal' color={coverageTone} label={coverageLabel} />}
      contentSx={{ pt: isCompact ? 3 : 3.5 }}
    >
      <Stack
        spacing={isCompact ? 3 : 3.5}
        component='section'
        role='region'
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        sx={{ position: 'relative' }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: 1,
            height: 1,
            p: 0,
            m: -1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
            border: 0
          }}
        >
          <Typography id={headingId}>{title}</Typography>
          <Typography id={descriptionId}>{subtitle}</Typography>
        </Box>
        <Box
          component='ul'
          role='list'
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: `repeat(auto-fit, minmax(${isCompact ? 150 : 160}px, 1fr))`,
            listStyle: 'none',
            m: 0,
            p: 0
          }}
        >
          {summaryItems.map(item => (
            <Box
              key={item.label}
              component='li'
              sx={{
                p: isCompact ? 2.25 : 2.5,
                borderRadius: 3,
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                minHeight: isCompact ? 104 : 116,
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
          component='ul'
          role='list'
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: `repeat(auto-fit, minmax(${isCompact ? 220 : 250}px, 1fr))`,
            listStyle: 'none',
            m: 0,
            p: 0
          }}
        >
          {members.map(member => {
            const allocationTone = resolveAllocationTone(member)
            const allocationValue = member.allocationPct ?? 0

            return (
              <Box
                key={member.id}
                component='li'
                aria-label={`${member.name}, ${member.role}. ${resolveAllocationLabel(member)}. ${resolveHoursLabel(member)}.`}
                sx={{
                  p: isCompact ? 2.25 : 2.75,
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  display: 'grid',
                  gap: isCompact ? 1.5 : 2,
                  alignContent: 'start',
                  minHeight: isCompact ? 174 : 220
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
                    aria-label={`${member.name} allocation ${member.allocationPct !== null ? `${member.allocationPct}%` : 'pending'}`}
                    sx={{ height: 8, borderRadius: 999 }}
                  />
                </Box>

                <Stack direction='row' gap={1} flexWrap='wrap'>
                  <Chip size='small' variant='tonal' color={allocationTone} label={resolveAllocationLabel(member)} />
                  <Chip size='small' variant='tonal' color='primary' label={resolveHoursLabel(member)} />
                </Stack>

                {isCompact ? (
                  <Stack direction='row' justifyContent='space-between' gap={2} alignItems='center'>
                    <Typography variant='caption' color='text.secondary'>
                      {member.sourceLabel}
                    </Typography>
                    <Chip
                      size='small'
                      variant='outlined'
                      color={member.sourceTone || 'info'}
                      label={member.sourceTone === 'warning' ? 'Controlled' : 'Detected'}
                    />
                  </Stack>
                ) : (
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
                      <Chip
                        size='small'
                        variant='outlined'
                        color={member.sourceTone || 'info'}
                        label={member.sourceTone === 'warning' ? 'Controlado' : 'Detectado'}
                      />
                    </Stack>
                  </Box>
                )}
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
              component='ul'
              role='list'
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: `repeat(auto-fit, minmax(${isCompact ? 150 : 180}px, 1fr))`,
                listStyle: 'none',
                m: 0,
                p: 0
              }}
            >
              {insightItems.map(item => (
                <Box
                  key={item.label}
                  component='li'
                  sx={{
                    p: isCompact ? 2 : 2.25,
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                    border: `1px solid ${theme.palette.divider}`,
                    minHeight: isCompact ? 96 : 112,
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
