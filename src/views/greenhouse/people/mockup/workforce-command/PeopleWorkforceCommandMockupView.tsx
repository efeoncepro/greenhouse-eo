'use client'

import { useMemo, useState, type MouseEvent } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Collapse from '@mui/material/Collapse'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { alpha, useTheme } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import DataTableShell from '@/components/greenhouse/data-table/DataTableShell'
import {
  ContextChipStrip,
  OperationalPanel,
  OperationalStatusBadge
} from '@/components/greenhouse/primitives'
import { getMicrocopy } from '@/lib/copy'

import {
  commandMetrics,
  exceptionGroups,
  savedViews,
  workforcePeople,
  type CoverageState,
  type MockupTone,
  type ReadinessState,
  type SavedView,
  type WorkforcePerson,
  type WorkerRegime
} from './data'

const copy = getMicrocopy()

const toneForReadiness = (state: ReadinessState): MockupTone => {
  if (state === 'ready') return 'success'
  if (state === 'blocked') return 'error'
  if (state === 'warning') return 'warning'

  return 'secondary'
}

const labelForCoverage = (state: CoverageState) => {
  if (state === 'available') return 'Available'
  if (state === 'missing') return 'Missing'
  if (state === 'warning') return 'Review'
  if (state === 'redacted') return 'Redacted'

  return 'N/A'
}

const toneForCoverage = (state: CoverageState): MockupTone => {
  if (state === 'available') return 'success'
  if (state === 'missing') return 'warning'
  if (state === 'warning') return 'warning'
  if (state === 'redacted') return 'secondary'

  return 'info'
}

const regimeTone = (regime: WorkerRegime): MockupTone => {
  if (regime === 'cl_dependent') return 'primary'
  if (regime === 'honorarios') return 'warning'
  if (regime === 'contractor_payable') return 'info'
  if (regime === 'deel_provider') return 'secondary'

  return 'error'
}

const statusTone = (status: WorkforcePerson['status']): MockupTone => {
  if (status === 'active') return 'success'
  if (status === 'offboarding') return 'warning'
  if (status === 'not_started') return 'info'

  return 'secondary'
}

const readinessRows = (person: WorkforcePerson) => [
  ['Workforce profile', person.readiness.workforceProfile],
  ['Payroll calculation', person.readiness.payrollCalculation],
  ['Payment rail', person.readiness.paymentRail],
  ['Documents/signature', person.readiness.documentsSignature],
  ['Tax/provider review', person.readiness.taxProviderReview]
] as const

const evidenceSummary = (person: WorkforcePerson) => {
  const states = [
    person.compensationCoverage,
    person.documents,
    person.readiness.payrollCalculation,
    person.readiness.paymentRail,
    person.readiness.documentsSignature
  ]

  const missing = states.filter(state => state === 'missing' || state === 'blocked').length
  const review = states.filter(state => state === 'warning').length

  if (missing > 0) return { label: person.attentionLabel, tone: 'warning' as MockupTone, caption: `${missing} missing · ${review} review` }
  if (review > 0) return { label: person.attentionLabel, tone: 'warning' as MockupTone, caption: `${review} review checks` }

  return { label: person.attentionLabel, tone: 'success' as MockupTone, caption: 'Comp · docs · readiness OK' }
}

const applySavedView = (view: SavedView, people: WorkforcePerson[]) => {
  if (view.filter === 'attention') return people.filter(person => person.attentionCodes.length > 0)

  if (view.filter === 'international') {
    return people.filter(person => person.regime === 'deel_provider' || person.regime === 'international_internal')
  }

  if (view.filter === 'contractors') {
    return people.filter(person => person.regime === 'contractor_payable' || person.regime === 'honorarios')
  }

  if (view.filter === 'missing_comp') return people.filter(person => person.compensationCoverage === 'missing')

  if (view.filter === 'payment_setup') {
    return people.filter(person => person.readiness.paymentRail === 'warning' || person.readiness.paymentRail === 'blocked')
  }

  return people
}

const Header = ({ selectedView, onLineageClick }: { selectedView: SavedView; onLineageClick: (event: MouseEvent<HTMLElement>) => void }) => (
  <Card
    data-capture='people-command-header'
    sx={theme => ({
      border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
      overflow: 'hidden'
    })}
  >
    <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
      <Stack spacing={{ xs: 2, md: 3 }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent='space-between' spacing={{ xs: 2, md: 3 }}>
          <Stack spacing={1.5} sx={{ minWidth: 0 }}>
            <Button
              component={Link}
              href='/people'
              variant='text'
              color='secondary'
              size='small'
              startIcon={<i className='tabler-arrow-left' aria-hidden='true' />}
              sx={{ alignSelf: 'flex-start', px: 0, fontSize: { xs: '0.875rem', md: '0.9375rem' } }}
            >
              Back to current people
            </Button>
            <Box>
              <Typography variant='h4' sx={{ fontSize: { xs: '1.35rem', md: '1.5rem' }, fontWeight: 700, lineHeight: 1.15 }}>
                People
              </Typography>
              <Typography color='text.secondary' sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
                9 active · 5 need attention · {selectedView.label} · May 31st 2026 10:42
              </Typography>
            </Box>
          </Stack>

          <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap alignItems='center'>
            <Button
              variant='outlined'
              color='primary'
              size='small'
              startIcon={<i className='tabler-user-plus' aria-hidden='true' />}
              data-capture='people-command-add-worker'
              sx={theme => ({
                bgcolor: alpha(theme.palette.primary.main, 0.03),
                fontSize: { xs: '0.8125rem', md: '0.875rem' },
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.07)
                }
              })}
            >
              Add worker
            </Button>
            <Button
              variant='text'
              color='secondary'
              size='small'
              startIcon={<i className='tabler-layout-list' aria-hidden='true' />}
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                color: 'text.secondary',
                '&:hover': { color: 'text.primary' }
              }}
            >
              Saved views
            </Button>
            <Button
              variant='text'
              color='secondary'
              size='small'
              startIcon={<i className='tabler-download' aria-hidden='true' />}
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                color: 'text.secondary',
                '&:hover': { color: 'text.primary' }
              }}
            >
              Export view
            </Button>
            <Tooltip title='More actions'>
              <IconButton aria-label={copy.aria.moreActions}>
                <i className='tabler-dots-vertical' aria-hidden='true' />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <ContextChipStrip ariaLabel='People command center status' scrollMobile={false}>
            <OperationalStatusBadge label='9/9 relationship' tone='success' icon='tabler-link' />
            <OperationalStatusBadge label='5 attention' tone='warning' icon='tabler-alert-circle' />
            <Box component='button' onClick={onLineageClick} sx={{ all: 'unset', cursor: 'pointer', display: 'inline-flex' }}>
              <OperationalStatusBadge label='Lineage' tone='primary' icon='tabler-chart-dots' />
            </Box>
            <OperationalStatusBadge label='Payroll read-only' tone='secondary' icon='tabler-calculator' />
          </ContextChipStrip>
        </Box>
        <Stack direction='row' spacing={1} sx={{ display: { xs: 'flex', sm: 'none' } }}>
          <Box component='button' onClick={onLineageClick} sx={{ all: 'unset', cursor: 'pointer', display: 'inline-flex' }}>
            <CustomChip round='true' size='small' variant='tonal' color='primary' label='Lineage' icon={<i className='tabler-chart-dots' aria-hidden='true' />} />
          </Box>
          <CustomChip round='true' size='small' variant='tonal' color='secondary' label='Payroll read-only' icon={<i className='tabler-calculator' aria-hidden='true' />} />
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

const SavedViewSelector = ({
  activeView,
  onSelect
}: {
  activeView: SavedView
  onSelect: (view: SavedView) => void
}) => (
  <Stack
    direction='row'
    spacing={1}
    useFlexGap
    flexWrap={{ xs: 'nowrap', md: 'wrap' }}
    data-capture='people-command-saved-views'
    sx={{
      width: '100%',
      minWidth: 0,
      overflowX: { xs: 'auto', md: 'visible' },
      overflowY: 'hidden',
      pb: { xs: 0.5, md: 0 },
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': { display: 'none' }
    }}
  >
    {savedViews.map(view => {
      const selected = view.id === activeView.id

      return (
        <Box
          key={view.id}
          component='button'
          type='button'
          onClick={() => onSelect(view)}
          aria-pressed={selected}
          sx={theme => ({
            all: 'unset',
            boxSizing: 'border-box',
            flex: '0 0 auto',
            minWidth: 'max-content',
            minHeight: { xs: 28, md: 32 },
            px: { xs: 1.5, md: 2 },
            borderRadius: 999,
            border: `1px solid ${selected ? alpha(theme.palette.primary.main, 0.42) : theme.palette.divider}`,
            bgcolor: selected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
            color: selected ? 'primary.main' : 'text.secondary',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontSize: { xs: '0.8125rem', md: '0.875rem' },
            fontWeight: selected ? 700 : 600,
            lineHeight: 1,
            transition: 'border-color 160ms ease, background-color 160ms ease, color 160ms ease',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            '&:hover': {
              borderColor: selected ? alpha(theme.palette.primary.main, 0.54) : alpha(theme.palette.primary.main, 0.28),
              bgcolor: selected ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.04),
              color: selected ? 'primary.main' : 'text.primary'
            },
            '&:focus-visible': {
              outline: `2px solid ${alpha(theme.palette.primary.main, 0.44)}`,
              outlineOffset: 2
            }
          })}
        >
          {view.label}
        </Box>
      )
    })}
  </Stack>
)

const CommandStrip = () => (
  <Card
    data-capture='people-command-summary'
    sx={theme => ({
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      overflow: 'hidden'
    })}
  >
    <CardContent sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'none', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' },
          gridAutoColumns: { xs: 'max-content', sm: 'auto' },
          gridAutoFlow: { xs: 'column', sm: 'row' },
          gap: { xs: 1, md: 0 },
          overflowX: { xs: 'auto', sm: 'visible' },
          pb: { xs: 0.5, sm: 0 },
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' }
        }}
      >
        {commandMetrics.map(metric => (
          <Box
            key={metric.id}
            sx={theme => ({
              px: { xs: 1.5, md: 2.5 },
              py: { xs: 1, md: 1 },
              width: { xs: 132, sm: 'auto' },
              minWidth: 0,
              borderRight: { lg: `1px solid ${theme.palette.divider}` },
              borderRadius: { xs: `${theme.shape.customBorderRadius.md}px`, lg: 0 },
              bgcolor: { xs: alpha(theme.palette[metric.tone].main, 0.04), lg: 'transparent' },
              '&:last-child': { borderRight: 0 }
            })}
          >
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ minWidth: 0 }}>
              <CustomAvatar skin='light' color={metric.tone} variant='rounded' size={28}>
                <i className={metric.icon} aria-hidden='true' />
              </CustomAvatar>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction='row' spacing={1} alignItems='baseline'>
                  <Typography variant='subtitle1' sx={{ fontSize: { xs: '0.9375rem', md: '1rem' }, fontWeight: 700, lineHeight: 1 }}>
                    {metric.value}
                  </Typography>
                  <Typography variant='body2' sx={{ fontSize: { xs: '0.8125rem', md: '0.875rem' }, fontWeight: 700 }} noWrap>
                    {metric.title}
                  </Typography>
                </Stack>
                <Typography variant='caption' color='text.secondary' noWrap sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {metric.subtitle}
                </Typography>
              </Box>
            </Stack>
          </Box>
        ))}
      </Box>
    </CardContent>
  </Card>
)

const ExceptionQueue = ({
  selectedCode,
  onSelectCode
}: {
  selectedCode: string | null
  onSelectCode: (code: string | null) => void
}) => (
  <OperationalPanel
    title='Exception queue'
    subheader='Gaps that filter the roster. Remediation stays in the owning domain.'
    icon='tabler-alert-triangle'
    iconColor='warning'
    action={
      selectedCode ? (
        <Button size='small' variant='text' color='secondary' onClick={() => onSelectCode(null)}>
          Clear
        </Button>
      ) : null
    }
  >
    <Stack spacing={1.5} data-capture='people-command-exception-queue'>
      {exceptionGroups.map(group => {
        const selected = selectedCode ? group.codes.includes(selectedCode) : false

        return (
          <Box
            key={group.id}
            component='button'
            type='button'
            onClick={() => onSelectCode(selected ? null : group.codes[0])}
            sx={theme => ({
              width: '100%',
              textAlign: 'left',
              border: `1px solid ${selected ? theme.palette[group.tone].main : theme.palette.divider}`,
              bgcolor: selected ? alpha(theme.palette[group.tone].main, 0.08) : 'background.paper',
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              p: 2,
              cursor: 'pointer',
              transition: 'transform 160ms ease, border-color 160ms ease, background-color 160ms ease',
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
              '&:hover': {
                transform: 'translateY(-1px)',
                borderColor: theme.palette[group.tone].main,
                bgcolor: alpha(theme.palette[group.tone].main, 0.06)
              }
            })}
          >
            <Stack direction='row' spacing={2} alignItems='center'>
              <CustomAvatar skin='light' color={group.tone} variant='rounded' size={34}>
                <i className={group.icon} aria-hidden='true' />
              </CustomAvatar>
              <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction='row' spacing={1.5} alignItems='center' justifyContent='space-between'>
                  <Typography variant='body2' sx={{ fontWeight: 700, minWidth: 0 }} noWrap>
                    {group.title}
                  </Typography>
                  <OperationalStatusBadge label={group.count} tone={group.tone} />
                </Stack>
                <Typography variant='caption' color='text.secondary'>
                  Owner: {group.owner}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        )
      })}
    </Stack>
  </OperationalPanel>
)

const FilterChips = ({
  search,
  selectedCode,
  onClearSearch,
  onClearCode
}: {
  search: string
  selectedCode: string | null
  onClearSearch: () => void
  onClearCode: () => void
}) => {
  if (!search && !selectedCode) return null

  return (
    <Stack direction='row' spacing={2} useFlexGap flexWrap='wrap'>
      {search ? (
        <CustomChip
          round='true'
          color='primary'
          variant='tonal'
          label={`Search: ${search}`}
          onDelete={onClearSearch}
          deleteIcon={<i className='tabler-x' aria-hidden='true' />}
        />
      ) : null}
      {selectedCode ? (
        <CustomChip
          round='true'
          color='warning'
          variant='tonal'
          label={selectedCode}
          onDelete={onClearCode}
          deleteIcon={<i className='tabler-x' aria-hidden='true' />}
        />
      ) : null}
    </Stack>
  )
}

const RosterTable = ({
  people,
  selectedPerson,
  onSelect
}: {
  people: WorkforcePerson[]
  selectedPerson: WorkforcePerson | null
  onSelect: (person: WorkforcePerson) => void
}) => (
  <Box data-capture='people-command-roster-table'>
    <DataTableShell identifier='people-workforce-command-roster' ariaLabel='People workforce roster' density='compact' stickyFirstColumn>
      <Table
        size='small'
        sx={{
          width: '100%',
          minWidth: 0,
          tableLayout: 'fixed',
          '& .MuiTableCell-root': {
            px: { lg: 2, xl: 2.5 },
            py: 2
          },
          '& tbody .MuiTableRow-root': {
            transition: 'background-color 160ms ease'
          }
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: { lg: '24%', xl: '23%' } }}>Person</TableCell>
            <TableCell sx={{ width: { lg: '23%', xl: '22%' } }}>Work setup</TableCell>
            <TableCell sx={{ width: { lg: '25%', xl: '22%' } }}>Assignment</TableCell>
            <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' }, width: '12%' }}>Manager</TableCell>
            <TableCell sx={{ width: { lg: '28%', xl: '21%' } }}>Evidence</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {people.map(person => {
            const selected = selectedPerson?.id === person.id
            const evidence = evidenceSummary(person)

            return (
              <TableRow
                key={person.id}
                hover
                selected={selected}
                onClick={() => onSelect(person)}
                tabIndex={0}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') onSelect(person)
                }}
                sx={theme => ({
                  cursor: 'pointer',
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08)
                  }
                })}
              >
                <TableCell>
                  <Stack direction='row' spacing={2} alignItems='center' sx={{ minWidth: 0 }}>
                    <CustomAvatar skin='light' color={statusTone(person.status)} size={34}>
                      {person.initials}
                    </CustomAvatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant='subtitle2' sx={{ fontWeight: 700 }} noWrap>
                        {person.displayName}
                      </Typography>
                      <Typography variant='caption' color='text.secondary' noWrap>
                        {person.team}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack spacing={1} sx={{ minWidth: 0 }}>
                    <OperationalStatusBadge label={person.regimeLabel} tone={regimeTone(person.regime)} />
                    <Typography variant='caption' color='text.secondary'>
                      {person.paymentRail}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>
                    {person.role}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {person.country} · {person.team}
                  </Typography>
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' } }}>{person.manager}</TableCell>
                <TableCell>
                  <Stack spacing={1} sx={{ minWidth: 0 }}>
                    <OperationalStatusBadge
                      label={evidence.label}
                      tone={evidence.tone}
                      icon={evidence.tone === 'success' ? 'tabler-circle-check' : 'tabler-alert-circle'}
                    />
                    <Typography variant='caption' color='text.secondary' noWrap>
                      {evidence.caption}
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </DataTableShell>
    {!people.length ? (
      <Box
        sx={theme => ({
          mt: 4,
          border: `1px dashed ${theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          p: 5,
          textAlign: 'center'
        })}
      >
        <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
          No people match this view
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Clear filters or switch saved view.
        </Typography>
      </Box>
    ) : null}
  </Box>
)

const MobileRoster = ({
  people,
  selectedPerson,
  onSelect
}: {
  people: WorkforcePerson[]
  selectedPerson: WorkforcePerson | null
  onSelect: (person: WorkforcePerson) => void
}) => (
  <Stack spacing={3} data-capture='people-command-mobile-list'>
    {people.map(person => (
      <Box
        key={person.id}
        component='button'
        type='button'
        onClick={() => onSelect(person)}
        sx={theme => ({
          width: '100%',
          textAlign: 'left',
          border: `1px solid ${selectedPerson?.id === person.id ? theme.palette.primary.main : theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          p: 3,
          bgcolor: 'background.paper'
        })}
      >
        <Stack spacing={2}>
          <Stack direction='row' spacing={2} alignItems='center'>
            <CustomAvatar skin='light' color={statusTone(person.status)} size={36}>
              {person.initials}
            </CustomAvatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 700 }} noWrap>
                {person.displayName}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {person.role}
              </Typography>
            </Box>
          </Stack>
          <Stack direction='row' spacing={1.5} useFlexGap flexWrap='wrap'>
            <OperationalStatusBadge label={person.attentionLabel} tone={person.attentionCodes.length ? 'warning' : 'success'} />
            <OperationalStatusBadge label={person.regimeLabel} tone={regimeTone(person.regime)} />
            <OperationalStatusBadge label={person.country} tone='secondary' icon='tabler-map-pin' />
            <OperationalStatusBadge label={labelForCoverage(person.compensationCoverage)} tone={toneForCoverage(person.compensationCoverage)} />
          </Stack>
        </Stack>
      </Box>
    ))}
  </Stack>
)

const RosterWorksurface = ({
  activeView,
  filteredPeople,
  isMobile,
  search,
  selectedCode,
  selectedPerson,
  onClearCode,
  onClearSearch,
  onSearch,
  onSelectPerson,
  onSelectView
}: {
  activeView: SavedView
  filteredPeople: WorkforcePerson[]
  isMobile: boolean
  search: string
  selectedCode: string | null
  selectedPerson: WorkforcePerson | null
  onClearCode: () => void
  onClearSearch: () => void
  onSearch: (value: string) => void
  onSelectPerson: (person: WorkforcePerson) => void
  onSelectView: (view: SavedView) => void
}) => (
  <OperationalPanel
    title='Workforce roster'
    subheader='Person-first roster with regime, rail and evidence coverage.'
    icon='tabler-table'
    iconColor='primary'
    action={<OperationalStatusBadge label={`${filteredPeople.length} shown`} tone='primary' icon='tabler-filter' />}
  >
    <Stack spacing={3} data-capture='people-command-roster'>
      <Stack spacing={3}>
        <SavedViewSelector activeView={activeView} onSelect={onSelectView} />
        <CustomTextField
          id='people-workforce-command-search'
          fullWidth
          value={search}
          onChange={event => onSearch(event.target.value)}
          placeholder='Search people, manager, country, rail'
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <i className='tabler-search' aria-hidden='true' />
              </InputAdornment>
            )
          }}
        />
        <FilterChips search={search} selectedCode={selectedCode} onClearSearch={onClearSearch} onClearCode={onClearCode} />
      </Stack>

      <Box
        sx={theme => ({
          border: `1px solid ${alpha(theme.palette.warning.main, 0.24)}`,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          px: 3,
          py: 2,
          bgcolor: alpha(theme.palette.warning.main, 0.05)
        })}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent='space-between'>
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <i className='tabler-shield-lock text-warning' aria-hidden='true' />
            <Typography variant='body2' sx={{ fontWeight: 700 }}>
              Payroll boundary
            </Typography>
          </Stack>
          <Typography variant='body2' color='text.secondary'>
            People shows evidence and links; payroll calculations, exports and payments stay in owning rails.
          </Typography>
        </Stack>
      </Box>

      <Box>
        <LinearProgress
          variant='determinate'
          value={Math.round((filteredPeople.length / workforcePeople.length) * 100)}
          sx={{ height: 5, borderRadius: 999, mb: 1 }}
        />
        <Typography variant='caption' color='text.secondary'>
          {filteredPeople.length} of {workforcePeople.length} people in this view
        </Typography>
      </Box>

      {isMobile ? (
        <MobileRoster people={filteredPeople} selectedPerson={selectedPerson} onSelect={onSelectPerson} />
      ) : (
        <RosterTable people={filteredPeople} selectedPerson={selectedPerson} onSelect={onSelectPerson} />
      )}
    </Stack>
  </OperationalPanel>
)

const Inspector = ({ person, open, onClose }: { person: WorkforcePerson | null; open: boolean; onClose: () => void }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    readiness: true,
    evidence: true,
    links: true
  })

  if (!person) return null

  const toggle = (key: string) => setExpanded(current => ({ ...current, [key]: !current[key] }))

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', md: 460 },
          maxHeight: { xs: '88vh', md: '100%' },
          borderTopLeftRadius: { xs: theme.shape.customBorderRadius.lg, md: 0 },
          borderTopRightRadius: { xs: theme.shape.customBorderRadius.lg, md: 0 }
        }
      }}
    >
      <Box data-capture='people-command-inspector' sx={{ height: '100%', overflow: 'auto' }}>
        <Stack spacing={4} sx={{ p: 5 }}>
          <Stack direction='row' spacing={3} alignItems='flex-start' justifyContent='space-between'>
            <Stack direction='row' spacing={3} alignItems='center' sx={{ minWidth: 0 }}>
              <CustomAvatar skin='light' color={statusTone(person.status)} size={48}>
                {person.initials}
              </CustomAvatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant='h5' sx={{ fontWeight: 700 }} noWrap>
                  {person.displayName}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {person.role}
                </Typography>
              </Box>
            </Stack>
            <IconButton aria-label={copy.aria.closeDrawer} onClick={onClose}>
              <i className='tabler-x' aria-hidden='true' />
            </IconButton>
          </Stack>

          <Stack direction='row' spacing={1.5} useFlexGap flexWrap='wrap'>
            <OperationalStatusBadge label={person.regimeLabel} tone={regimeTone(person.regime)} />
            <OperationalStatusBadge label={person.status.replace('_', ' ')} tone={statusTone(person.status)} />
            <OperationalStatusBadge label={`${person.confidence} confidence`} tone={person.confidence === 'high' ? 'success' : 'warning'} />
          </Stack>

          <Box
            sx={theme => ({
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              p: 3,
              bgcolor: alpha(theme.palette.primary.main, 0.04)
            })}
          >
            <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
              Safe next action
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {person.nextAction}
            </Typography>
          </Box>

          {[
            ['readiness', 'Readiness by domain'],
            ['evidence', 'Source lineage'],
            ['links', 'Safe links']
          ].map(([key, title]) => (
            <Box key={key}>
              <Button
                fullWidth
                color='secondary'
                variant='tonal'
                onClick={() => toggle(key)}
                endIcon={<i className={expanded[key] ? 'tabler-chevron-up' : 'tabler-chevron-down'} aria-hidden='true' />}
                sx={{ justifyContent: 'space-between' }}
              >
                {title}
              </Button>
              <Collapse in={expanded[key]} timeout={180}>
                <Box sx={{ pt: 3 }}>
                  {key === 'readiness' ? (
                    <Stack spacing={2}>
                      {readinessRows(person).map(([label, state]) => (
                        <Stack key={label} direction='row' spacing={2} justifyContent='space-between' alignItems='center'>
                          <Typography variant='body2'>{label}</Typography>
                          <OperationalStatusBadge label={state.replace('_', ' ')} tone={toneForReadiness(state)} />
                        </Stack>
                      ))}
                    </Stack>
                  ) : null}
                  {key === 'evidence' ? (
                    <Stack spacing={2}>
                      {person.sourceLineage.map(source => (
                        <Stack key={source} direction='row' spacing={2} alignItems='center'>
                          <i className='tabler-point-filled' aria-hidden='true' />
                          <Typography variant='body2'>{source}</Typography>
                        </Stack>
                      ))}
                      <Typography variant='body2' color='text.secondary'>
                        {person.notes}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {person.sensitiveHint}
                      </Typography>
                    </Stack>
                  ) : null}
                  {key === 'links' ? (
                    <Stack spacing={2}>
                      {person.safeLinks.map(link => (
                        <Button
                          key={link.label}
                          component={Link}
                          href={link.href}
                          variant='outlined'
                          color='secondary'
                          startIcon={<i className={link.icon} aria-hidden='true' />}
                          sx={{ justifyContent: 'flex-start' }}
                        >
                          {link.label}
                        </Button>
                      ))}
                    </Stack>
                  ) : null}
                </Box>
              </Collapse>
            </Box>
          ))}
        </Stack>
      </Box>
    </Drawer>
  )
}

const LineagePopover = ({ anchorEl, onClose }: { anchorEl: HTMLElement | null; onClose: () => void }) => (
  <Popover
    open={Boolean(anchorEl)}
    anchorEl={anchorEl}
    onClose={onClose}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
    PaperProps={{ sx: { width: 340, mt: 1 } }}
  >
    <Stack spacing={3} sx={{ p: 4 }}>
      <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
        Read model lineage
      </Typography>
      {['WorkforceFoundationMap', 'Current work classification', 'Readiness dispositions', 'EPIC-001 document evidence'].map(
        item => (
          <Stack key={item} direction='row' spacing={2} alignItems='center'>
            <OperationalStatusBadge label='Source' tone='primary' />
            <Typography variant='body2'>{item}</Typography>
          </Stack>
        )
      )}
      <Typography variant='caption' color='text.secondary'>
        People summarizes evidence. Payroll, Finance, Contractor Payables and Documents keep specialized ownership.
      </Typography>
    </Stack>
  </Popover>
)

const PeopleWorkforceCommandMockupView = () => {
  const [activeView, setActiveView] = useState(savedViews[0])
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedPerson, setSelectedPerson] = useState<WorkforcePerson | null>(workforcePeople[0])
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [lineageAnchor, setLineageAnchor] = useState<HTMLElement | null>(null)

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const filteredPeople = useMemo(() => {
    const byView = applySavedView(activeView, workforcePeople)
    const byCode = selectedCode ? byView.filter(person => person.attentionCodes.includes(selectedCode)) : byView
    const normalized = search.trim().toLowerCase()

    if (!normalized) return byCode

    return byCode.filter(person =>
      [person.displayName, person.role, person.team, person.manager, person.country, person.regimeLabel, person.paymentRail]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    )
  }, [activeView, search, selectedCode])

  const handleSelectPerson = (person: WorkforcePerson) => {
    setSelectedPerson(person)
    setInspectorOpen(true)
  }

  return (
    <Box data-capture='people-workforce-command-mockup' sx={{ maxWidth: '100%', overflowX: 'clip', pb: 8 }}>
      <Stack spacing={4}>
        <Header selectedView={activeView} onLineageClick={event => setLineageAnchor(event.currentTarget)} />

        <CommandStrip />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '304px minmax(0, 1fr)' },
            gap: 4,
            alignItems: 'start'
          }}
        >
          <Box sx={{ order: { xs: 2, lg: 1 } }}>
            <ExceptionQueue selectedCode={selectedCode} onSelectCode={setSelectedCode} />
          </Box>

          <Box sx={{ minWidth: 0, order: { xs: 1, lg: 2 } }}>
            <RosterWorksurface
              activeView={activeView}
              filteredPeople={filteredPeople}
              isMobile={isMobile}
              search={search}
              selectedCode={selectedCode}
              selectedPerson={selectedPerson}
              onClearCode={() => setSelectedCode(null)}
              onClearSearch={() => setSearch('')}
              onSearch={setSearch}
              onSelectPerson={handleSelectPerson}
              onSelectView={setActiveView}
            />
          </Box>
        </Box>
      </Stack>

      <Inspector person={selectedPerson} open={inspectorOpen} onClose={() => setInspectorOpen(false)} />
      <LineagePopover anchorEl={lineageAnchor} onClose={() => setLineageAnchor(null)} />
    </Box>
  )
}

export default PeopleWorkforceCommandMockupView
