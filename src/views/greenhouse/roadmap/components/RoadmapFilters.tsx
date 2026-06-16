'use client'

/**
 * TASK-1153 — Toolbar de filtros: pills por kind + búsqueda + Prioridad/Dominio/Salud.
 * Read-only sobre el índice; el filtrado es client-side e instantáneo.
 */
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'

import CustomTextField from '@core/components/mui/TextField'

import { GH_ROADMAP } from '@/lib/copy/roadmap'
import type { RoadmapPriority } from '@/lib/roadmap/cockpit/types'
import type { WorkItemHealthLevel, WorkItemKind } from '@/lib/roadmap/work-item-index/types'

export type KindTabKey = 'all' | WorkItemKind

const KIND_TAB_ORDER: KindTabKey[] = ['all', 'epic', 'task', 'mini_task', 'issue']

export interface RoadmapFiltersProps {
  kind: KindTabKey
  onKindChange: (kind: KindTabKey) => void
  kindCounts: Record<KindTabKey, number>
  search: string
  onSearchChange: (value: string) => void
  priority: RoadmapPriority
  onPriorityChange: (value: RoadmapPriority) => void
  domain: string
  onDomainChange: (value: string) => void
  health: WorkItemHealthLevel | ''
  onHealthChange: (value: WorkItemHealthLevel | '') => void
  domains: string[]
  anyFilter: boolean
  onClear: () => void
}

const KindPill = ({
  active,
  label,
  count,
  onClick
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) => (
  <Box
    component='button'
    type='button'
    aria-pressed={active}
    onClick={onClick}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.875,
      px: 1.5,
      py: 0.75,
      borderRadius: '9999px',
      cursor: 'pointer',
      fontWeight: 600,
      border: '1px solid',
      transition: theme => theme.transitions.create(['background-color', 'border-color', 'color']),
      typography: 'caption',
      backgroundColor: active ? 'primary.main' : 'background.paper',
      color: active ? 'primary.contrastText' : 'text.secondary',
      borderColor: active ? 'primary.main' : 'divider',
      '&:hover': { borderColor: 'primary.main' },
      '&:focus-visible': { outline: theme => `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
    }}
  >
    {label}
    <Box
      component='span'
      sx={{
        fontFeatureSettings: "'tnum' 1",
        typography: 'caption',
        fontWeight: 700,
        minWidth: 18,
        height: 18,
        px: 0.625,
        borderRadius: '9999px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? 'rgba(255,255,255,0.22)' : 'action.hover',
        color: 'inherit'
      }}
    >
      {count}
    </Box>
  </Box>
)

const RoadmapFilters = ({
  kind,
  onKindChange,
  kindCounts,
  search,
  onSearchChange,
  priority,
  onPriorityChange,
  domain,
  onDomainChange,
  health,
  onHealthChange,
  domains,
  anyFilter,
  onClear
}: RoadmapFiltersProps) => (
  <Box
    data-capture='roadmap-filters'
    role='group'
    aria-label={GH_ROADMAP.filtersAria}
    sx={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 3,
      p: theme => `${theme.spacing(3.5)} ${theme.spacing(4)}`,
      backgroundColor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: theme => `${theme.shape.customBorderRadius.md}px`
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      {KIND_TAB_ORDER.map(key => (
        <KindPill
          key={key}
          active={kind === key}
          label={GH_ROADMAP.kindTabs[key]}
          count={kindCounts[key]}
          onClick={() => onKindChange(key)}
        />
      ))}
    </Box>

    <Box sx={{ width: '1px', height: 28, backgroundColor: 'divider', display: { xs: 'none', md: 'block' } }} />

    <CustomTextField
      value={search}
      onChange={event => onSearchChange(event.target.value)}
      placeholder={GH_ROADMAP.searchPlaceholder}
      aria-label={GH_ROADMAP.searchAria}
      size='small'
      sx={{ flex: { xs: '1 1 100%', md: '0 1 320px' }, minWidth: { xs: '100%', md: 240 } }}
      InputProps={{
        startAdornment: (
          <InputAdornment position='start'>
            <i className='tabler-search' aria-hidden='true' style={{ fontSize: 17 }} />
          </InputAdornment>
        )
      }}
    />

    <CustomTextField
      select
      size='small'
      value={priority ?? ''}
      onChange={event => onPriorityChange((event.target.value || null) as RoadmapPriority)}
      sx={{ width: { xs: '100%', sm: 156 } }}
      aria-label={GH_ROADMAP.priorityFilterAll}
      SelectProps={{ displayEmpty: true }}
    >
      <MenuItem value=''>{GH_ROADMAP.priorityFilterAll}</MenuItem>
      {GH_ROADMAP.priorityOptions.map(option => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </CustomTextField>

    <CustomTextField
      select
      size='small'
      value={domain}
      onChange={event => onDomainChange(event.target.value)}
      sx={{ width: { xs: '100%', sm: 156 } }}
      aria-label={GH_ROADMAP.domainFilterAll}
      SelectProps={{ displayEmpty: true }}
    >
      <MenuItem value=''>{GH_ROADMAP.domainFilterAll}</MenuItem>
      {domains.map(option => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </CustomTextField>

    <CustomTextField
      select
      size='small'
      value={health}
      onChange={event => onHealthChange(event.target.value as WorkItemHealthLevel | '')}
      sx={{ width: { xs: '100%', sm: 148 } }}
      aria-label={GH_ROADMAP.healthFilterAll}
      SelectProps={{ displayEmpty: true }}
    >
      <MenuItem value=''>{GH_ROADMAP.healthFilterAll}</MenuItem>
      {GH_ROADMAP.healthOptions.map(option => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </CustomTextField>

    {anyFilter ? (
      <Button
        variant='text'
        size='small'
        color='secondary'
        startIcon={<i className='tabler-filter-off' />}
        onClick={onClear}
        aria-label={GH_ROADMAP.clearFiltersAria}
      >
        {GH_ROADMAP.clearFilters}
      </Button>
    ) : null}
  </Box>
)

export default RoadmapFilters
