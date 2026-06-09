'use client'

import { useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomIconButton from '@core/components/mui/IconButton'
import CustomTextField from '@core/components/mui/TextField'

import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import {
  GreenhouseButton,
  GreenhouseHealthSignalChart,
  GreenhouseTalentProfileDossier
} from '@/components/greenhouse/primitives'
import { MOTION_DURATION_S, MOTION_EASE } from '@/components/theme/motion-tokens'
import useReducedMotion from '@/hooks/useReducedMotion'
import { formatNumber } from '@/lib/format'
import { AnimatePresence, motion } from '@/libs/FramerMotion'
import AppRecharts from '@/libs/styles/AppRecharts'
import { Bar, BarChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from '@/libs/Recharts'

import {
  assignedTeamMembers,
  attentionItems,
  capabilityCoverage,
  scopeLabels,
  type AssignedTeamHealth,
  type AssignedTeamMember,
  type AssignedTeamRoleFamily,
  type AssignedTeamScope,
  type CapabilityCoverage
} from './data'

type Filter = 'all' | 'healthy' | 'watch' | 'critical'
type Tone = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

const healthMeta: Record<AssignedTeamHealth, { label: string; tone: Tone; icon: string }> = {
  healthy: { label: 'Estable', tone: 'success', icon: 'tabler-shield-check' },
  watch: { label: 'En riesgo', tone: 'warning', icon: 'tabler-eye' },
  critical: { label: 'Crítico', tone: 'error', icon: 'tabler-alert-triangle' }
}

const roleMeta: Record<AssignedTeamRoleFamily, { label: string; tone: Tone; icon: string }> = {
  strategy: { label: 'Estrategia', tone: 'primary', icon: 'tabler-compass' },
  design: { label: 'Diseño', tone: 'info', icon: 'tabler-pencil-star' },
  development: { label: 'Software', tone: 'info', icon: 'tabler-code' },
  media: { label: 'Media', tone: 'warning', icon: 'tabler-speakerphone' },
  operations: { label: 'Operaciones', tone: 'success', icon: 'tabler-settings-check' },
  data: { label: 'Data', tone: 'primary', icon: 'tabler-database' }
}

const filterLabels: Record<Filter, string> = {
  all: 'Equipo',
  healthy: 'Estable',
  watch: 'Observación',
  critical: 'Crítico'
}

const scopeOrder: AssignedTeamScope[] = ['client', 'space', 'squad']
const filterOrder: Filter[] = ['all', 'healthy', 'watch', 'critical']
const ease = [...MOTION_EASE.emphasized.cubicBezier] as [number, number, number, number]

const rosterGridColumns =
  'minmax(226px, 1.08fr) minmax(82px, 0.46fr) minmax(160px, 0.78fr) minmax(126px, 0.54fr) minmax(98px, 0.36fr) minmax(16px, 0.24fr)'

const ariaLabels = {
  scope: 'Alcance de equipo asignado',
  search: 'Buscar talento asignado',
  viewOptions: 'Opciones de vista de talento',
  healthFilters: 'Filtrar por salud del equipo',
  teamHealth: 'Salud del equipo: 82 de 100, 13 por ciento en observación, 5 por ciento en intervención'
}

const getCoverageTone = (value: number): Tone => {
  if (value >= 90) return 'primary'
  if (value >= 78) return 'warning'

  return 'error'
}

const inkColor = (theme: Theme) => (theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.grey[900])

const tonalChipSx = (tone: Tone = 'secondary') => (theme: Theme) => ({
  color: tone === 'error' ? theme.palette.error.dark : inkColor(theme),
  bgcolor: alpha(theme.palette[tone].main, 0.1),
  '& .MuiChip-label': {
    color: tone === 'error' ? theme.palette.error.dark : inkColor(theme),
    fontWeight: 600
  },
  '& .MuiChip-icon': {
    color: tone === 'error' ? theme.palette.error.dark : inkColor(theme)
  }
})

type SkillVisual = {
  iconClassName?: string
  fallbackIconClassName: string
  tone: Tone
}

const normalizeSkillLabel = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const skillVisualRegistry: Record<string, SkillVisual> = {
  react: { iconClassName: 'logos-react', fallbackIconClassName: 'tabler-brand-react', tone: 'info' },
  'node js': { iconClassName: 'logos-nodejs-icon', fallbackIconClassName: 'tabler-brand-nodejs', tone: 'success' },
  aws: { iconClassName: 'logos-aws', fallbackIconClassName: 'tabler-brand-aws', tone: 'warning' },
  java: { iconClassName: 'logos-java', fallbackIconClassName: 'tabler-code', tone: 'error' },
  spring: { iconClassName: 'logos-spring-icon', fallbackIconClassName: 'tabler-leaf', tone: 'success' },
  kafka: { iconClassName: 'logos-kafka-icon', fallbackIconClassName: 'tabler-server-bolt', tone: 'secondary' },
  figma: { iconClassName: 'logos-figma', fallbackIconClassName: 'tabler-brand-figma', tone: 'secondary' },
  'design system': { fallbackIconClassName: 'tabler-components', tone: 'info' },
  'google ux design cert': { iconClassName: 'logos-google-icon', fallbackIconClassName: 'tabler-brand-google', tone: 'primary' },
  google: { iconClassName: 'logos-google-icon', fallbackIconClassName: 'tabler-brand-google', tone: 'primary' },
  ux: { fallbackIconClassName: 'tabler-user-heart', tone: 'info' },
  'test automation': { fallbackIconClassName: 'tabler-automation', tone: 'info' },
  cypress: { iconClassName: 'logos-cypress-icon', fallbackIconClassName: 'tabler-brand-cypress', tone: 'success' },
  jenkins: { iconClassName: 'logos-jenkins', fallbackIconClassName: 'tabler-tool', tone: 'error' },
  istqb: { fallbackIconClassName: 'tabler-certificate', tone: 'primary' },
  python: { iconClassName: 'logos-python', fallbackIconClassName: 'tabler-brand-python', tone: 'primary' },
  dbt: { iconClassName: 'logos-dbt-icon', fallbackIconClassName: 'tabler-database-cog', tone: 'warning' },
  snowflake: { iconClassName: 'logos-snowflake-icon', fallbackIconClassName: 'tabler-brand-snowflake', tone: 'info' },
  databricks: { fallbackIconClassName: 'tabler-database-star', tone: 'error' },
  terraform: { iconClassName: 'logos-terraform-icon', fallbackIconClassName: 'tabler-stack-2', tone: 'secondary' },
  kubernetes: { iconClassName: 'logos-kubernetes', fallbackIconClassName: 'tabler-cloud-cog', tone: 'primary' },
  bpmn: { fallbackIconClassName: 'tabler-route', tone: 'info' },
  jira: { iconClassName: 'logos-jira', fallbackIconClassName: 'tabler-brand-jira', tone: 'primary' },
  confluence: { iconClassName: 'logos-confluence', fallbackIconClassName: 'tabler-notes', tone: 'primary' },
  'product analytics': { fallbackIconClassName: 'tabler-chart-dots', tone: 'info' },
  es: { fallbackIconClassName: 'tabler-language', tone: 'secondary' },
  en: { fallbackIconClassName: 'tabler-language', tone: 'secondary' }
}

const resolveSkillVisual = (label: string) => {
  const normalizedLabel = normalizeSkillLabel(label)

  return (
    skillVisualRegistry[normalizedLabel] ||
    Object.entries(skillVisualRegistry).find(([key]) => normalizedLabel.includes(key))?.[1] || {
      fallbackIconClassName: 'tabler-certificate',
      tone: 'secondary'
    }
  )
}

const SkillMark = ({ label }: { label: string }) => {
  const visual = resolveSkillVisual(label)

  return (
    <Tooltip title={label} arrow>
      <Box
        component='span'
        aria-label={label}
        role='img'
        tabIndex={0}
        sx={theme => ({
          inlineSize: 36,
          blockSize: 36,
          borderRadius: radiusCss(theme.shape.customBorderRadius.sm),
          display: 'inline-grid',
          placeItems: 'center',
          bgcolor: alpha(theme.palette.background.paper, 0.72),
          color: alpha(theme.palette[visual.tone].main, 0.86),
          border: '1px solid transparent',
          boxShadow: 'none',
          outline: 0,
          '& i': {
            fontSize: 18,
            lineHeight: 1,
            display: 'inline-block',
            opacity: 0.92
          },
          '&:hover, &:focus-visible': {
            bgcolor: alpha(theme.palette[visual.tone].main, 0.045),
            borderColor: 'transparent',
            boxShadow: `0 0 0 3px ${alpha(theme.palette[visual.tone].main, 0.08)}`,
            transform: 'translateY(-1px)'
          },
          transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'transform'], {
            duration: theme.transitions.duration.shorter
          })
        })}
      >
        <i className={visual.iconClassName || visual.fallbackIconClassName} aria-hidden='true' />
      </Box>
    </Tooltip>
  )
}

const formatFte = (value: number) =>
  formatNumber(value, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1
  })

const MotionBox = motion(Box)
const radiusCss = (value: string | number) => (typeof value === 'number' ? `${value}px` : value)

const StatusIcon = ({ icon, tone }: { icon: string; tone: Tone }) => {
  const theme = useTheme()

  return (
    <Box
      aria-hidden='true'
      sx={{
        inlineSize: 32,
        blockSize: 32,
        borderRadius: radiusCss(theme.shape.customBorderRadius.md),
        display: 'grid',
        placeItems: 'center',
        color: alpha(theme.palette[tone].dark, 0.9),
        bgcolor: alpha(theme.palette[tone].main, 0.065),
        border: `1px solid ${alpha(theme.palette[tone].main, 0.12)}`,
        '& i': { fontSize: 17, lineHeight: 1 }
      }}
    >
      <i className={icon} />
    </Box>
  )
}

const FreshnessChip = () => (
  <CustomChip
    round='true'
    size='small'
    color='info'
    variant='tonal'
    icon={<i className='tabler-refresh' aria-hidden='true' />}
    label='Sync · hoy 08:30'
    sx={theme => ({
      ...tonalChipSx('info')(theme),
      alignSelf: { xs: 'flex-start', md: 'center' }
    })}
  />
)

const teamHealthSegments = [
  { id: 'stable', label: 'Estable', value: 82, tone: 'success' as Tone, color: GH_COLORS.chart.success },
  { id: 'watch', label: 'En observación', value: 13, tone: 'warning' as Tone, color: GH_COLORS.chart.warning },
  { id: 'critical', label: 'Intervención', value: 5, tone: 'error' as Tone, color: GH_COLORS.chart.error }
]

const TeamHealthSummary = ({ riskCount, animate }: { riskCount: number; animate: boolean }) => {
  const theme = useTheme()

  return (
    <Stack
      direction='row'
      spacing={3}
      alignItems='center'
      sx={{
        minInlineSize: { md: 440 },
        borderInlineStart: { md: `1px solid ${theme.palette.divider}` },
        pl: { md: 5 }
      }}
    >
      <GreenhouseHealthSignalChart
        segments={teamHealthSegments}
        score={82}
        size={92}
        showScore={false}
        animate={animate}
        kind='teamHealth'
        ariaLabel={ariaLabels.teamHealth}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant='h6' color='primary.dark'>
          Cobertura saludable
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          {riskCount} señales en observación
        </Typography>
      </Box>
      <Box
        sx={{
          display: { xs: 'none', sm: 'grid' },
          placeItems: 'center',
          inlineSize: 48,
          blockSize: 48,
          borderRadius: '9999px',
          color: 'warning.dark',
          bgcolor: alpha(theme.palette.warning.main, 0.1),
          ml: 'auto',
          '& i': { fontSize: 22 }
        }}
      >
        <i className='tabler-eye' aria-hidden='true' />
      </Box>
    </Stack>
  )
}

const ScopeSwitcher = ({
  selected,
  onChange
}: {
  selected: AssignedTeamScope
  onChange: (scope: AssignedTeamScope) => void
}) => (
  <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap role='group' aria-label={ariaLabels.scope}>
    {scopeOrder.map(scope => {
      const active = scope === selected

      return (
        <GreenhouseButton
          key={scope}
          kind='filter'
          size='small'
          variant={active ? 'label' : 'outlined'}
          tone='primary'
          leadingIconClassName={scope === 'client' ? 'tabler-building' : scope === 'space' ? 'tabler-layout-grid' : 'tabler-users-group'}
          aria-pressed={active}
          onClick={() => onChange(scope)}
          sx={theme => ({
            bgcolor: active ? alpha(theme.palette.primary.main, 0.08) : 'background.paper',
            color: theme.palette.primary.dark,
            borderColor: active ? alpha(theme.palette.primary.main, 0.18) : alpha(theme.palette.primary.main, 0.5),
            fontWeight: 600
          })}
        >
          {scopeLabels[scope]}
        </GreenhouseButton>
      )
    })}
  </Stack>
)

const HealthFilterGroup = ({
  selected,
  onChange
}: {
  selected: Filter
  onChange: (filter: Filter) => void
}) => {
  const theme = useTheme()

  return (
    <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap role='group' aria-label={ariaLabels.healthFilters}>
      {filterOrder.map(item => {
        const active = item === selected
        const count = item === 'all' ? assignedTeamMembers.length : assignedTeamMembers.filter(member => member.health === item).length
        const tone: Tone = item === 'critical' ? 'error' : item === 'watch' ? 'warning' : 'primary'

        return (
          <Box
            key={item}
            component='button'
            type='button'
            aria-pressed={active}
            onClick={() => onChange(item)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.25,
              minBlockSize: 34,
              border: `1px solid ${active ? theme.palette.primary.main : theme.palette.divider}`,
              borderRadius: radiusCss(theme.shape.customBorderRadius.md),
              bgcolor: active ? 'primary.lighterOpacity' : 'background.paper',
              color: active ? 'primary.dark' : 'text.primary',
              px: 2,
              cursor: 'pointer',
              '&:hover': { bgcolor: active ? 'primary.lighterOpacity' : 'action.hover' },
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2
              }
            }}
          >
            <Box
              component='span'
              sx={{
                inlineSize: 7,
                blockSize: 7,
                borderRadius: '9999px',
                bgcolor: `${tone}.main`
              }}
            />
            <Typography variant='caption' color='inherit' sx={{ fontWeight: 600 }}>
              {filterLabels[item]}
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {count}
            </Typography>
          </Box>
        )
      })}
    </Stack>
  )
}

const CapacityCoverageBar = ({
  value,
  label,
  height = 8
}: {
  value: number
  label?: string
  height?: number
}) => {
  const theme = useTheme()
  const tone = getCoverageTone(value)

  return (
    <Box>
      {label ? (
        <Stack direction='row' justifyContent='space-between' alignItems='center' className='mbe-1'>
          <Typography variant='h6' color='text.primary'>
            {label}
          </Typography>
          <Typography variant='monoId' color='text.primary'>
            {value}%
          </Typography>
        </Stack>
      ) : null}
      <Box
        role='meter'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(value, 100)}
        aria-label={label ? `${label}: ${value}%` : `Cobertura ${value}%`}
        sx={{
          blockSize: height,
          borderRadius: '9999px',
          overflow: 'hidden',
          bgcolor: alpha(theme.palette[tone].main, 0.12),
          '&::after': {
            content: '""',
            display: 'block',
            inlineSize: `${Math.min(value, 100)}%`,
            blockSize: '100%',
            bgcolor: `${tone}.main`,
            borderRadius: '9999px',
            transition: `inline-size ${MOTION_DURATION_S.standard}s ${theme.transitions.easing.easeOut}`
          }
        }}
      />
    </Box>
  )
}

const KpiCard = ({
  icon,
  label,
  value,
  detail,
  tone = 'primary',
  formatter
}: {
  icon: string
  label: string
  value: number
  detail: string
  tone?: Tone
  formatter?: (value: number) => string
}) => (
    <Box
      sx={{
        minBlockSize: 78,
        bgcolor: 'transparent'
      }}
    >
      <Box sx={{ px: { xs: 3, md: 4 }, py: 2.75 }}>
        <Stack spacing={1.5}>
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <StatusIcon icon={icon} tone={tone} />
            <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600 }}>
              {label}
            </Typography>
          </Stack>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='h5' sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
              <AnimatedCounter value={value} formatter={formatter} />
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.75 }}>
              {detail}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
)

const MemberAvatar = ({ member, size = 44 }: { member: AssignedTeamMember; size?: number }) => {
  const theme = useTheme()
  const meta = roleMeta[member.roleFamily]

  return (
    <CustomAvatar
      skin='light'
      color={meta.tone}
      sx={{
        inlineSize: size,
        blockSize: size,
        border: `1px solid ${alpha(theme.palette[meta.tone].main, 0.24)}`,
        color: inkColor(theme),
        bgcolor: 'background.paper',
        boxShadow: `inset 3px 0 0 ${alpha(theme.palette[meta.tone].main, 0.8)}`,
        fontWeight: 600
      }}
    >
      {member.initials}
    </CustomAvatar>
  )
}

const TeamMemberRow = ({
  member,
  selected,
  onSelect,
  reducedMotion
}: {
  member: AssignedTeamMember
  selected: boolean
  onSelect: () => void
  reducedMotion: boolean
}) => {
  const theme = useTheme()
  const meta = healthMeta[member.health]

  return (
    <Box
      component='button'
      type='button'
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Ver dossier de ${member.name}`}
      sx={{
        width: '100%',
        border: `1px solid ${selected ? alpha(theme.palette.primary.main, 0.2) : 'transparent'}`,
        textAlign: 'left',
        bgcolor: selected ? alpha(theme.palette.primary.main, 0.045) : 'transparent',
        borderRadius: radiusCss(theme.shape.customBorderRadius.md),
        cursor: 'pointer',
        p: { xs: 2, md: 2 },
        transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'outline-color', 'transform'], {
          duration: theme.transitions.duration.shortest
        }),
        '&:hover': {
          bgcolor: alpha(theme.palette.primary.main, selected ? 0.06 : 0.025),
          borderColor: alpha(theme.palette.primary.main, 0.16),
          boxShadow: theme.greenhouseElevation.raised.boxShadow,
          transform: reducedMotion ? 'none' : 'translateY(-1px)'
        },
        '&:active': {
          transform: reducedMotion ? 'none' : 'scale(0.997)'
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2
        }
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: rosterGridColumns
          },
          columnGap: { xs: 2, md: 2.75 },
          rowGap: { xs: 2, md: 2 },
          alignItems: 'center'
        }}
      >
        <Stack direction='row' spacing={2} alignItems='center' sx={{ minWidth: 0 }}>
          <MemberAvatar member={member} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='h6' noWrap>
              {member.name}
            </Typography>
            <Typography variant='caption' color='text.secondary' noWrap>
              {member.role}
            </Typography>
          </Box>
        </Stack>
        <Box>
          <Typography variant='caption' color='text.secondary'>
            Space
          </Typography>
          <Typography variant='body2'>{member.space}</Typography>
        </Box>
        <Stack spacing={1} sx={{ minWidth: 0 }}>
          <Typography
            variant='caption'
            sx={{
              color: inkColor(theme),
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1
            }}
          >
            {member.coveragePct}%
          </Typography>
          <CapacityCoverageBar value={member.coveragePct} />
        </Stack>
        <Stack
          direction='row'
          spacing={1.25}
          flexWrap='wrap'
          useFlexGap
          sx={{
            pl: { md: 2 },
            minWidth: 0,
            justifyContent: 'flex-start'
          }}
        >
          {member.skills.slice(0, 3).map(skill => (
            <SkillMark key={skill} label={skill} />
          ))}
        </Stack>
        <CustomChip
          round='true'
          size='small'
          variant='tonal'
          color={meta.tone}
          icon={<i className={meta.icon} aria-hidden='true' />}
          label={meta.label}
          sx={theme => ({
            ...tonalChipSx(meta.tone)(theme),
            justifySelf: { md: 'start' }
          })}
        />
      </Box>
    </Box>
  )
}

const RosterContinuityPanel = ({ selectedMember }: { selectedMember: AssignedTeamMember }) => {
  const theme = useTheme()

  const items = [
    {
      icon: 'tabler-route',
      tone: 'primary' as Tone,
      label: 'Plan de cobertura',
      value: `${selectedMember.coveragePct}%`,
      detail: `Mantener ${selectedMember.role} cubierto en ${selectedMember.space}.`
    },
    {
      icon: 'tabler-users-plus',
      tone: selectedMember.backupDepth === '1.0x' ? 'warning' as Tone : 'success' as Tone,
      label: 'Backup activo',
      value: selectedMember.backupDepth,
      detail: selectedMember.backupDepth === '1.0x' ? 'Requiere sucesor operativo esta semana.' : 'Continuidad disponible para handoff.'
    },
    {
      icon: 'tabler-target-arrow',
      tone: selectedMember.health === 'critical' ? 'error' as Tone : selectedMember.health === 'watch' ? 'warning' as Tone : 'info' as Tone,
      label: 'Próxima decisión',
      value: selectedMember.health === 'healthy' ? 'Monitorear' : 'Ajustar',
      detail: selectedMember.lastSignal
    }
  ]

  return (
    <Box
      data-capture='assigned-team-continuity-panel'
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: radiusCss(theme.shape.customBorderRadius.md),
        bgcolor: alpha(theme.palette.text.primary, 0.014),
        p: { xs: 3, md: 3.5 }
      }}
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant='h5'>Continuidad operativa</Typography>
          <Typography variant='body2' color='text.secondary'>
            Decisiones inmediatas para sostener capacidad sin depender de una sola persona.
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
            gap: 2
          }}
        >
          {items.map(item => (
            <Box
              key={item.label}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr)',
                gap: 2,
                alignItems: 'start',
                p: 2.5,
                borderRadius: radiusCss(theme.shape.customBorderRadius.sm),
                bgcolor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`
              }}
            >
              <StatusIcon icon={item.icon} tone={item.tone} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600 }}>
                  {item.label}
                </Typography>
                <Typography variant='h5' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {item.value}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {item.detail}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Stack>
    </Box>
  )
}

const mapMemberToDossierTalent = (member: AssignedTeamMember) => {
  const health = healthMeta[member.health]
  const role = roleMeta[member.roleFamily]

  return {
    id: member.id,
    name: member.name,
    initials: member.initials,
    role: member.role,
    space: member.space,
    roleLabel: role.label,
    roleIcon: role.icon,
    roleTone: role.tone,
    healthLabel: health.label,
    healthIcon: health.icon,
    healthTone: health.tone,
    allocationFte: member.allocationFte,
    coveragePct: member.coveragePct,
    deliveryConfidence: member.deliveryConfidence,
    backupDepth: member.backupDepth,
    skills: member.skills,
    certifications: member.certifications,
    languages: member.languages,
    currentFocus: member.currentFocus,
    lastSignal: member.lastSignal
  }
}

const TalentInspector = ({ member }: { member: AssignedTeamMember }) => (
  <AnimatePresence mode='wait'>
    <MotionBox
      key={member.id}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: MOTION_DURATION_S.standard, ease }}
      data-capture='assigned-team-inspector'
    >
      <GreenhouseTalentProfileDossier
        talent={mapMemberToDossierTalent(member)}
        kind='assignedTeamTalent'
        dataCapture='greenhouse-talent-profile-dossier'
      />
    </MotionBox>
  </AnimatePresence>
)

const TeamHealthCard = () => {
  const theme = useTheme()

  return (
    <Card
      variant='outlined'
      sx={{
        borderRadius: radiusCss(theme.shape.customBorderRadius.md),
        boxShadow: theme.greenhouseElevation.none.boxShadow,
        overflow: 'hidden'
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <Stack spacing={3}>
          <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ px: 4, pt: 4 }}>
            <Box>
              <Typography variant='h5'>Salud del equipo</Typography>
              <Typography variant='caption' color='text.secondary'>
                Cobertura y señales activas
              </Typography>
            </Box>
            <GreenhouseButton kind='inlineAction' size='small' trailingIconClassName='tabler-arrow-right'>
              Ver detalle
            </GreenhouseButton>
          </Stack>
          <Stack spacing={2} sx={{ px: 4, pb: 4 }}>
            <Stack direction='row' spacing={2} alignItems='baseline'>
              <Typography variant='h3' color='primary.dark' sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                82
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                /100 pulso operativo
              </Typography>
            </Stack>
            <Stack spacing={1.75} sx={{ minWidth: 0 }}>
              {teamHealthSegments.map(item => (
                <Box key={item.id}>
                  <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between' className='mbe-1'>
                    <Stack direction='row' spacing={1.25} alignItems='center'>
                      <Box
                        component='span'
                        sx={{
                          inlineSize: 8,
                          blockSize: 8,
                          borderRadius: '9999px',
                          bgcolor: item.color,
                          flexShrink: 0
                        }}
                      />
                      <Typography variant='body2'>{item.label}</Typography>
                    </Stack>
                    <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {item.value}%
                    </Typography>
                  </Stack>
                  <Box
                    role='meter'
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={item.value}
                    aria-label={`${item.label}: ${item.value}%`}
                    sx={{
                      blockSize: 6,
                      borderRadius: '9999px',
                      overflow: 'hidden',
                      bgcolor: alpha(item.color, 0.12),
                      '&::after': {
                        content: '""',
                        display: 'block',
                        inlineSize: `${item.value}%`,
                        blockSize: '100%',
                        borderRadius: '9999px',
                        bgcolor: item.color
                      }
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

type CapabilityCoverageTooltipPayload = {
  dataKey?: string
  value?: number
  color?: string
}

const capabilitySegmentLabels: Record<'covered' | 'atRisk' | 'deficit', string> = {
  covered: 'Cubierta',
  atRisk: 'En riesgo',
  deficit: 'Déficit'
}

const CapabilityCoverageTooltip = ({
  active,
  payload
}: {
  active?: boolean
  payload?: CapabilityCoverageTooltipPayload[]
}) => {
  if (!active || !payload?.length) return null

  return (
    <Box
      role='status'
      sx={{
        px: 2.5,
        py: 2,
        minWidth: 148,
        bgcolor: 'background.paper',
        border: theme => `1px solid ${theme.palette.divider}`,
        borderRadius: theme => radiusCss(theme.shape.customBorderRadius.sm),
        boxShadow: theme => theme.greenhouseElevation.floating.boxShadow
      }}
    >
      <Stack spacing={0.75}>
        {payload
          .filter(item => typeof item.value === 'number')
          .map(item => {
            const key = String(item.dataKey || '') as keyof typeof capabilitySegmentLabels

            return (
              <Stack key={key} direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
                <Stack direction='row' alignItems='center' spacing={1} sx={{ minWidth: 0 }}>
                  <Box
                    component='span'
                    sx={{
                      inlineSize: 8,
                      blockSize: 8,
                      borderRadius: '50%',
                      bgcolor: item.color,
                      flexShrink: 0
                    }}
                  />
                  <Typography variant='caption' sx={{ color: 'text.primary', fontWeight: 600 }}>
                    {capabilitySegmentLabels[key] ?? key}
                  </Typography>
                </Stack>
                <Typography variant='caption' sx={{ color: 'text.primary', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {item.value}%
                </Typography>
              </Stack>
            )
          })}
      </Stack>
    </Box>
  )
}

const CapabilityCoverageChart = ({ item }: { item: CapabilityCoverage }) => {
  const theme = useTheme()

  const segmentColors = {
    covered: GH_COLORS.chart.primary,
    atRisk: GH_COLORS.chart.warning,
    deficit: GH_COLORS.chart.error
  }

  const data = [
    {
      name: item.label,
      covered: item.coveredPct,
      atRisk: item.atRiskPct,
      deficit: item.deficitPct
    }
  ]

  return (
    <Box
      role='img'
      aria-label={`${item.label}: ${item.coveredPct}% cubierta, ${item.atRiskPct}% en riesgo, ${item.deficitPct}% en déficit`}
      sx={{ blockSize: 14, inlineSize: '100%' }}
    >
      <AppRecharts>
        <ResponsiveContainer width='100%' height={14}>
          <BarChart data={data} layout='vertical' margin={{ top: 3, right: 0, bottom: 3, left: 0 }} barSize={8} barCategoryGap={0}>
            <XAxis type='number' domain={[0, 100]} hide />
            <YAxis type='category' dataKey='name' hide />
            <RechartsTooltip
              cursor={false}
              wrapperStyle={{ outline: 'none', zIndex: 10 }}
              content={<CapabilityCoverageTooltip />}
            />
            <Bar
              dataKey='covered'
              stackId='capability'
              fill={segmentColors.covered}
              radius={[theme.shape.customBorderRadius.sm, 0, 0, theme.shape.customBorderRadius.sm]}
              isAnimationActive
            />
            <Bar dataKey='atRisk' stackId='capability' fill={segmentColors.atRisk} radius={[0, 0, 0, 0]} isAnimationActive />
            <Bar
              dataKey='deficit'
              stackId='capability'
              fill={segmentColors.deficit}
              radius={[0, theme.shape.customBorderRadius.sm, theme.shape.customBorderRadius.sm, 0]}
              isAnimationActive
            />
          </BarChart>
        </ResponsiveContainer>
      </AppRecharts>
    </Box>
  )
}

const CapabilityCoverageCard = () => {
  const theme = useTheme()

  return (
    <Card variant='outlined' sx={{ borderRadius: radiusCss(theme.shape.customBorderRadius.md), boxShadow: theme.greenhouseElevation.none.boxShadow }}>
      <CardContent sx={{ p: 4 }}>
        <Stack spacing={3}>
          <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
            <Box>
              <Typography variant='h5'>Cobertura por capability</Typography>
              <Typography variant='caption' color='text.secondary'>
                Cobertura, exposición y déficit por capability
              </Typography>
            </Box>
            <GreenhouseButton kind='inlineAction' size='small' trailingIconClassName='tabler-arrow-right'>
              Ver detalle
            </GreenhouseButton>
          </Stack>
          <Stack spacing={2.25}>
            {capabilityCoverage.map(item => (
              <Box key={item.id}>
                <Stack direction='row' justifyContent='space-between' className='mbe-1'>
                  <Typography variant='body2'>{item.label}</Typography>
                  <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {item.coveredPct}%
                  </Typography>
                </Stack>
                <CapabilityCoverageChart item={item} />
              </Box>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

const AttentionListCard = () => {
  const theme = useTheme()

  return (
    <Card variant='outlined' sx={{ borderRadius: radiusCss(theme.shape.customBorderRadius.md), boxShadow: theme.greenhouseElevation.none.boxShadow }}>
      <CardContent sx={{ p: 4 }}>
        <Stack spacing={3}>
          <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
            <Box>
              <Typography variant='h5'>Señales para accionar</Typography>
              <Typography variant='caption' color='text.secondary'>
                Señales resumidas para conversación ejecutiva
              </Typography>
            </Box>
            <GreenhouseButton kind='inlineAction' size='small' trailingIconClassName='tabler-arrow-right'>
              Ver todas
            </GreenhouseButton>
          </Stack>
          <Stack divider={<Divider flexItem />} spacing={0}>
            {attentionItems.map(item => {
              const tone = item.tone === 'critical' ? 'error' : 'warning'

              return (
                <Box key={item.id} sx={{ py: 2 }}>
                  <Stack direction='row' spacing={2} alignItems='flex-start'>
                    <StatusIcon icon={item.tone === 'critical' ? 'tabler-alert-triangle' : 'tabler-eye'} tone={tone} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant='h6'>{item.title}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {item.detail}
                      </Typography>
                    </Box>
                    <Typography variant='caption' color='text.secondary'>
                      {item.freshness}
                    </Typography>
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

const AssignedTeamCommandPortfolioMockupView = () => {
  const theme = useTheme()
  const reducedMotion = useReducedMotion()
  const [scope, setScope] = useState<AssignedTeamScope>('client')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(assignedTeamMembers[0].id)

  const members = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return assignedTeamMembers.filter(member => {
      const matchesFilter = filter === 'all' || member.health === filter

      const matchesQuery =
        !normalized ||
        [member.name, member.role, member.space, ...member.skills].some(value => value.toLowerCase().includes(normalized))

      return matchesFilter && matchesQuery
    })
  }, [filter, query])

  useEffect(() => {
    if (!members.some(member => member.id === selectedId)) {
      setSelectedId(members[0]?.id ?? assignedTeamMembers[0].id)
    }
  }, [members, selectedId])

  const selectedMember = members.find(member => member.id === selectedId) ?? assignedTeamMembers[0]
  const activeTalent = assignedTeamMembers.length
  const activeFte = assignedTeamMembers.reduce((sum, member) => sum + member.allocationFte, 0)
  const averageCoverage = Math.round(assignedTeamMembers.reduce((sum, member) => sum + member.coveragePct, 0) / assignedTeamMembers.length)
  const averageConfidence = Math.round(assignedTeamMembers.reduce((sum, member) => sum + member.deliveryConfidence, 0) / assignedTeamMembers.length)
  const seniorTalent = assignedTeamMembers.filter(member => member.role.includes('Lead') || member.role.includes('Senior')).length
  const riskCount = assignedTeamMembers.filter(member => member.health !== 'healthy').length

  return (
    <MotionBox
      data-capture='assigned-team-command-portfolio-mockup'
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: MOTION_DURATION_S.long, ease }}
      sx={{
        bgcolor: 'background.paper',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: radiusCss(theme.shape.customBorderRadius.md),
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <Stack spacing={0}>
        <Box data-capture='assigned-team-masthead' sx={{ px: { xs: 4, md: 5 }, py: { xs: 4, md: 4.5 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between'>
            <Stack direction='row' spacing={4} alignItems='center' sx={{ minWidth: 0, flex: 1 }}>
              <Stack spacing={1.75} sx={{ minWidth: 0 }}>
                <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap'>
                  <Typography variant='surfaceHeroTitle' sx={{ overflowWrap: 'anywhere' }}>
                    Equipo asignado
                  </Typography>
                  <CustomChip
                    round='true'
                    size='small'
                    color='primary'
                    variant='tonal'
                    label='Vista de capacidad'
                    sx={tonalChipSx('primary')}
                  />
                </Stack>
                <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 680 }}>
                  Cobertura, continuidad y señales del equipo activo para tomar decisiones de staffing sin esperar el reporte semanal.
                </Typography>
                <Stack direction='row' spacing={2.5} alignItems='center' flexWrap='wrap'>
                  <Stack direction='row' spacing={1} alignItems='center' sx={{ color: 'text.secondary' }}>
                    <i className='tabler-layout-grid' aria-hidden='true' />
                    <Typography variant='body2' color='inherit'>4 spaces</Typography>
                  </Stack>
                  <FreshnessChip />
                </Stack>
                <ScopeSwitcher selected={scope} onChange={setScope} />
              </Stack>
            </Stack>
            <TeamHealthSummary riskCount={riskCount} animate={!reducedMotion} />
          </Stack>
        </Box>

        <Box sx={{ borderBlockStart: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.text.primary, 0.012) }}>
          <Box
            data-capture='assigned-team-kpi-strip'
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(6, minmax(0, 1fr))' }
            }}
          >
            {[
              <KpiCard key='talent' icon='tabler-users-group' label='Talento activo' value={activeTalent} detail='7 roles · 4 spaces' tone='primary' />,
              <KpiCard key='fte' icon='tabler-user-check' label='FTE activa' value={activeFte} detail='208.6 h planificadas' tone='info' formatter={formatFte} />,
              <KpiCard key='coverage' icon='tabler-shield-check' label='Capacidad cubierta' value={averageCoverage} detail='↑ 5 pp vs. semana anterior' tone='primary' formatter={value => `${Math.round(value)}%`} />,
              <KpiCard key='seniority' icon='tabler-badge' label='Seniority mix' value={seniorTalent} detail='Senior+ visibles' tone='secondary' />,
              <KpiCard key='confidence' icon='tabler-chart-line' label='Confianza de entrega' value={averageConfidence} detail='Confianza alta' tone='info' formatter={value => `${Math.round(value)}%`} />,
              <KpiCard key='risk' icon='tabler-alert-triangle' label='Riesgo operativo' value={riskCount} detail='Señales activas' tone='warning' />
            ].map((node, index) => (
              <Box
                key={node.key}
                sx={{
                  borderInlineStart: { lg: index === 0 ? 0 : `1px solid ${theme.palette.divider}` },
                  borderBlockStart: { xs: index === 0 ? 0 : `1px solid ${theme.palette.divider}`, lg: 0 }
                }}
              >
                {node}
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(318px, 0.42fr)' },
            borderBlockStart: `1px solid ${theme.palette.divider}`
          }}
        >
          <Box
            component='main'
            data-capture='assigned-team-roster'
            sx={{
              minWidth: 0,
              borderInlineEnd: { lg: `1px solid ${theme.palette.divider}` }
            }}
          >
            <Box sx={{ px: { xs: 4, md: 5 }, py: { xs: 4, md: 5 } }}>
              <Stack spacing={4}>
                <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between' spacing={3}>
                  <Stack spacing={1} sx={{ minWidth: 0 }}>
                    <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
                      <Typography variant='h4'>Talento asignado ({members.length})</Typography>
                      <CustomChip round='true' size='small' color='primary' variant='tonal' label='Listo' sx={tonalChipSx('primary')} />
                    </Stack>
                    <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 760 }}>
                      Cobertura, asignación, continuidad y señales de riesgo del equipo activo.
                    </Typography>
                    <HealthFilterGroup selected={filter} onChange={setFilter} />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <CustomTextField
                      id='assigned-team-search-input'
                      value={query}
                      onChange={event => setQuery(event.target.value)}
                      placeholder='Buscar persona, rol o habilidad'
                      size='small'
                      aria-label={ariaLabels.search}
                      InputProps={{ startAdornment: <i className='tabler-search' aria-hidden='true' /> }}
                      sx={{ minInlineSize: { sm: 250 } }}
                    />
                    <GreenhouseButton kind='filter' variant='outlined' leadingIconClassName='tabler-filter'>
                      Filtros
                    </GreenhouseButton>
                    <Tooltip title='Opciones de vista'>
                      <CustomIconButton aria-label={ariaLabels.viewOptions} variant='outlined' color='secondary'>
                        <i className='tabler-dots-vertical' />
                      </CustomIconButton>
                    </Tooltip>
                  </Stack>
                </Stack>

                <Box
                  sx={{
                    display: { xs: 'none', md: 'grid' },
                    gridTemplateColumns: rosterGridColumns,
                    gap: 2,
                    px: 3,
                    py: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: radiusCss(theme.shape.customBorderRadius.lg)
                  }}
                >
                  {['Persona', 'Space', 'Cobertura', 'Habilidades clave', 'Salud'].map(label => (
                    <Typography key={label} variant='caption' color='text.secondary' sx={{ fontWeight: 600 }}>
                      {label}
                    </Typography>
                  ))}
                </Box>

                <Stack divider={<Divider flexItem />} spacing={0}>
                  {members.map(member => (
                    <TeamMemberRow
                      key={member.id}
                      member={member}
                      selected={selectedMember.id === member.id}
                      onSelect={() => setSelectedId(member.id)}
                      reducedMotion={reducedMotion}
                    />
                  ))}
                </Stack>

                <RosterContinuityPanel selectedMember={selectedMember} />
              </Stack>
            </Box>
          </Box>

          <Box data-capture='assigned-team-side-rail' sx={{ p: { xs: 4, xl: 4 } }}>
            <Stack spacing={4}>
              <TeamHealthCard />
              <TalentInspector member={selectedMember} />
            </Stack>
          </Box>
        </Box>

        <Box
          data-capture='assigned-team-intelligence-band'
          sx={{
            borderBlockStart: `1px solid ${theme.palette.divider}`,
            px: { xs: 4, md: 5 },
            py: { xs: 4, md: 5 },
            bgcolor: alpha(theme.palette.text.primary, 0.012)
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 0.82fr) minmax(320px, 0.48fr)' },
              gap: 4,
              alignItems: 'start'
            }}
          >
            <CapabilityCoverageCard />
            <AttentionListCard />
          </Box>
        </Box>
      </Stack>

      <Box role='status' aria-live='polite' sx={{ position: 'absolute', inlineSize: 1, blockSize: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        Talento seleccionado: {selectedMember.name}
      </Box>
    </MotionBox>
  )
}

export default AssignedTeamCommandPortfolioMockupView
