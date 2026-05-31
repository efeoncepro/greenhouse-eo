'use client'

import { useMemo, useState, type MouseEvent } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
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
  MetricSummaryCard,
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
    <CardContent sx={{ p: { xs: 4, md: 5 } }}>
      <Stack spacing={4}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent='space-between' spacing={4}>
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Button
              component={Link}
              href='/people'
              variant='text'
              color='secondary'
              size='small'
              startIcon={<i className='tabler-arrow-left' aria-hidden='true' />}
              sx={{ alignSelf: 'flex-start', px: 0 }}
            >
              Back to current people
            </Button>
            <Box>
              <Typography variant='h3' sx={{ fontSize: { xs: '1.8rem', md: '2.125rem' }, lineHeight: 1.15 }}>
                People
              </Typography>
              <Typography color='text.secondary'>
                Workforce command center · {selectedView.label} · as of May 31st 2026 10:42
              </Typography>
            </Box>
          </Stack>

          <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap alignItems='center'>
            <Button
              variant='tonal'
              color='primary'
              startIcon={<i className='tabler-user-plus' aria-hidden='true' />}
              data-capture='people-command-add-worker'
            >
              Add worker
            </Button>
            <Button variant='tonal' color='secondary' startIcon={<i className='tabler-layout-list' aria-hidden='true' />}>
              Saved views
            </Button>
            <Button variant='tonal' color='secondary' startIcon={<i className='tabler-download' aria-hidden='true' />}>
              Export view
            </Button>
            <Tooltip title='More actions'>
              <IconButton aria-label={copy.aria.moreActions}>
                <i className='tabler-dots-vertical' aria-hidden='true' />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <ContextChipStrip ariaLabel='People command center status' scrollMobile={false}>
          <OperationalStatusBadge label='Relationship coverage 9/9' tone='success' icon='tabler-link' />
          <OperationalStatusBadge label='Classification parity 9/9' tone='success' icon='tabler-shield-check' />
          <Box component='button' onClick={onLineageClick} sx={{ all: 'unset', cursor: 'pointer', display: 'inline-flex' }}>
            <OperationalStatusBadge label='Read model confidence' tone='primary' icon='tabler-chart-dots' />
          </Box>
          <OperationalStatusBadge label='Payroll remains rail' tone='warning' icon='tabler-calculator' />
          <OperationalStatusBadge label='Documents via EPIC-001' tone='secondary' icon='tabler-file-certificate' />
        </ContextChipStrip>
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
  <Stack direction='row' spacing={2} useFlexGap flexWrap='wrap' data-capture='people-command-saved-views'>
    {savedViews.map(view => {
      const selected = view.id === activeView.id

      return (
        <Button
          key={view.id}
          variant={selected ? 'contained' : 'tonal'}
          color={selected ? 'primary' : 'secondary'}
          size='small'
          onClick={() => onSelect(view)}
          aria-pressed={selected}
          sx={{ minHeight: 36 }}
        >
          {view.label}
        </Button>
      )
    })}
  </Stack>
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
    subheader='Prioritized workforce gaps. Every item opens evidence; no remediation happens here.'
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
    <Stack spacing={2.5} data-capture='people-command-exception-queue'>
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
              p: 3,
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
            <Stack direction='row' spacing={3} alignItems='flex-start'>
              <CustomAvatar skin='light' color={group.tone} variant='rounded'>
                <i className={group.icon} aria-hidden='true' />
              </CustomAvatar>
              <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between'>
                  <Typography variant='subtitle2' sx={{ fontWeight: 700, minWidth: 0 }}>
                    {group.title}
                  </Typography>
                  <OperationalStatusBadge label={group.count} tone={group.tone} />
                </Stack>
                <Typography variant='body2' color='text.secondary'>
                  {group.description}
                </Typography>
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
  <OperationalPanel
    title='Workforce roster'
    subheader='Person-first rows with regime, rail and evidence coverage.'
    icon='tabler-table'
    iconColor='primary'
    action={<OperationalStatusBadge label={`${people.length} shown`} tone='primary' icon='tabler-filter' />}
  >
    <Box data-capture='people-command-roster-table'>
      <DataTableShell identifier='people-workforce-command-roster' ariaLabel='People workforce roster' density='compact' stickyFirstColumn>
        <Table size='small' sx={{ minWidth: 1040 }}>
          <TableHead>
            <TableRow>
              <TableCell>Person</TableCell>
              <TableCell>Regime</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Assignment</TableCell>
              <TableCell>Manager</TableCell>
              <TableCell>Payment rail</TableCell>
              <TableCell>Comp</TableCell>
              <TableCell>Readiness</TableCell>
              <TableCell>Documents</TableCell>
              <TableCell>Attention</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {people.map(person => {
              const selected = selectedPerson?.id === person.id
              const blocked = Object.values(person.readiness).some(state => state === 'blocked')
              const warning = person.attentionCodes.length > 0

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
                    <Stack direction='row' spacing={2} alignItems='center' sx={{ minWidth: 220 }}>
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
                    <Stack spacing={1}>
                      <OperationalStatusBadge label={person.regimeLabel} tone={regimeTone(person.regime)} />
                      <Typography variant='caption' color='text.secondary' noWrap>
                        {person.regimeDetail}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{person.country}</TableCell>
                  <TableCell>
                    <Typography variant='body2' noWrap>
                      {person.role}
                    </Typography>
                  </TableCell>
                  <TableCell>{person.manager}</TableCell>
                  <TableCell>
                    <Typography variant='body2' noWrap>
                      {person.paymentRail}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <OperationalStatusBadge
                      label={labelForCoverage(person.compensationCoverage)}
                      tone={toneForCoverage(person.compensationCoverage)}
                    />
                  </TableCell>
                  <TableCell>
                    <OperationalStatusBadge
                      label={blocked ? 'Blocked' : warning ? 'Review' : 'Ready'}
                      tone={blocked ? 'error' : warning ? 'warning' : 'success'}
                    />
                  </TableCell>
                  <TableCell>
                    <OperationalStatusBadge label={labelForCoverage(person.documents)} tone={toneForCoverage(person.documents)} />
                  </TableCell>
                  <TableCell>
                    <OperationalStatusBadge
                      label={person.attentionLabel}
                      tone={person.attentionCodes.length ? 'warning' : 'success'}
                      icon={person.attentionCodes.length ? 'tabler-alert-circle' : 'tabler-circle-check'}
                    />
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
  </OperationalPanel>
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
            <OperationalStatusBadge label={person.attentionLabel} tone={person.attentionCodes.length ? 'warning' : 'success'} />
          </Stack>
          <Stack direction='row' spacing={1.5} useFlexGap flexWrap='wrap'>
            <OperationalStatusBadge label={person.regimeLabel} tone={regimeTone(person.regime)} />
            <OperationalStatusBadge label={person.country} tone='secondary' icon='tabler-map-pin' />
            <OperationalStatusBadge label={labelForCoverage(person.compensationCoverage)} tone={toneForCoverage(person.compensationCoverage)} />
          </Stack>
        </Stack>
      </Box>
    ))}
  </Stack>
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
    <Box data-capture='people-workforce-command-mockup' sx={{ pb: 8 }}>
      <Stack spacing={6}>
        <Header selectedView={activeView} onLineageClick={event => setLineageAnchor(event.currentTarget)} />

        <Box
          data-capture='people-command-summary'
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' },
            gap: 3
          }}
        >
          {commandMetrics.map(metric => (
            <MetricSummaryCard
              key={metric.id}
              title={metric.title}
              value={metric.value}
              subtitle={metric.subtitle}
              icon={metric.icon}
              iconColor={metric.tone}
              statusLabel={metric.status}
              statusTone={metric.statusTone}
            />
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', xl: '360px minmax(0, 1fr)' },
            gap: 5,
            alignItems: 'start'
          }}
        >
          <ExceptionQueue selectedCode={selectedCode} onSelectCode={setSelectedCode} />

          <Stack spacing={4} sx={{ minWidth: 0 }}>
            <OperationalPanel
              title='Roster controls'
              subheader='Saved views and filters update the command surface without changing source data.'
              icon='tabler-adjustments-horizontal'
              iconColor='secondary'
            >
              <Stack spacing={4}>
                <SavedViewSelector activeView={activeView} onSelect={view => setActiveView(view)} />
                <CustomTextField
                  fullWidth
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder='Search people, manager, country, rail'
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <i className='tabler-search' aria-hidden='true' />
                      </InputAdornment>
                    )
                  }}
                />
                <FilterChips
                  search={search}
                  selectedCode={selectedCode}
                  onClearSearch={() => setSearch('')}
                  onClearCode={() => setSelectedCode(null)}
                />
                <Box>
                  <LinearProgress
                    variant='determinate'
                    value={Math.round((filteredPeople.length / workforcePeople.length) * 100)}
                    sx={{ height: 6, borderRadius: 999 }}
                  />
                  <Typography variant='caption' color='text.secondary'>
                    {filteredPeople.length} of {workforcePeople.length} people in this view
                  </Typography>
                </Box>
              </Stack>
            </OperationalPanel>

            <Box data-capture='people-command-roster'>
              {isMobile ? (
                <MobileRoster people={filteredPeople} selectedPerson={selectedPerson} onSelect={handleSelectPerson} />
              ) : (
                <RosterTable people={filteredPeople} selectedPerson={selectedPerson} onSelect={handleSelectPerson} />
              )}
            </Box>

            <Card
              sx={theme => ({
                borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                border: `1px solid ${alpha(theme.palette.warning.main, 0.24)}`
              })}
            >
              <CardContent>
                <Stack spacing={3}>
                  <Stack direction='row' spacing={2} alignItems='center'>
                    <CustomAvatar skin='light' color='warning' variant='rounded'>
                      <i className='tabler-shield-lock' aria-hidden='true' />
                    </CustomAvatar>
                    <Box>
                      <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                        Payroll boundary
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        This command center shows evidence, coverage and links. Payroll calculations, receipts, exports and payment execution stay in their owning domains.
                      </Typography>
                    </Box>
                  </Stack>
                  <Divider />
                  <Stack direction='row' spacing={1.5} useFlexGap flexWrap='wrap'>
                    <OperationalStatusBadge label='No statutory deduction detail' tone='warning' />
                    <OperationalStatusBadge label='No payment execution' tone='warning' />
                    <OperationalStatusBadge label='Regime badges required' tone='primary' />
                    <OperationalStatusBadge label='Cost redacted by default' tone='secondary' />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Stack>

      <Inspector person={selectedPerson} open={inspectorOpen} onClose={() => setInspectorOpen(false)} />
      <LineagePopover anchorEl={lineageAnchor} onClose={() => setLineageAnchor(null)} />
    </Box>
  )
}

export default PeopleWorkforceCommandMockupView
