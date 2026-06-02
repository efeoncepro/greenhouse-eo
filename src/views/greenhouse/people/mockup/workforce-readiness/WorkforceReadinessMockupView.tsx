'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Collapse from '@mui/material/Collapse'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { alpha, useTheme } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'
import {
  OperationalPanel,
  OperationalStatusBadge,
  type OperationalStatusTone
} from '@/components/greenhouse/primitives'

import {
  baselineMetrics,
  dispositionCards,
  headerChips,
  readinessAria,
  remediationSteps,
  type DispositionCard,
  type GapSeverity,
  type ReadinessScope
} from './data'

const toneForSeverity = (severity: GapSeverity): OperationalStatusTone =>
  severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'primary'

const percentage = (value: number, total: number) => Math.round((value / Math.max(total, 1)) * 100)

const scopeOptions: Array<{ value: ReadinessScope; label: string; caption: string }> = [
  { value: 'real', label: 'Real active workers', caption: '9 active people' },
  { value: 'with-fixtures', label: 'Include fixtures', caption: 'Audit-only cohort' }
]

const BaselineCard = ({ metric }: { metric: (typeof baselineMetrics)[number] }) => {
  const progress = percentage(metric.value, metric.total)

  return (
    <Card
      sx={theme => ({
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        border: `1px solid ${alpha(theme.palette[metric.tone].main, metric.tone === 'success' ? 0.18 : 0.26)}`,
        boxShadow: 'none',
        transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[3],
          borderColor: alpha(theme.palette[metric.tone].main, 0.42)
        }
      })}
    >
      <CardContent>
        <Stack spacing={{ xs: 1.75, md: 2.25 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' spacing={1.5}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 700 }} noWrap>
                {metric.label}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {metric.caption}
              </Typography>
            </Box>
            <OperationalStatusBadge label={metric.trend} tone={metric.tone} />
          </Stack>

          <Box>
            <Stack direction='row' alignItems='baseline' spacing={0.75}>
              <Typography variant='h4' sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', md: '1.5rem' } }}>
                {metric.value}
              </Typography>
              <Typography color='text.secondary'>/ {metric.total}</Typography>
            </Stack>
            <LinearProgress
              variant='determinate'
              value={progress}
              color={metric.tone === 'secondary' ? 'primary' : metric.tone}
              sx={{ height: 6, borderRadius: 999, mt: 1.5 }}
            />
          </Box>

          <Typography variant='caption' color='text.secondary' noWrap>
            Source: {metric.source}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}

const ScopeToggle = ({
  scope,
  onChange
}: {
  scope: ReadinessScope
  onChange: (scope: ReadinessScope) => void
}) => (
  <Stack
    direction='row'
    spacing={1}
    sx={theme => ({
      width: { xs: '100%', sm: 'auto' },
      p: 0.5,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      bgcolor: alpha(theme.palette.background.paper, 0.72)
    })}
  >
    {scopeOptions.map(option => {
      const active = option.value === scope

      return (
        <Button
          key={option.value}
          variant={active ? 'contained' : 'text'}
          color={active ? 'primary' : 'secondary'}
          onClick={() => onChange(option.value)}
          size='small'
          sx={{
            minWidth: { xs: 0, sm: 154 },
            flex: { xs: 1, sm: '0 0 auto' },
            px: 2,
            py: 1,
            justifyContent: 'flex-start'
          }}
        >
          <Stack spacing={0} alignItems='flex-start'>
            <Typography variant='caption' sx={{ fontWeight: 800, color: 'inherit', fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>
              {option.label}
            </Typography>
            <Typography variant='caption' sx={{ color: 'inherit', opacity: 0.72, fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>
              {option.caption}
            </Typography>
          </Stack>
        </Button>
      )
    })}
  </Stack>
)

const Header = ({ scope, onScopeChange }: { scope: ReadinessScope; onScopeChange: (scope: ReadinessScope) => void }) => (
  <Card
    data-capture='workforce-readiness-header'
    sx={theme => ({
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      overflow: 'hidden',
      border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`
    })}
  >
    <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent='space-between' spacing={3}>
        <Stack spacing={1.5} sx={{ minWidth: 0 }}>
          <Button
            component={Link}
            href='/people/mockup/workforce-command'
            variant='text'
            color='secondary'
            size='small'
            startIcon={<i className='tabler-arrow-left' aria-hidden='true' />}
            sx={{ alignSelf: 'flex-start', px: 0, fontSize: { xs: '0.875rem', md: '0.9375rem' } }}
          >
            Back to command center
          </Button>
          <Box>
            <Typography variant='h4' sx={{ fontWeight: 800, lineHeight: 1.15, fontSize: { xs: '1.45rem', md: '1.5rem' } }}>
              Workforce readiness
            </Typography>
            <Typography color='text.secondary' sx={{ fontSize: { xs: '0.9375rem', md: '1rem' } }}>
              Diagnostic control room · read-only · May 31st 2026 11:08
            </Typography>
          </Box>
          <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
            {headerChips.map(chip => (
              <OperationalStatusBadge
                key={chip.label}
                label={chip.label}
                tone={chip.status}
                icon={chip.icon}
              />
            ))}
          </Stack>
        </Stack>

        <ScopeToggle scope={scope} onChange={onScopeChange} />
      </Stack>
    </CardContent>
  </Card>
)

const DispositionBoard = ({
  selected,
  scope,
  onSelect
}: {
  selected: DispositionCard
  scope: ReadinessScope
  onSelect: (disposition: DispositionCard) => void
}) => {
  const cards = scope === 'real' ? dispositionCards.filter(card => card.id !== 'fixture_excluded') : dispositionCards

  return (
    <OperationalPanel
      title='Disposition board'
      subheader='Classify gaps before opening remediation work.'
      icon='tabler-layout-kanban'
      iconColor='warning'
      action={<OperationalStatusBadge label={`${cards.length} views`} tone='warning' icon='tabler-filter' />}
    >
      <Stack spacing={2.5} data-capture='workforce-readiness-disposition-board'>
        {cards.map(card => {
          const active = selected.id === card.id

          return (
            <Box
              key={card.id}
              role='button'
              tabIndex={0}
              onClick={() => onSelect(card)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') onSelect(card)
              }}
              sx={theme => ({
                p: 3,
                borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                border: `1px solid ${active ? alpha(theme.palette[card.tone].main, 0.44) : theme.palette.divider}`,
                bgcolor: active ? alpha(theme.palette[card.tone].main, 0.08) : 'background.paper',
                cursor: 'pointer',
                transition: 'transform 160ms ease, border-color 160ms ease, background-color 160ms ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  borderColor: alpha(theme.palette[card.tone].main, 0.4)
                }
              })}
            >
              <Stack spacing={2}>
                <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
                  <Stack direction='row' alignItems='center' spacing={1.5} sx={{ minWidth: 0 }}>
                    <CustomAvatar skin='light' color={card.tone} variant='rounded' size={38}>
                      <i className={card.count === 0 ? 'tabler-circle-check' : 'tabler-alert-triangle'} aria-hidden='true' />
                    </CustomAvatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant='subtitle2' sx={{ fontWeight: 800 }} noWrap>
                        {card.label}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Owner: {card.owner}
                      </Typography>
                    </Box>
                  </Stack>
                  <OperationalStatusBadge label={`${card.count}`} tone={card.tone} />
                </Stack>
                <Typography variant='body2' color='text.secondary'>
                  {card.summary}
                </Typography>
                <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
                  <OperationalStatusBadge label={card.severity} tone={toneForSeverity(card.severity)} />
                  <OperationalStatusBadge label={`${card.sourceCodes.length} codes`} tone='secondary' icon='tabler-code' />
                </Stack>
              </Stack>
            </Box>
          )
        })}
      </Stack>
    </OperationalPanel>
  )
}

const DetailPanel = ({ disposition, expanded, onToggle }: { disposition: DispositionCard; expanded: boolean; onToggle: () => void }) => (
  <OperationalPanel
    title='Gap detail'
    subheader='Evidence sample and next safe action.'
    icon='tabler-zoom-check'
    iconColor={disposition.tone}
    action={
      <IconButton size='small' onClick={onToggle} aria-label={readinessAria.toggleEvidenceDetails}>
        <i className={expanded ? 'tabler-chevron-up' : 'tabler-chevron-down'} aria-hidden='true' />
      </IconButton>
    }
  >
    <Stack spacing={3} data-capture='workforce-readiness-gap-detail'>
      <Stack spacing={1.5}>
        <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
          <OperationalStatusBadge label={disposition.owner} tone='secondary' icon='tabler-user-shield' />
          <OperationalStatusBadge label={disposition.severity} tone={toneForSeverity(disposition.severity)} />
          <OperationalStatusBadge label={`${disposition.count} open`} tone={disposition.tone} />
        </Stack>
        <Typography variant='body2'>{disposition.nextAction}</Typography>
      </Stack>

      <Collapse in={expanded} timeout={180}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
              Source codes
            </Typography>
            <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap' sx={{ mt: 1 }}>
              {disposition.sourceCodes.map(code => (
                <OperationalStatusBadge key={code} label={code} tone='secondary' icon='tabler-binary-tree' />
              ))}
            </Stack>
          </Box>

          {disposition.samples.length ? (
            disposition.samples.map(sample => (
              <Box
                key={sample.id}
                sx={theme => ({
                  p: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  bgcolor: alpha(theme.palette.background.default, 0.56)
                })}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' spacing={2}>
                  <Box>
                    <Typography variant='subtitle2' sx={{ fontWeight: 800 }}>
                      {sample.person}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {sample.maskedRef} · {sample.rail}
                    </Typography>
                  </Box>
                  <OperationalStatusBadge label={sample.state} tone={disposition.tone} />
                </Stack>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1.5 }}>
                  {sample.evidence}
                </Typography>
              </Box>
            ))
          ) : (
            <Box
              sx={theme => ({
                p: 4,
                textAlign: 'center',
                border: `1px dashed ${theme.palette.divider}`,
                borderRadius: `${theme.shape.customBorderRadius.md}px`
              })}
            >
              <Typography variant='subtitle2' sx={{ fontWeight: 800 }}>
                No open gap in this filter
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                This is the steady-state validation view.
              </Typography>
            </Box>
          )}
        </Stack>
      </Collapse>
    </Stack>
  </OperationalPanel>
)

const RemediationQueue = () => (
  <OperationalPanel
    title='Remediation plan preview'
    subheader='Read-only queue. No fix controls live here.'
    icon='tabler-route'
    iconColor='primary'
  >
    <Stack spacing={2.25} data-capture='workforce-readiness-remediation-queue'>
      {remediationSteps.map(step => (
        <Box
          key={step.id}
          sx={theme => ({
            p: 2.5,
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            border: `1px solid ${theme.palette.divider}`
          })}
        >
          <Stack direction='row' spacing={2} alignItems='flex-start'>
            <CustomAvatar
              skin='light'
              color={step.status === 'ready' ? 'success' : step.status === 'blocked' ? 'warning' : 'primary'}
              variant='rounded'
              size={34}
            >
              <i className={step.status === 'blocked' ? 'tabler-lock' : 'tabler-list-check'} aria-hidden='true' />
            </CustomAvatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction='row' spacing={1} alignItems='center' useFlexGap flexWrap='wrap'>
                <Typography variant='subtitle2' sx={{ fontWeight: 800 }}>
                  {step.task}
                </Typography>
                <OperationalStatusBadge
                  label={step.status}
                  tone={step.status === 'ready' ? 'success' : step.status === 'blocked' ? 'warning' : 'primary'}
                />
              </Stack>
              <Typography variant='body2'>{step.label}</Typography>
              <Typography variant='caption' color='text.secondary'>
                {step.owner} · {step.reason}
              </Typography>
            </Box>
          </Stack>
        </Box>
      ))}
    </Stack>
  </OperationalPanel>
)

const BoundaryNote = () => (
  <Box
    data-capture='workforce-readiness-boundary'
    sx={theme => ({
      border: `1px solid ${alpha(theme.palette.warning.main, 0.24)}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      bgcolor: alpha(theme.palette.warning.main, 0.05),
      p: 3
    })}
  >
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ md: 'center' }}>
      <Stack direction='row' spacing={1.5} alignItems='center'>
        <CustomAvatar skin='light' color='warning' variant='rounded' size={34}>
          <i className='tabler-shield-lock' aria-hidden='true' />
        </CustomAvatar>
        <Box>
          <Typography variant='subtitle2' sx={{ fontWeight: 800 }}>
            Diagnostic only
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            This surface classifies gaps. Domain commands, payroll recalculation, payment execution and document signing remain in owning rails.
          </Typography>
        </Box>
      </Stack>
      <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
        <OperationalStatusBadge label='No inline fixes' tone='warning' />
        <OperationalStatusBadge label='Masked samples' tone='secondary' />
        <OperationalStatusBadge label='Owner required' tone='primary' />
      </Stack>
    </Stack>
  </Box>
)

const SelectedDispositionDrawer = ({
  disposition,
  open,
  onClose
}: {
  disposition: DispositionCard
  open: boolean
  onClose: () => void
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      PaperProps={{
        'data-capture': 'workforce-readiness-drawer',
        sx: {
          width: { xs: '100%', md: 520 },
          maxHeight: { xs: '88vh', md: '100%' },
          borderTopLeftRadius: { xs: 16, md: 0 },
          borderTopRightRadius: { xs: 16, md: 0 }
        }
      }}
    >
      <Stack spacing={3} sx={{ p: 4 }}>
        <Stack direction='row' justifyContent='space-between' spacing={2}>
          <Box>
            <Typography variant='h5' sx={{ fontWeight: 800 }}>
              {disposition.label}
            </Typography>
            <Typography color='text.secondary'>{disposition.owner}</Typography>
          </Box>
          <IconButton onClick={onClose} aria-label={readinessAria.closeReadinessDetail}>
            <i className='tabler-x' aria-hidden='true' />
          </IconButton>
        </Stack>
        <DetailPanel disposition={disposition} expanded onToggle={() => undefined} />
      </Stack>
    </Drawer>
  )
}

const WorkforceReadinessMockupView = () => {
  const [scope, setScope] = useState<ReadinessScope>('real')
  const [selectedId, setSelectedId] = useState<DispositionCard['id']>('source_data_debt')
  const [detailsOpen, setDetailsOpen] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))

  const selectedDisposition = useMemo(
    () => dispositionCards.find(card => card.id === selectedId) ?? dispositionCards[0],
    [selectedId]
  )

  const handleSelectDisposition = (disposition: DispositionCard) => {
    setSelectedId(disposition.id)
    if (!isDesktop) setDrawerOpen(true)
  }

  return (
    <Box data-capture='workforce-readiness-mockup' sx={{ maxWidth: '100%', overflowX: 'clip', pb: 8 }}>
      <Stack spacing={4}>
        <Header scope={scope} onScopeChange={setScope} />

        <Box
          data-capture='workforce-readiness-baseline-matrix'
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(5, minmax(0, 1fr))' },
            gap: 3
          }}
        >
          {baselineMetrics.map(metric => (
            <BaselineCard key={metric.id} metric={metric} />
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.05fr) minmax(360px, 0.95fr)' },
            gap: 4,
            alignItems: 'start'
          }}
        >
          <DispositionBoard selected={selectedDisposition} scope={scope} onSelect={handleSelectDisposition} />

          <Stack spacing={4}>
            <DetailPanel disposition={selectedDisposition} expanded={detailsOpen} onToggle={() => setDetailsOpen(open => !open)} />
            <RemediationQueue />
          </Stack>
        </Box>

        <BoundaryNote />
      </Stack>

      <SelectedDispositionDrawer disposition={selectedDisposition} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </Box>
  )
}

export default WorkforceReadinessMockupView
