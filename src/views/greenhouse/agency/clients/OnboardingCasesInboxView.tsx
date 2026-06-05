'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import EmptyState from '@/components/greenhouse/EmptyState'
import { getMicrocopy } from '@/lib/copy'
import { GH_CLIENT_ONBOARDING } from '@/lib/copy/client-onboarding'
import type {
  OnboardingInboxCaseVm,
  OnboardingInboxData,
  OnboardingInboxStatus
} from '@/lib/client-lifecycle/inbox-reader'
import type { ClientLifecycleItemStatus, ClientLifecycleTriggerSource } from '@/lib/client-lifecycle/types'

const M = getMicrocopy()
const T = GH_CLIENT_ONBOARDING.onboardingCases

type StatusMeta = { label: string; color: 'warning' | 'info' | 'error' }

const STATUS_COPY: Record<OnboardingInboxStatus, StatusMeta> = {
  draft: { label: T.statusDraft, color: 'warning' },
  in_progress: { label: M.states.inProgress, color: 'info' },
  blocked: { label: M.states.blocked, color: 'error' }
}

type OriginMeta = { label: string; color: 'warning' | 'primary' | 'secondary' | 'info' | 'error' }

const ORIGIN_COPY: Record<ClientLifecycleTriggerSource, OriginMeta> = {
  hubspot_deal: { label: T.originHubspotDeal, color: 'warning' },
  manual: { label: T.originManual, color: 'primary' },
  adopt: { label: T.originAdopt, color: 'secondary' },
  renewal: { label: T.originRenewal, color: 'info' },
  churn_signal: { label: T.originChurnSignal, color: 'error' },
  migration: { label: T.originMigration, color: 'secondary' }
}

type StepMeta = { label: string; color: 'success' | 'info' | 'secondary' | 'error'; icon: string }

const STEP_COPY: Record<ClientLifecycleItemStatus, StepMeta> = {
  completed: { label: M.states.completed, color: 'success', icon: 'tabler-check' },
  in_progress: { label: M.states.inProgress, color: 'info', icon: 'tabler-dots' },
  pending: { label: M.states.pending, color: 'secondary', icon: 'tabler-circle' },
  blocked: { label: M.states.blocked, color: 'error', icon: 'tabler-lock' },
  skipped: { label: T.stepSkipped, color: 'secondary', icon: 'tabler-arrow-right' },
  not_applicable: { label: T.stepNotApplicable, color: 'secondary', icon: 'tabler-minus' }
}

const STATUS_FILTERS: Array<{ value: 'all' | OnboardingInboxStatus; label: string }> = [
  { value: 'all', label: T.filterAll },
  { value: 'draft', label: STATUS_COPY.draft.label },
  { value: 'in_progress', label: STATUS_COPY.in_progress.label },
  { value: 'blocked', label: STATUS_COPY.blocked.label }
]

const nextActionCopy = (status: OnboardingInboxStatus): string => {
  if (status === 'draft') return T.nextActionDraft
  if (status === 'blocked') return T.nextActionBlocked

  return T.nextActionInProgress
}

const OnboardingCasesInboxView = ({
  data,
  degraded
}: {
  data: OnboardingInboxData
  degraded: boolean
}) => {
  const theme = useTheme()
  const { cases, summary } = data

  const [selectedId, setSelectedId] = useState(cases[0]?.caseId ?? '')
  const [statusFilter, setStatusFilter] = useState<'all' | OnboardingInboxStatus>('all')
  const [originFilter, setOriginFilter] = useState<'all' | ClientLifecycleTriggerSource>('all')
  const [query, setQuery] = useState('')

  const originOptions = useMemo(() => {
    const seen = new Set<ClientLifecycleTriggerSource>()

    for (const item of cases) seen.add(item.origin)

    return Array.from(seen)
  }, [cases])

  const filteredCases = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return cases.filter(item => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const matchesOrigin = originFilter === 'all' || item.origin === originFilter

      const matchesQuery =
        normalized.length === 0 ||
        item.organizationName.toLowerCase().includes(normalized) ||
        item.shortCode.toLowerCase().includes(normalized) ||
        (item.hubspotDealId?.toLowerCase().includes(normalized) ?? false)

      return matchesStatus && matchesOrigin && matchesQuery
    })
  }, [cases, originFilter, query, statusFilter])

  const clearFilters = () => {
    setStatusFilter('all')
    setOriginFilter('all')
    setQuery('')
  }

  const header = (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent='space-between'
      alignItems={{ xs: 'stretch', md: 'flex-start' }}
      gap={3}
      sx={{ mb: 5 }}
    >
      <Box>
        <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 1 }}>
          <Typography
            component={Link}
            href='/agency'
            variant='body2'
            sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none' }}
          >
            {T.breadcrumbAgency}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            /
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {T.breadcrumbClients}
          </Typography>
        </Stack>
        <Typography variant='h4' sx={{ fontWeight: 800, letterSpacing: 0 }}>
          {T.title}
        </Typography>
        <Typography variant='body1' color='text.secondary' sx={{ mt: 1, maxWidth: 720 }}>
          {T.subtitle}
        </Typography>
      </Box>
      <Stack direction='row' spacing={2} alignItems='center'>
        <Button
          component={Link}
          href='/agency/clients/new'
          variant='contained'
          startIcon={<i className='tabler-plus' />}
          sx={{
            minWidth: 164,
            transition: 'transform 160ms ease, box-shadow 160ms ease',
            '&:hover': { transform: 'translateY(-1px)', boxShadow: 4 }
          }}
        >
          {T.newClientCta}
        </Button>
      </Stack>
    </Stack>
  )

  const wizardNotice = (
    <Alert
      severity='info'
      icon={<i className='tabler-info-circle' />}
      sx={{
        mb: 5,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
        bgcolor: alpha(theme.palette.primary.main, 0.06)
      }}
    >
      {T.wizardNotice}
    </Alert>
  )

  // Degraded: read failed → honest error state, never a crash.
  if (degraded) {
    return (
      <Box data-capture='onboarding-cases' sx={{ pb: 6 }}>
        {header}
        {wizardNotice}
        <Card sx={{ border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
          <EmptyState
            icon='tabler-alert-triangle'
            title={T.degradedTitle}
            description={T.degradedDescription}
            minHeight={360}
            action={
              <Button component={Link} href='/agency/clients/onboarding' variant='outlined'>
                {T.retryCta}
              </Button>
            }
          />
        </Card>
      </Box>
    )
  }

  // Zero state: no in-flight onboarding cases at all.
  if (cases.length === 0) {
    return (
      <Box data-capture='onboarding-cases' sx={{ pb: 6 }}>
        {header}
        {wizardNotice}
        <Card sx={{ border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
          <EmptyState
            icon='tabler-inbox'
            title={T.emptyZeroTitle}
            description={T.emptyZeroDescription}
            minHeight={360}
            action={
              <Button
                component={Link}
                href='/agency/clients/new'
                variant='contained'
                startIcon={<i className='tabler-plus' />}
              >
                {T.newClientCta}
              </Button>
            }
          />
        </Card>
      </Box>
    )
  }

  const selected: OnboardingInboxCaseVm = filteredCases.find(item => item.caseId === selectedId) ?? filteredCases[0] ?? cases[0]
  const selectedStatus = STATUS_COPY[selected.status]
  const isDraft = selected.status === 'draft'

  return (
    <Box data-capture='onboarding-cases' sx={{ pb: 6 }}>
      {header}
      {wizardNotice}

      <Card sx={{ mb: 5, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }
          }}
        >
          <MetricTile icon='tabler-folder' label={T.kpiOpenLabel} value={String(summary.openCases)} tone='primary' />
          <MetricTile icon='tabler-clock' label={T.kpiInProgressLabel} value={String(summary.inProgress)} tone='info' />
          <MetricTile
            icon='tabler-alert-octagon'
            label={T.kpiOverdueLabel}
            value={String(summary.overdue)}
            detail={T.kpiOverdueDetail}
            tone='error'
          />
          <MetricTile
            icon='tabler-lock'
            label={T.kpiBlockedLabel}
            value={String(summary.blocked)}
            detail={T.kpiBlockedDetail}
            tone='warning'
            last
          />
        </Box>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: '360px minmax(360px, 1fr) 280px',
            xl: '400px minmax(420px, 1fr) 310px'
          },
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          bgcolor: 'background.paper',
          overflow: 'hidden',
          minHeight: 650
        }}
      >
        {/* Column 1 — inbox */}
        <Box sx={{ borderRight: { lg: `1px solid ${theme.palette.divider}` } }}>
          <Box sx={{ p: 4, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Stack spacing={3}>
              <CustomTextField
                fullWidth
                size='small'
                placeholder={T.searchPlaceholder}
                value={query}
                onChange={event => setQuery(event.target.value)}
                InputProps={{ startAdornment: <i className='tabler-search' style={{ marginInlineEnd: 8 }} /> }}
              />
              <Stack direction='column' spacing={2}>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label={T.statusFilterLabel}
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value as 'all' | OnboardingInboxStatus)}
                >
                  {STATUS_FILTERS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label={T.originFilterLabel}
                  value={originFilter}
                  onChange={event => setOriginFilter(event.target.value as 'all' | ClientLifecycleTriggerSource)}
                >
                  <MenuItem value='all'>{T.filterAll}</MenuItem>
                  {originOptions.map(origin => (
                    <MenuItem key={origin} value={origin}>
                      {ORIGIN_COPY[origin].label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Stack>
              <Typography variant='caption' color='text.secondary' role='status' aria-label={T.visibleCountAria}>
                {filteredCases.length} {filteredCases.length === 1 ? 'caso' : 'casos'} · {selected.organizationName}
              </Typography>
            </Stack>
          </Box>

          <Box
            sx={{
              px: 4,
              py: 2,
              bgcolor: alpha(theme.palette.action.hover, 0.5),
              borderBottom: `1px solid ${theme.palette.divider}`
            }}
          >
            <Typography variant='caption' color='text.secondary' fontWeight={700}>
              {T.inboxHeading}
            </Typography>
          </Box>

          {filteredCases.length === 0 ? (
            <Box sx={{ p: 4 }}>
              <EmptyState
                icon='tabler-filter-off'
                title={T.emptyFilteredTitle}
                description={T.emptyFilteredDescription}
                minHeight={320}
                action={
                  <Button variant='outlined' size='small' onClick={clearFilters}>
                    {T.clearFiltersCta}
                  </Button>
                }
              />
            </Box>
          ) : (
            <Box>
              {filteredCases.map(item => {
                const isSelected = selected.caseId === item.caseId
                const status = STATUS_COPY[item.status]
                const origin = ORIGIN_COPY[item.origin]

                return (
                  <Box
                    key={item.caseId}
                    component='button'
                    type='button'
                    onClick={() => setSelectedId(item.caseId)}
                    sx={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '42px minmax(0, 1fr) auto',
                      alignItems: 'start',
                      gap: 2,
                      px: 4,
                      py: 3,
                      textAlign: 'left',
                      border: 0,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                      cursor: 'pointer',
                      borderLeft: `3px solid ${isSelected ? theme.palette.primary.main : 'transparent'}`,
                      transition: 'background-color 140ms ease, transform 140ms ease, border-color 140ms ease',
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                      '&:active': { transform: 'scale(0.995)' },
                      '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 }
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: alpha(theme.palette.primary.main, 0.14),
                        color: 'primary.main',
                        fontWeight: 700,
                        fontSize: '0.875rem'
                      }}
                    >
                      {item.organizationName.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant='body2' fontWeight={700} noWrap>
                        {item.organizationName}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {item.shortCode}
                      </Typography>
                      <Stack direction='row' spacing={1} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
                        <CustomChip round='true' size='small' variant='tonal' color={status.color} label={status.label} />
                        <CustomChip round='true' size='small' variant='tonal' color={origin.color} label={origin.label} />
                      </Stack>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant='caption' fontWeight={700}>
                        {item.createdAtLabel}
                      </Typography>
                      {item.overdueLabel ? (
                        <Typography variant='caption' display='block' color='error.main' fontWeight={700}>
                          {item.overdueLabel}
                        </Typography>
                      ) : (
                        <Typography variant='caption' display='block' color='text.secondary'>
                          {item.targetCompletionDate ? T.withinTarget : T.noTargetDate}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          )}
        </Box>

        {/* Column 2 — selected case preview (real checklist) */}
        <Box sx={{ p: { xs: 4, md: 5 }, borderRight: { lg: `1px solid ${theme.palette.divider}` } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent='space-between'
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={3}
            sx={{ mb: 4 }}
          >
            <Box>
              <Stack direction='row' alignItems='center' spacing={1}>
                <Typography variant='h5' fontWeight={800}>
                  {selected.organizationName}
                </Typography>
                <IconButton
                  size='small'
                  component={Link}
                  href={selected.timelineHref}
                  aria-label={T.openTimelineAria}
                >
                  <i className='tabler-external-link' />
                </IconButton>
              </Stack>
              <Typography variant='body2' color='text.secondary'>
                {selected.shortCode} · {T.createdOn} {selected.createdAtLabel}
              </Typography>
            </Box>
            <CustomChip round='true' variant='tonal' color={selectedStatus.color} label={selectedStatus.label} />
          </Stack>

          <Box
            sx={{
              mb: 4,
              p: 3,
              borderRadius: 2,
              bgcolor: alpha(theme.palette[selectedStatus.color].main, 0.08),
              border: `1px solid ${alpha(theme.palette[selectedStatus.color].main, 0.18)}`
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' gap={2}>
              <Box>
                <Typography variant='subtitle2' fontWeight={800}>
                  {selected.completedSteps} de {selected.totalSteps} {T.stepsReady}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {nextActionCopy(selected.status)}
                </Typography>
              </Box>
              <Box sx={{ minWidth: { sm: 180 } }}>
                <LinearProgress
                  variant='determinate'
                  value={selected.totalSteps > 0 ? (selected.completedSteps / selected.totalSteps) * 100 : 0}
                  aria-label={T.progressAria}
                  sx={{ height: 7, borderRadius: 99, mt: 1 }}
                />
              </Box>
            </Stack>
          </Box>

          {selected.steps.length === 0 ? (
            <EmptyState
              icon='tabler-list-check'
              title={M.empty.noData}
              description={T.emptyZeroDescription}
              minHeight={200}
            />
          ) : (
            <Stack spacing={0}>
              {selected.steps.map((step, index) => {
                const meta = STEP_COPY[step.status]
                const isLast = index === selected.steps.length - 1

                return (
                  <Box key={step.itemCode} sx={{ display: 'grid', gridTemplateColumns: '42px 1fr', columnGap: 3 }}>
                    <Stack alignItems='center'>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          color: `${meta.color}.main`,
                          bgcolor: alpha(theme.palette[meta.color].main, 0.12),
                          border: `1px solid ${alpha(theme.palette[meta.color].main, 0.36)}`
                        }}
                      >
                        <i className={meta.icon} style={{ fontSize: 16 }} aria-hidden='true' />
                      </Box>
                      {!isLast ? (
                        <Box
                          sx={{
                            width: 2,
                            flex: 1,
                            minHeight: 48,
                            bgcolor: alpha(theme.palette.text.secondary, 0.18),
                            mt: 1
                          }}
                        />
                      ) : null}
                    </Stack>
                    <Box sx={{ pb: isLast ? 0 : 4 }}>
                      <Stack direction='row' justifyContent='space-between' gap={3} alignItems='flex-start'>
                        <Box>
                          <Typography variant='h6' sx={{ fontSize: '1rem' }}>
                            {step.label}
                          </Typography>
                          {step.blocksCompletion ? (
                            <Typography variant='caption' color='text.secondary'>
                              {T.stepBlocksCompletion}
                            </Typography>
                          ) : null}
                        </Box>
                        <CustomChip round='true' size='small' variant='tonal' color={meta.color} label={meta.label} />
                      </Stack>
                    </Box>
                  </Box>
                )
              })}
            </Stack>
          )}

          <Divider sx={{ my: 4 }} />
          <Stack direction='row' alignItems='center' spacing={2} color='text.secondary'>
            <i className='tabler-flag' aria-hidden='true' />
            <Typography variant='body2'>{nextActionCopy(selected.status)}</Typography>
          </Stack>
        </Box>

        {/* Column 3 — action rail (honest fields only) */}
        <Box sx={{ p: 4, bgcolor: alpha(theme.palette.action.hover, 0.2) }}>
          <Stack spacing={4}>
            <ActionSection title={T.nextActionTitle} icon='tabler-flag'>
              <Typography variant='body2' color='text.secondary'>
                {nextActionCopy(selected.status)}
              </Typography>
              <Stack spacing={2} sx={{ mt: 3 }}>
                <Button
                  component={Link}
                  href={selected.timelineHref}
                  variant='contained'
                  endIcon={<i className='tabler-arrow-right' />}
                  sx={{
                    transition: 'transform 160ms ease, box-shadow 160ms ease',
                    '&:hover': { transform: 'translateY(-1px)', boxShadow: 3 }
                  }}
                >
                  {T.openTimelineCta}
                </Button>
                {isDraft ? (
                  <Button
                    component={Link}
                    href={selected.timelineHref}
                    variant='outlined'
                    startIcon={<i className='tabler-bolt' />}
                  >
                    {T.activateCaseCta}
                  </Button>
                ) : null}
              </Stack>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1.5 }}>
                {T.activationHint}
              </Typography>
            </ActionSection>

            <ActionSection title={T.responsibleTitle} icon='tabler-user-circle'>
              <Stack direction='row' spacing={2} alignItems='center'>
                <Avatar sx={{ width: 34, height: 34 }}>
                  <i className={selected.triggeredByUserId ? 'tabler-user' : 'tabler-robot'} />
                </Avatar>
                <Typography variant='body2' fontWeight={700}>
                  {selected.triggeredByUserId ? T.responsibleOperator : T.responsibleSystem}
                </Typography>
              </Stack>
            </ActionSection>

            <ActionSection title={T.targetTitle} icon='tabler-clock'>
              {selected.targetLabel ? (
                <>
                  <Typography variant='body2' color='text.secondary'>
                    {selected.targetLabel}
                  </Typography>
                  {selected.overdueLabel ? (
                    <Typography variant='caption' color='error.main' fontWeight={700} sx={{ display: 'block', mt: 1 }}>
                      {selected.overdueLabel}
                    </Typography>
                  ) : null}
                </>
              ) : (
                <Typography variant='body2' color='text.secondary'>
                  {T.targetNone}
                </Typography>
              )}
            </ActionSection>

            <ActionSection title={T.sourceTitle} icon='tabler-database'>
              <Stack spacing={1.5}>
                <InfoRow label={T.sourceOriginLabel} value={ORIGIN_COPY[selected.origin].label} />
                <InfoRow label={T.sourceDealLabel} value={selected.hubspotDealId ?? T.sourceNoDeal} />
              </Stack>
            </ActionSection>
          </Stack>
        </Box>
      </Box>
    </Box>
  )
}

type MetricTileProps = {
  icon: string
  label: string
  value: string
  detail?: string
  tone: 'primary' | 'info' | 'error' | 'success' | 'warning'
  last?: boolean
}

const MetricTile = ({ icon, label, value, detail, tone, last = false }: MetricTileProps) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        p: 4,
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 3,
        borderRight: { lg: last ? 0 : `1px solid ${theme.palette.divider}` },
        borderBottom: { xs: last ? 0 : `1px solid ${theme.palette.divider}`, lg: 0 }
      }}
    >
      <Box>
        <Typography variant='body2' color='text.secondary'>
          {label}
        </Typography>
        <Typography variant='h4' sx={{ fontWeight: 800, color: `${tone}.main`, lineHeight: 1.1, mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Typography>
        {detail ? (
          <Typography variant='caption' color='text.secondary'>
            {detail}
          </Typography>
        ) : null}
      </Box>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          bgcolor: alpha(theme.palette[tone].main, 0.12),
          color: `${tone}.main`,
          display: 'grid',
          placeItems: 'center'
        }}
      >
        <i className={icon} style={{ fontSize: 24 }} aria-hidden='true' />
      </Box>
    </Box>
  )
}

const ActionSection = ({ title, icon, children }: { title: string; icon: string; children: ReactNode }) => (
  <Box>
    <Stack direction='row' alignItems='center' spacing={1.5} sx={{ mb: 2 }}>
      <i className={icon} aria-hidden='true' />
      <Typography variant='subtitle2' fontWeight={800}>
        {title}
      </Typography>
    </Stack>
    {children}
  </Box>
)

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='body2' fontWeight={600}>
      {value}
    </Typography>
  </Box>
)

export default OnboardingCasesInboxView
