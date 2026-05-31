'use client'

import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'

import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'

import NexaInsightsBlock from '@/components/greenhouse/NexaInsightsBlock'
import {
  ContextChipStrip,
  MetricSummaryCard,
  OperationalPanel,
  OperationalSignalList,
  OperationalStatusBadge
} from '@/components/greenhouse/primitives'
import { getMicrocopy } from '@/lib/copy'
import { formatCurrency } from '@/lib/format'

import {
  compensationFacts,
  danielaProfile,
  documents,
  navSections,
  nexaMockInsights,
  operationalContext,
  operationalMetrics,
  preservedPeopleSurfaces,
  quickActions,
  readinessSignals,
  relationshipFacts,
  timeline,
  workforceSnapshot,
  type MockupTone,
  type WorkforceFact,
  type WorkforceTimelineEvent
} from './data'

const copy = getMicrocopy()
const sectionIds = navSections.map(section => section.id)

const scrollToSection = (sectionId: string) => {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const SectionTitle = ({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    alignItems={{ xs: 'flex-start', sm: 'center' }}
    justifyContent='space-between'
    spacing={3}
    sx={{ mb: 4 }}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography variant='overline' color='text.secondary'>
        {eyebrow}
      </Typography>
      <Typography variant='h5'>{title}</Typography>
      <Typography variant='body2' color='text.secondary'>
        {description}
      </Typography>
    </Box>
    {action}
  </Stack>
)

const FactGrid = ({ facts }: { facts: WorkforceFact[] }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
      gap: 3
    }}
  >
    {facts.map(fact => (
      <Box
        key={`${fact.label}-${fact.value}`}
        sx={theme => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          p: 3,
          minWidth: 0,
          transition: 'border-color 160ms ease, background-color 160ms ease, transform 160ms ease',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          '&:hover': {
            borderColor: fact.tone ? theme.palette[fact.tone].main : theme.palette.primary.main,
            bgcolor: alpha(fact.tone ? theme.palette[fact.tone].main : theme.palette.primary.main, 0.04),
            transform: 'translateY(-1px)'
          }
        })}
      >
        <Stack spacing={1}>
          <Typography variant='caption' color='text.secondary'>
            {fact.label}
          </Typography>
          <Typography variant='subtitle1' sx={{ fontWeight: 700 }} noWrap>
            {fact.value}
          </Typography>
          {fact.meta ? (
            <Typography variant='caption' color='text.secondary'>
              {fact.meta}
            </Typography>
          ) : null}
        </Stack>
      </Box>
    ))}
  </Box>
)

const HeaderPanel = ({
  onEvidenceClick,
  onActionClick
}: {
  onEvidenceClick: (event: MouseEvent<HTMLDivElement>) => void
  onActionClick: () => void
}) => {
  const theme = useTheme()

  return (
    <Card
      data-capture='person-workforce-header'
      sx={{
        border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
        overflow: 'hidden',
        minWidth: 0
      }}
    >
      <CardContent sx={{ p: { xs: 4, md: 6 }, minWidth: 0, overflow: 'hidden' }}>
        <Stack spacing={5}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            alignItems={{ xs: 'flex-start', lg: 'center' }}
            justifyContent='space-between'
            spacing={4}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={4}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              sx={{ width: '100%', minWidth: 0 }}
            >
              <Avatar
                src={danielaProfile.avatarPath}
                alt={danielaProfile.name}
                sx={{
                  width: { xs: 116, md: 84 },
                  height: { xs: 116, md: 84 },
                  bgcolor: 'primary.lighter',
                  color: 'primary.main',
                  fontSize: 28,
                  fontWeight: 700,
                  border: theme => `1px solid ${theme.palette.divider}`
                }}
              >
                {danielaProfile.initials}
              </Avatar>
              <Stack spacing={2} sx={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
                <Button
                  component={Link}
                  href='/people'
                  variant='text'
                  color='secondary'
                  size='small'
                  startIcon={<i className='tabler-arrow-left' aria-hidden='true' />}
                  sx={{ alignSelf: 'flex-start', px: 0 }}
                >
                  Back to people
                </Button>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant='h3'
                    sx={{
                      mb: 1,
                      fontSize: { xs: '1.75rem', sm: '2.125rem', lg: undefined },
                      lineHeight: 1.15,
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {danielaProfile.name}
                  </Typography>
                  <Typography
                    variant='body1'
                    color='text.secondary'
                    sx={{ fontSize: { xs: '0.9375rem', sm: undefined }, overflowWrap: 'anywhere' }}
                  >
                    {danielaProfile.roleTitle} · {danielaProfile.location}
                  </Typography>
                </Box>
                <ContextChipStrip ariaLabel='Worker profile context' scrollMobile={false}>
                  <OperationalStatusBadge label='Active' tone='success' icon='tabler-circle-check' />
                  <OperationalStatusBadge label='Employee' tone='primary' icon='tabler-id-badge-2' />
                  <OperationalStatusBadge label='Spain' tone='info' icon='tabler-map-pin' />
                  <Box onClick={onEvidenceClick} sx={{ display: 'inline-flex', cursor: 'pointer' }}>
                    <OperationalStatusBadge label='High confidence' tone='success' icon='tabler-shield-check' />
                  </Box>
                  <OperationalStatusBadge label='Payroll external' tone='warning' icon='tabler-building-bank' />
                  <OperationalStatusBadge label={`ID ${danielaProfile.workerId}`} tone='secondary' icon='tabler-fingerprint' />
                </ContextChipStrip>
              </Stack>
            </Stack>

            <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap sx={{ width: { xs: '100%', lg: 'auto' } }}>
              <Button
                variant='contained'
                startIcon={<i className='tabler-pencil' aria-hidden='true' />}
                onClick={onActionClick}
                data-capture='person-workforce-primary-action'
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Edit worker
              </Button>
              <Button
                variant='tonal'
                color='secondary'
                startIcon={<i className='tabler-calendar-event' aria-hidden='true' />}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Team calendar
              </Button>
              <Button
                variant='tonal'
                color='secondary'
                startIcon={<i className='tabler-hierarchy-3' aria-hidden='true' />}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Org chart
              </Button>
              <Tooltip title='More actions'>
                <IconButton aria-label={copy.aria.moreActions}>
                  <i className='tabler-dots-vertical' aria-hidden='true' />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
              gap: 3,
              p: 4,
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              bgcolor: alpha(theme.palette.primary.main, 0.05)
            }}
          >
            <SummaryFact label='Start date' value={danielaProfile.startDate} icon='tabler-calendar-check' />
            <SummaryFact label='Manager' value={danielaProfile.manager} icon='tabler-user-star' />
            <SummaryFact label='Team' value={danielaProfile.team} icon='tabler-users-group' />
            <SummaryFact label='Last updated' value={danielaProfile.lastUpdated} icon='tabler-refresh' />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

const SummaryFact = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <Stack direction='row' spacing={2} alignItems='center' sx={{ minWidth: 0 }}>
    <CustomAvatar skin='light' color='primary' variant='rounded' sx={{ width: 34, height: 34 }}>
      <i className={icon} aria-hidden='true' />
    </CustomAvatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant='caption' color='text.secondary'>
        {label}
      </Typography>
      <Typography variant='body2' sx={{ fontWeight: 700 }} noWrap>
        {value}
      </Typography>
    </Box>
  </Stack>
)

const SectionNavigation = ({ activeSection }: { activeSection: string }) => (
  <Card
    component='nav'
    aria-label={copy.aria.breadcrumb}
    sx={{
      position: { lg: 'sticky' },
      top: { lg: 88 },
      borderRadius: 2,
      overflow: 'hidden'
    }}
  >
    <CardContent sx={{ p: 2 }}>
      <Stack spacing={1}>
        {navSections.map(section => {
          const active = activeSection === section.id

          return (
            <Button
              key={section.id}
              fullWidth
              variant={active ? 'tonal' : 'text'}
              color={active ? 'primary' : 'secondary'}
              startIcon={<i className={section.icon} aria-hidden='true' />}
              onClick={() => scrollToSection(section.id)}
              sx={{
                justifyContent: 'flex-start',
                minHeight: 40,
                px: 2,
                '& .MuiButton-startIcon': { mr: 2 }
              }}
            >
              {section.label}
            </Button>
          )
        })}
      </Stack>
    </CardContent>
  </Card>
)

const WorkforceSnapshotGrid = () => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' },
      gap: 4
    }}
  >
    {workforceSnapshot.map(item => (
      <MetricSummaryCard
        key={item.id}
        title={item.title}
        value={item.value}
        subtitle={item.subtitle}
        icon={item.icon}
        iconColor={item.iconColor}
        tooltip={item.tooltip}
        statusLabel={item.statusLabel}
        statusTone={item.statusTone}
        statusIcon={item.statusIcon}
      />
    ))}
  </Box>
)

const OperationalIntelligencePanel = () => (
  <OperationalPanel
    title='ICO and operational intelligence'
    subheader='Existing Person 360 operational metrics stay first-class. Workforce adds context; it does not replace ICO.'
    icon='tabler-activity-heartbeat'
    iconColor='primary'
    action={
      <Box sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
        <OperationalStatusBadge label='Preserved rail' tone='success' icon='tabler-shield-check' />
      </Box>
    }
  >
    <Stack spacing={4}>
      <NexaInsightsBlock
        insights={nexaMockInsights}
        totalAnalyzed={18}
        lastAnalysis='2026-05-31T10:42:00.000Z'
        runStatus='succeeded'
        defaultExpanded
        dataStatus='ready'
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' },
          gap: 4
        }}
      >
        {operationalMetrics.map(metric => (
          <MetricSummaryCard
            key={metric.id}
            title={metric.title}
            value={metric.value}
            subtitle={metric.subtitle}
            icon={metric.icon}
            iconColor={metric.iconColor}
            tooltip={metric.tooltip}
            statusLabel={metric.statusLabel}
            statusTone={metric.statusTone}
            statusIcon={metric.statusIcon}
          />
        ))}
      </Box>

      <Box
        sx={theme => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          p: 4,
          bgcolor: alpha(theme.palette.info.main, 0.04)
        })}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent='space-between'>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
              Operational radar remains available
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Radar, CSC distribution, trend lines, Nexa insights and delivery metrics continue as the operational view of the person.
            </Typography>
          </Box>
          <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap>
            <OperationalStatusBadge label='Radar' tone='primary' icon='tabler-radar' />
            <OperationalStatusBadge label='Trends' tone='info' icon='tabler-chart-line' />
            <OperationalStatusBadge label='Nexa' tone='warning' icon='tabler-sparkles' />
          </Stack>
        </Stack>
      </Box>

      <FactGrid facts={operationalContext} />
    </Stack>
  </OperationalPanel>
)

const PreservedPeopleSurfacesPanel = () => (
  <OperationalPanel
    title='Current People surfaces preserved'
    subheader='This is the no-regression map: the future profile unifies rails, it does not delete today’s user-level views.'
    icon='tabler-layout-list'
    iconColor='info'
    action={
      <Box sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
        <OperationalStatusBadge label='No-regression contract' tone='success' icon='tabler-circle-check' />
      </Box>
    }
  >
    <Stack spacing={3}>
      {preservedPeopleSurfaces.map(surface => (
        <Box
          key={surface.id}
          sx={theme => ({
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' },
            gap: 3,
            alignItems: 'flex-start',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            p: 3
          })}
        >
          <Stack direction='row' spacing={2} alignItems='center' sx={{ minWidth: 0 }}>
            <CustomAvatar skin='light' color={surface.tone} variant='rounded'>
              <i className={surface.icon} aria-hidden='true' />
            </CustomAvatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                {surface.currentTab}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Moves to: {surface.futurePlacement}
              </Typography>
            </Box>
          </Stack>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            {surface.mustKeep.map(item => (
              <CustomChip key={item} round='true' size='small' variant='tonal' color={surface.tone} label={item} />
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  </OperationalPanel>
)

const DocumentsPanel = () => (
  <OperationalPanel
    title='Documents and signatures'
    subheader='Evidence consumed from Document Vault and signature orchestration.'
    icon='tabler-file-certificate'
    iconColor='primary'
    action={<OperationalStatusBadge label='3 of 4 ready' tone='warning' icon='tabler-alert-circle' />}
  >
    <Stack spacing={2}>
      {documents.map(document => (
        <Box
          key={document.id}
          sx={theme => ({
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.2fr) 120px 130px' },
            gap: 3,
            alignItems: 'center',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            p: 3,
            transition: 'border-color 160ms ease, background-color 160ms ease',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            '&:hover': {
              borderColor: theme.palette.primary.main,
              bgcolor: alpha(theme.palette.primary.main, 0.04)
            }
          })}
        >
          <Stack direction='row' spacing={2} alignItems='center' sx={{ minWidth: 0 }}>
            <CustomAvatar skin='light' color={document.statusTone} variant='rounded'>
              <i className='tabler-file-text' aria-hidden='true' />
            </CustomAvatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 700 }} noWrap>
                {document.name}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {document.type} · {document.owner}
              </Typography>
            </Box>
          </Stack>
          <OperationalStatusBadge label={document.status} tone={document.statusTone} />
          <Typography variant='caption' color='text.secondary'>
            {document.lastEvent}
          </Typography>
        </Box>
      ))}
    </Stack>
  </OperationalPanel>
)

const TimelinePanel = ({
  selectedEventId,
  onSelect
}: {
  selectedEventId: string
  onSelect: (eventId: string) => void
}) => (
  <OperationalPanel
    title='Workforce history'
    subheader='Append-only operational events that explain the current profile.'
    icon='tabler-history'
    iconColor='info'
  >
    <Stack spacing={0}>
      {timeline.map((event, index) => (
        <TimelineRow
          key={event.id}
          event={event}
          selected={selectedEventId === event.id}
          last={index === timeline.length - 1}
          onSelect={() => onSelect(selectedEventId === event.id ? '' : event.id)}
        />
      ))}
    </Stack>
  </OperationalPanel>
)

const TimelineRow = ({
  event,
  selected,
  last,
  onSelect
}: {
  event: WorkforceTimelineEvent
  selected: boolean
  last: boolean
  onSelect: () => void
}) => (
  <Box
    component='button'
    type='button'
    onClick={onSelect}
    sx={{
      border: 0,
      bgcolor: 'transparent',
      width: '100%',
      textAlign: 'left',
      p: 0,
      cursor: 'pointer'
    }}
  >
    <Box sx={{ display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr)', gap: 3 }}>
      <Stack alignItems='center' sx={{ pt: 1 }}>
        <CustomAvatar skin='light' color={event.tone} variant='rounded' sx={{ width: 34, height: 34 }}>
          <i className={event.icon} aria-hidden='true' />
        </CustomAvatar>
        {!last ? <Box sx={{ width: 1, flex: 1, minHeight: 34, bgcolor: 'divider', mt: 1 }} /> : null}
      </Stack>
      <Box
        sx={theme => ({
          border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          p: 3,
          mb: last ? 0 : 3,
          bgcolor: selected ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
          transition: 'border-color 160ms ease, background-color 160ms ease',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
        })}
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='space-between'>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                {event.title}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {event.description}
              </Typography>
            </Box>
            <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
              <CustomChip round='true' size='small' variant='tonal' color='secondary' label={event.date} />
              <CustomChip round='true' size='small' variant='tonal' color={event.tone} label={event.source} />
            </Stack>
          </Stack>
          <Collapse in={selected} timeout={180}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant='body2'>{event.detail}</Typography>
          </Collapse>
        </Stack>
      </Box>
    </Box>
  </Box>
)

const Sidecar = ({ onActionClick }: { onActionClick: () => void }) => (
  <Stack spacing={4} sx={{ position: { xl: 'sticky' }, top: { xl: 88 } }} data-capture='person-workforce-sidecar'>
    <Card>
      <CardContent>
        <Stack spacing={4}>
          <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={3}>
            <Box>
              <Typography variant='h5'>Readiness</Typography>
              <Typography variant='caption' color='text.secondary'>
                Person 360 coverage
              </Typography>
            </Box>
            <OperationalStatusBadge label='Ready' tone='success' icon='tabler-circle-check' />
          </Stack>
          <Box>
            <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
              <Typography variant='body2' sx={{ fontWeight: 700 }}>
                Coverage score
              </Typography>
              <Typography variant='body2' sx={{ fontWeight: 700 }}>
                {danielaProfile.readinessScore}%
              </Typography>
            </Stack>
            <LinearProgress variant='determinate' value={danielaProfile.readinessScore} color='success' sx={{ height: 8, borderRadius: 4 }} />
          </Box>
          <Divider />
          <Stack spacing={2}>
            {quickActions.map(action => (
              <Button
                key={action.id}
                variant='tonal'
                color={action.tone}
                startIcon={<i className={action.icon} aria-hidden='true' />}
                onClick={action.id === 'edit-worker' || action.id === 'schedule-change' ? onActionClick : undefined}
                sx={{ justifyContent: 'flex-start' }}
              >
                {action.label}
              </Button>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>

    <OperationalPanel
      title='Current attention'
      subheader='Signals that decide whether this profile can move without risk.'
      icon='tabler-alert-circle'
      iconColor='warning'
      divided={false}
    >
      <OperationalSignalList items={readinessSignals.slice(0, 2)} columns={{ xs: 1 }} />
    </OperationalPanel>
  </Stack>
)

const EvidencePopover = ({
  anchorEl,
  onClose
}: {
  anchorEl: HTMLElement | null
  onClose: () => void
}) => (
  <Popover
    open={Boolean(anchorEl)}
    anchorEl={anchorEl}
    onClose={onClose}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
    slotProps={{
      paper: {
        sx: theme => ({
          mt: 1,
          maxWidth: 360,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`
        })
      }
    }}
  >
    <Box sx={{ p: 4 }}>
      <Stack spacing={3}>
        <Stack direction='row' spacing={2} alignItems='center'>
          <CustomAvatar skin='light' color='success' variant='rounded'>
            <i className='tabler-shield-check' aria-hidden='true' />
          </CustomAvatar>
          <Box>
            <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
              High confidence
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {danielaProfile.confidenceSummary}
            </Typography>
          </Box>
        </Stack>
        <Divider />
        <Stack spacing={1.5}>
          {['Person profile reconciled', 'Active work relationship present', 'Current assignment effective dated', 'Compensation version aligned', 'Document evidence linked', 'Payment rail evidence present'].map(item => (
            <Stack key={item} direction='row' spacing={1.5} alignItems='center'>
              <i className='tabler-circle-check' aria-hidden='true' style={{ color: 'var(--mui-palette-success-main)', fontSize: 18 }} />
              <Typography variant='body2'>{item}</Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Box>
  </Popover>
)

const ActionDrawer = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
  <Drawer anchor='right' open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 460 } } }}>
    <Box sx={{ p: 5 }}>
      <Stack spacing={5}>
        <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3}>
          <Box>
            <Typography variant='h4'>Schedule workforce change</Typography>
            <Typography variant='body2' color='text.secondary'>
              Mockup drawer: previews the write workflow without mutating runtime data.
            </Typography>
          </Box>
          <IconButton aria-label={copy.aria.closeDrawer} onClick={onClose}>
            <i className='tabler-x' aria-hidden='true' />
          </IconButton>
        </Stack>

        <Box
          sx={theme => ({
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            p: 4,
            bgcolor: alpha(theme.palette.primary.main, 0.04)
          })}
        >
          <Stack spacing={3}>
            <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
              Guardrails before save
            </Typography>
            {['Create an effective-dated assignment event', 'Link compensation change only when approved', 'Request missing document evidence', 'Emit reliability signal if readiness drops'].map(item => (
              <Stack key={item} direction='row' spacing={2} alignItems='center'>
                <i className='tabler-circle-check' aria-hidden='true' style={{ color: 'var(--mui-palette-primary-main)' }} />
                <Typography variant='body2'>{item}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Stack spacing={3}>
          <Button variant='contained' startIcon={<i className='tabler-calendar-plus' aria-hidden='true' />}>
            Continue to change workflow
          </Button>
          <Button variant='tonal' color='secondary' onClick={onClose}>
            Close
          </Button>
        </Stack>
      </Stack>
    </Box>
  </Drawer>
)

const DanielaWorkforceProfileMockupView = () => {
  const [activeSection, setActiveSection] = useState('overview')
  const [evidenceAnchor, setEvidenceAnchor] = useState<HTMLElement | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedTimelineEvent, setSelectedTimelineEvent] = useState('role-change')

  const annualCost = useMemo(() => formatCurrency(63050, 'EUR', { currencySymbolSpacing: ' ' }, 'es-CL'), [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]

        if (visible?.target.id) setActiveSection(visible.target.id)
      },
      { rootMargin: '-20% 0px -68% 0px', threshold: [0, 0.2, 0.6] }
    )

    sectionIds.forEach(id => {
      const node = document.getElementById(id)

      if (node) observer.observe(node)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <Box sx={{ pb: 8 }} data-capture='person-workforce-profile-mockup'>
      <Stack spacing={6}>
        <HeaderPanel
          onEvidenceClick={event => setEvidenceAnchor(event.currentTarget)}
          onActionClick={() => setDrawerOpen(true)}
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '220px minmax(0, 1fr)', xl: '220px minmax(0, 1fr) 340px' },
            gap: 5,
            alignItems: 'start'
          }}
        >
          <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
            <SectionNavigation activeSection={activeSection} />
          </Box>

          <Stack spacing={6} sx={{ minWidth: 0 }}>
            <Box id='overview' sx={{ scrollMarginTop: 96 }}>
              <SectionTitle
                eyebrow='Person 360'
                title='Workforce command profile'
                description='A single person-centered surface that explains relationship, assignment, documents, compensation and payment readiness.'
              />
              <WorkforceSnapshotGrid />
            </Box>

            <Box id='operations' data-capture='person-operations-ico-nexa' sx={{ scrollMarginTop: 96 }}>
              <OperationalIntelligencePanel />
            </Box>

            <Box data-capture='person-no-regression-map'>
              <PreservedPeopleSurfacesPanel />
            </Box>

            <Box id='workforce' sx={{ scrollMarginTop: 96 }}>
              <OperationalPanel
                title='Workforce relationship'
                subheader='Current relationship, org placement and source evidence.'
                icon='tabler-users-group'
                iconColor='primary'
                action={<OperationalStatusBadge label='Complete' tone='success' icon='tabler-circle-check' />}
              >
                <FactGrid facts={relationshipFacts} />
              </OperationalPanel>
            </Box>

            <Box id='compensation' sx={{ scrollMarginTop: 96 }}>
              <OperationalPanel
                title='Compensation profile'
                subheader='Versioned compensation summary. Sensitive amounts remain role-gated in production.'
                icon='tabler-cash-banknote'
                iconColor='success'
                action={<OperationalStatusBadge label='Annual TTC' tone='success' icon='tabler-chart-bar' />}
              >
                <Stack spacing={4}>
                  <Box
                    sx={theme => ({
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
                      gap: 4,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                      p: 4
                    })}
                  >
                    <Box>
                      <Typography variant='caption' color='text.secondary'>
                        Total target compensation
                      </Typography>
                      <Typography variant='h4' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {annualCost}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Annualized from active compensation version v3.
                      </Typography>
                    </Box>
                    <Stack spacing={1.5}>
                      <OperationalStatusBadge label='No tuple drift' tone='success' icon='tabler-shield-check' />
                      <OperationalStatusBadge label='Effective dated' tone='primary' icon='tabler-calendar-stats' />
                      <OperationalStatusBadge label='Finance redaction ready' tone='secondary' icon='tabler-eye-off' />
                    </Stack>
                  </Box>
                  <FactGrid facts={compensationFacts} />
                </Stack>
              </OperationalPanel>
            </Box>

            <Box id='documents' sx={{ scrollMarginTop: 96 }}>
              <DocumentsPanel />
            </Box>

            <Box id='payments' sx={{ scrollMarginTop: 96 }}>
              <OperationalPanel
                title='Payroll and payment rail'
                subheader='People shows readiness and evidence. Payroll execution remains in the Payroll domain.'
                icon='tabler-credit-card'
                iconColor='warning'
                action={<OperationalStatusBadge label='External rail' tone='warning' icon='tabler-building-bank' />}
              >
                <OperationalSignalList items={readinessSignals} columns={{ xs: 1, md: 1 }} />
              </OperationalPanel>
            </Box>

            <Box id='history' sx={{ scrollMarginTop: 96 }}>
              <TimelinePanel selectedEventId={selectedTimelineEvent} onSelect={setSelectedTimelineEvent} />
            </Box>

            <Box id='compliance' sx={{ scrollMarginTop: 96 }}>
              <OperationalPanel
                title='Access and compliance posture'
                subheader='What the viewer can see, what is redacted and why.'
                icon='tabler-shield-lock'
                iconColor='secondary'
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                    gap: 3
                  }}
                >
                  {[
                    { label: 'People viewer', value: 'Profile + assignment', tone: 'primary' as MockupTone, icon: 'tabler-eye' },
                    { label: 'HR manager', value: 'Documents + workflow', tone: 'info' as MockupTone, icon: 'tabler-users' },
                    { label: 'Finance admin', value: 'Comp + payment evidence', tone: 'success' as MockupTone, icon: 'tabler-lock-open' }
                  ].map(item => (
                    <Box
                      key={item.label}
                      sx={theme => ({
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: `${theme.shape.customBorderRadius.md}px`,
                        p: 3
                      })}
                    >
                      <Stack spacing={2}>
                        <CustomAvatar skin='light' color={item.tone} variant='rounded'>
                          <i className={item.icon} aria-hidden='true' />
                        </CustomAvatar>
                        <Box>
                          <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                            {item.label}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {item.value}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  ))}
                </Box>
              </OperationalPanel>
            </Box>
          </Stack>

          <Box sx={{ display: { xs: 'none', xl: 'block' } }}>
            <Sidecar onActionClick={() => setDrawerOpen(true)} />
          </Box>
        </Box>
      </Stack>

      <EvidencePopover anchorEl={evidenceAnchor} onClose={() => setEvidenceAnchor(null)} />
      <ActionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </Box>
  )
}

export default DanielaWorkforceProfileMockupView
