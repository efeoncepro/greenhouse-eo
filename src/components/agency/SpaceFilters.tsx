'use client'

import { useCallback, useState } from 'react'

import Card from '@mui/material/Card'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'

import CustomChip from '@core/components/mui/Chip'
import CustomIconButton from '@core/components/mui/IconButton'
import CustomTextField from '@core/components/mui/TextField'

import { GH_AGENCY } from '@/config/greenhouse-nomenclature'
import type { AgencySpaceHealth } from '@/lib/agency/agency-queries'
import { getSpaceHealth, type SpaceHealthZone } from './space-health'

type StatusFilter = 'all' | 'active' | 'inactive'
type HealthFilter = 'all' | SpaceHealthZone
type ViewMode = 'table' | 'cards'

type Props = {
  spaces: AgencySpaceHealth[]
  onChange: (filtered: AgencySpaceHealth[]) => void
  filteredCount?: number
  viewMode?: ViewMode
  onViewModeChange?: (mode: ViewMode) => void
}

const SERVICE_LINES = ['all', 'globe', 'efeonce_digital', 'reach', 'wave', 'crm_solutions']

const SERVICE_LINE_LABELS: Record<string, string> = {
  all: 'Todas las líneas',
  globe: 'Globe',
  efeonce_digital: 'Efeonce Digital',
  reach: 'Reach',
  wave: 'Wave',
  crm_solutions: 'CRM Solutions'
}

const SpaceFilters = ({ spaces, onChange, filteredCount, viewMode, onViewModeChange }: Props) => {
  const [search, setSearch] = useState('')
  const [serviceLine, setServiceLine] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [health, setHealth] = useState<HealthFilter>('all')

  const applyFilters = useCallback(
    (q: string, sl: string, st: StatusFilter, h: HealthFilter) => {
      const query = q.toLowerCase()

      onChange(
        spaces.filter(s => {
          const matchesSearch = !query || s.clientName.toLowerCase().includes(query) || s.clientId.toLowerCase().includes(query)
          const matchesLine = sl === 'all' || s.businessLines.includes(sl)
          const matchesStatus = st === 'all' || (st === 'active' ? s.assetsActivos > 0 : s.assetsActivos === 0)
          const matchesHealth = h === 'all' || getSpaceHealth(s) === h

          return matchesSearch && matchesLine && matchesStatus && matchesHealth
        })
      )
    },
    [spaces, onChange]
  )

  const handleSearch = (v: string) => { setSearch(v); applyFilters(v, serviceLine, status, health) }
  const handleLine = (v: string) => { setServiceLine(v); applyFilters(search, v, status, health) }
  const handleStatus = (v: StatusFilter) => { setStatus(v); applyFilters(search, serviceLine, v, health) }
  const handleHealth = (v: HealthFilter) => { setHealth(v); applyFilters(search, serviceLine, status, v) }

  return (
    <Card elevation={0} sx={{ p: 2.5, border: theme => `1px solid ${theme.palette.customColors.lightAlloy}`, borderRadius: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap='wrap' useFlexGap alignItems='center'>
        <CustomTextField
          size='small'
          placeholder={GH_AGENCY.search_placeholder}
          value={search}
          onChange={e => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <i className='tabler-search' style={{ fontSize: '1rem' }} />
              </InputAdornment>
            )
          }}
          sx={{ minWidth: 220 }}
        />
        <CustomTextField
          select
          size='small'
          value={serviceLine}
          onChange={e => handleLine(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          {SERVICE_LINES.map(sl => (
            <MenuItem key={sl} value={sl}>{SERVICE_LINE_LABELS[sl]}</MenuItem>
          ))}
        </CustomTextField>
        <CustomTextField
          select
          size='small'
          value={status}
          onChange={e => handleStatus(e.target.value as StatusFilter)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value='all'>{GH_AGENCY.space_filter_all}</MenuItem>
          <MenuItem value='active'>{GH_AGENCY.space_filter_active}</MenuItem>
          <MenuItem value='inactive'>{GH_AGENCY.space_filter_inactive}</MenuItem>
        </CustomTextField>
        <CustomTextField
          select
          size='small'
          value={health}
          onChange={e => handleHealth(e.target.value as HealthFilter)}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value='all'>{GH_AGENCY.spaces_filter_health_all}</MenuItem>
          <MenuItem value='optimal'>{GH_AGENCY.spaces_filter_health_optimal}</MenuItem>
          <MenuItem value='attention'>{GH_AGENCY.spaces_filter_health_attention}</MenuItem>
          <MenuItem value='critical'>{GH_AGENCY.spaces_filter_health_critical}</MenuItem>
        </CustomTextField>

        <Stack direction='row' sx={{ flex: 1, justifyContent: 'flex-end', gap: 1 }} alignItems='center'>
          {filteredCount !== undefined && (
            <CustomChip
              round='true'
              size='small'
              color='secondary'
              variant='tonal'
              label={`${filteredCount} space${filteredCount !== 1 ? 's' : ''}`}
              sx={{ fontWeight: 500 }}
            />
          )}
          {onViewModeChange && (
            <Stack direction='row' spacing={0.5}>
              <CustomIconButton
                size='small'
                variant='tonal'
                color={viewMode === 'table' ? 'primary' : 'secondary'}
                onClick={() => onViewModeChange('table')}
                aria-label={GH_AGENCY.spaces_view_table}
              >
                <i className='tabler-list' style={{ fontSize: '1rem' }} />
              </CustomIconButton>
              <CustomIconButton
                size='small'
                variant='tonal'
                color={viewMode === 'cards' ? 'primary' : 'secondary'}
                onClick={() => onViewModeChange('cards')}
                aria-label={GH_AGENCY.spaces_view_cards}
              >
                <i className='tabler-layout-grid' style={{ fontSize: '1rem' }} />
              </CustomIconButton>
            </Stack>
          )}
        </Stack>
      </Stack>
    </Card>
  )
}

export default SpaceFilters
