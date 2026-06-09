'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'

import { formatNumber } from '@/lib/format'
import GreenhouseVerificationBadge from './GreenhouseVerificationBadge'

export type GreenhouseTalentDossierTone = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
export type GreenhouseTalentProfileDossierVariant = 'enterpriseCard'
export type GreenhouseTalentProfileDossierKind = 'assignedTeamTalent' | 'candidateTalent' | 'deliveryTalent' | 'custom'
export type GreenhouseTalentProfileHealth = 'healthy' | 'watch' | 'critical'

export type GreenhouseTalentProfileMetric = {
  label: string
  value: string
  icon: string
  tone: GreenhouseTalentDossierTone
}

export type GreenhouseTalentProfileDossierTalent = {
  id: string
  name: string
  initials: string
  role: string
  space: string
  roleLabel: string
  roleIcon: string
  roleTone: GreenhouseTalentDossierTone
  healthLabel: string
  healthIcon: string
  healthTone: GreenhouseTalentDossierTone
  allocationFte: number
  coveragePct: number
  deliveryConfidence: number
  backupDepth: string
  skills: string[]
  certifications?: string[]
  languages?: string[]
  currentFocus: string
  lastSignal: string
}

export type GreenhouseTalentProfileDossierProps = {
  talent: GreenhouseTalentProfileDossierTalent
  variant?: GreenhouseTalentProfileDossierVariant
  kind?: GreenhouseTalentProfileDossierKind
  dataCapture?: string
  sx?: SxProps<Theme>
}

type SkillVisual = {
  iconClassName?: string
  fallbackIconClassName: string
  tone: GreenhouseTalentDossierTone
}

const radiusCss = (value: string | number) => (typeof value === 'number' ? `${value}px` : value)
const inkColor = (theme: Theme) => (theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.grey[900])

const formatFte = (value: number) =>
  formatNumber(value, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1
  })

const tonalChipSx = (tone: GreenhouseTalentDossierTone = 'secondary') => (theme: Theme) => ({
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
  ux: { fallbackIconClassName: 'tabler-user-heart', tone: 'info' },
  'test automation': { fallbackIconClassName: 'tabler-automation', tone: 'info' },
  cypress: { iconClassName: 'logos-cypress-icon', fallbackIconClassName: 'tabler-brand-cypress', tone: 'success' },
  jenkins: { iconClassName: 'logos-jenkins', fallbackIconClassName: 'tabler-tool', tone: 'error' },
  python: { iconClassName: 'logos-python', fallbackIconClassName: 'tabler-brand-python', tone: 'primary' },
  dbt: { iconClassName: 'logos-dbt-icon', fallbackIconClassName: 'tabler-database-cog', tone: 'warning' },
  snowflake: { iconClassName: 'logos-snowflake-icon', fallbackIconClassName: 'tabler-brand-snowflake', tone: 'info' },
  terraform: { iconClassName: 'logos-terraform-icon', fallbackIconClassName: 'tabler-stack-2', tone: 'secondary' },
  kubernetes: { iconClassName: 'logos-kubernetes', fallbackIconClassName: 'tabler-cloud-cog', tone: 'primary' },
  bpmn: { fallbackIconClassName: 'tabler-route', tone: 'info' },
  jira: { iconClassName: 'logos-jira', fallbackIconClassName: 'tabler-brand-jira', tone: 'primary' },
  confluence: { iconClassName: 'logos-confluence', fallbackIconClassName: 'tabler-notes', tone: 'primary' }
}

const resolveSkillVisual = (label: string) => {
  const normalizedLabel = normalizeSkillLabel(label)

  return (
    skillVisualRegistry[normalizedLabel] ||
    Object.entries(skillVisualRegistry).find(([key]) => normalizedLabel.includes(key))?.[1] || {
      fallbackIconClassName: 'tabler-certificate',
      tone: 'secondary' as const
    }
  )
}

const StatusIcon = ({ icon, tone }: { icon: string; tone: GreenhouseTalentDossierTone }) => {
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
            boxShadow: `0 0 0 3px ${alpha(theme.palette[visual.tone].main, 0.08)}`,
            transform: 'translateY(-1px)'
          },
          transition: theme.transitions.create(['background-color', 'box-shadow', 'transform'], {
            duration: theme.transitions.duration.shorter
          })
        })}
      >
        <i className={visual.iconClassName || visual.fallbackIconClassName} aria-hidden='true' />
      </Box>
    </Tooltip>
  )
}

const TalentAvatar = ({ talent, size = 58 }: { talent: GreenhouseTalentProfileDossierTalent; size?: number }) => {
  const theme = useTheme()

  return (
    <CustomAvatar
      skin='light'
      color={talent.roleTone}
      sx={{
        inlineSize: size,
        blockSize: size,
        border: `1px solid ${alpha(theme.palette[talent.roleTone].main, 0.24)}`,
        color: inkColor(theme),
        bgcolor: 'background.paper',
        boxShadow: `inset 3px 0 0 ${alpha(theme.palette[talent.roleTone].main, 0.8)}`,
        fontWeight: 600
      }}
    >
      {talent.initials}
    </CustomAvatar>
  )
}

const CapacityCoverageBar = ({ value, label }: { value: number; label: string }) => {
  const theme = useTheme()
  const tone: GreenhouseTalentDossierTone = value >= 90 ? 'primary' : value >= 78 ? 'warning' : 'error'

  return (
    <Box>
      <Stack direction='row' justifyContent='space-between' alignItems='center' className='mbe-1'>
        <Typography variant='h6' color='text.primary'>
          {label}
        </Typography>
        <Typography variant='monoId' color='text.primary'>
          {value}%
        </Typography>
      </Stack>
      <Box
        role='meter'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(value, 100)}
        aria-label={`${label}: ${value}%`}
        sx={{
          blockSize: 9,
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
            transition: theme.transitions.create('inline-size', { duration: theme.transitions.duration.standard })
          }
        }}
      />
    </Box>
  )
}

/**
 * GreenhouseTalentProfileDossier
 *
 * Canonical enterprise profile card for verified talent dossiers. Domain readers
 * own truth/provenance; this primitive owns hierarchy, density, verification
 * affordance, stack evidence and responsive card behavior.
 */
const GreenhouseTalentProfileDossier = ({
  talent,
  variant = 'enterpriseCard',
  kind = 'assignedTeamTalent',
  dataCapture,
  sx
}: GreenhouseTalentProfileDossierProps) => {
  const theme = useTheme()
  const backupValue = Number.parseFloat(talent.backupDepth)
  const backupTone: GreenhouseTalentDossierTone = backupValue >= 1.8 ? 'success' : backupValue >= 1.2 ? 'warning' : 'error'
  const certificationLabel = talent.certifications?.join(' · ') ?? ''
  const languageLabel = talent.languages?.join(' · ') ?? ''

  const metricItems: GreenhouseTalentProfileMetric[] = [
    { label: 'FTE', value: formatFte(talent.allocationFte), icon: 'tabler-user-check', tone: 'info' },
    { label: 'Confianza', value: `${talent.deliveryConfidence}%`, icon: 'tabler-shield-check', tone: talent.healthTone },
    { label: 'Backup', value: talent.backupDepth, icon: 'tabler-users-plus', tone: backupTone }
  ]

  return (
    <Card
      variant='outlined'
      data-profile-variant={variant}
      data-profile-kind={kind}
      data-capture={dataCapture}
      sx={[
        {
          borderRadius: radiusCss(theme.shape.customBorderRadius.md),
          boxShadow: theme.greenhouseElevation.none.boxShadow,
          overflow: 'hidden',
          borderColor: alpha(theme.palette.divider, 0.95),
          bgcolor: 'background.paper'
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <CardContent sx={{ p: 0 }}>
        <Stack spacing={0}>
          <Box
            sx={{
              p: 3.5,
              borderBottom: `1px solid ${theme.palette.divider}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette[talent.roleTone].main, 0.045)}, ${alpha(theme.palette[talent.healthTone].main, 0.03)} 52%, ${theme.palette.background.paper})`
            }}
          >
            <Stack spacing={2.25}>
              <Stack direction='row' spacing={1.5} alignItems='center' justifyContent='space-between'>
                <Typography variant='h6' color='text.primary'>
                  Dossier de talento
                </Typography>
                <CustomChip
                  round='true'
                  size='small'
                  color={talent.healthTone}
                  variant='tonal'
                  icon={<i className={talent.healthIcon} aria-hidden='true' />}
                  label={talent.healthLabel}
                  sx={tonalChipSx(talent.healthTone)}
                />
              </Stack>
              <Stack direction='row' spacing={2.5} alignItems='center'>
                <TalentAvatar talent={talent} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant='h5' color='text.primary'>
                    {talent.name}
                  </Typography>
                  <Typography variant='body2' color='text.primary' sx={{ mt: 0.5 }}>
                    {talent.role} · {talent.space}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Box>

          <Stack
            direction='row'
            spacing={1.25}
            flexWrap='wrap'
            useFlexGap
            sx={{
              px: 3.5,
              py: 2.25,
              borderBottom: `1px solid ${theme.palette.divider}`
            }}
          >
            <CustomChip
              round='true'
              size='small'
              color={talent.roleTone}
              variant='tonal'
              icon={<i className={talent.roleIcon} aria-hidden='true' />}
              label={talent.roleLabel}
              sx={tonalChipSx(talent.roleTone)}
            />
            <GreenhouseVerificationBadge kind='talentVerified' size='small' />
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              borderBottom: `1px solid ${theme.palette.divider}`
            }}
          >
            {metricItems.map((item, index) => (
              <Box
                key={item.label}
                sx={{
                  minWidth: 0,
                  px: 2.75,
                  py: 2.25,
                  borderInlineStart: index === 0 ? 'none' : `1px solid ${theme.palette.divider}`
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'auto minmax(0, 1fr)',
                    columnGap: 1.25,
                    rowGap: 0.5,
                    alignItems: 'center'
                  }}
                >
                  <Box
                    component='span'
                    aria-hidden='true'
                    sx={{
                      gridColumn: 1,
                      gridRow: '1 / span 2',
                      alignSelf: 'start',
                      inlineSize: 22,
                      blockSize: 22,
                      borderRadius: radiusCss(theme.shape.customBorderRadius.sm),
                      display: 'grid',
                      placeItems: 'center',
                      color: alpha(theme.palette[item.tone].dark, 0.9),
                      bgcolor: alpha(theme.palette[item.tone].main, 0.065),
                      '& i': { fontSize: 14, lineHeight: 1 }
                    }}
                  >
                    <i className={item.icon} />
                  </Box>
                  <Box sx={{ gridColumn: 2, minWidth: 0 }}>
                    <Typography variant='h6' color='text.primary'>
                      {item.label}
                    </Typography>
                  </Box>
                  <Typography variant='monoId' color='text.primary' sx={{ gridColumn: 2 }}>
                    {item.value}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          <Stack spacing={3} sx={{ p: 3.5 }}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: radiusCss(theme.shape.customBorderRadius.sm),
                bgcolor: alpha(theme.palette.primary.main, 0.045),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`
              }}
            >
              <CapacityCoverageBar value={talent.coveragePct} label='Cobertura del talento' />
            </Box>

            <Stack spacing={2.25}>
              <Stack direction='row' spacing={1.75} alignItems='flex-start'>
                <StatusIcon icon='tabler-target-arrow' tone={talent.roleTone} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='h6' color='text.primary'>
                    Foco actual
                  </Typography>
                  <Typography variant='body2' sx={{ color: inkColor(theme), mt: 0.25 }}>
                    {talent.currentFocus}
                  </Typography>
                </Box>
              </Stack>
              <Divider />
              <Stack direction='row' spacing={1.75} alignItems='flex-start'>
                <StatusIcon icon='tabler-certificate' tone='info' />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='h6' color='text.primary'>
                    Stack verificado
                  </Typography>
                  <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ mt: 1 }}>
                    {talent.skills.map(item => (
                      <SkillMark key={item} label={item} />
                    ))}
                  </Stack>
                  {certificationLabel || languageLabel ? (
                    <Stack
                      direction='row'
                      spacing={1.5}
                      flexWrap='wrap'
                      useFlexGap
                      sx={{
                        mt: 1.5,
                        pt: 1.5,
                        borderTop: `1px solid ${theme.palette.divider}`
                      }}
                    >
                      {certificationLabel ? (
                        <Stack direction='row' spacing={0.75} alignItems='center' sx={{ minWidth: 0 }}>
                          <i className='tabler-certificate' aria-hidden='true' />
                          <Typography variant='caption' color='text.primary'>
                            {certificationLabel}
                          </Typography>
                        </Stack>
                      ) : null}
                      {languageLabel ? (
                        <Stack direction='row' spacing={0.75} alignItems='center'>
                          <i className='tabler-language' aria-hidden='true' />
                          <Typography variant='caption' color='text.primary'>
                            {languageLabel}
                          </Typography>
                        </Stack>
                      ) : null}
                    </Stack>
                  ) : null}
                </Box>
              </Stack>
            </Stack>

            <Box
              role='status'
              sx={{
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr)',
                gap: 1.75,
                alignItems: 'start',
                p: 2.5,
                borderRadius: radiusCss(theme.shape.customBorderRadius.sm),
                bgcolor: alpha(theme.palette[talent.healthTone].main, 0.06),
                border: `1px solid ${alpha(theme.palette[talent.healthTone].main, 0.18)}`
              }}
            >
              <StatusIcon icon='tabler-activity-heartbeat' tone={talent.healthTone} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant='h6' color='text.primary'>
                  Última señal
                </Typography>
                <Typography variant='body2' sx={{ color: inkColor(theme), mt: 0.25 }}>
                  {talent.lastSignal}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default GreenhouseTalentProfileDossier
