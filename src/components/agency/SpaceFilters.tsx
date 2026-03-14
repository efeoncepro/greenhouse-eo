'use client'

import { useCallback, useState } from 'react'

import Card from '@mui/material/Card'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { AgencySpaceHealth } from '@/lib/agency/agency-queries'

type StatusFilter = 'all' | 'active' | 'inactive'

type Props = {
  spaces: AgencySpaceHealth[]
  onChange: (filtered: AgencySpaceHealth[]) => void
  filteredCount?: number
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

const SpaceFilters = ({ spaces, onChange, filteredCount }: Props) => {
  const [search, setSearch] = useState('')
  const [serviceLine, setServiceLine] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('all')

  const applyFilters = useCallback(
    (q: string, sl: string, st: StatusFilter) => {
      const query = q.toLowerCase()

      onChange(
        spaces.filter(s => {
          const matchesSearch = !query || s.clientName.toLowerCase().includes(query) || s.clientId.toLowerCase().includes(query)
          const matchesLine = sl === 'all' || s.businessLines.includes(sl)
          const matchesStatus = st === 'all' || (st === 'active' ? s.assetsActivos > 0 : s.assetsActivos === 0)

          return matchesSearch && matchesLine && matchesStatus
        })
      )
    },
    [spaces, onChange]
  )

  const handleSearch = (v: string) => { setSearch(v); applyFilters(v, serviceLine, status) }
  const handleLine = (v: string) => { setServiceLine(v); applyFilters(search, v, status) }
  const handleStatus = (v: StatusFilter) => { setStatus(v); applyFilters(search, serviceLine, v) }

  return (
    <Card elevation={0} sx={{ p: 2.5, border: `1px solid ${GH_COLORS.neutral.border}`, borderRadius: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap='wrap' useFlexGap alignItems='center'>
        <CustomTextField
          size='small'
          placeholder={GH_AGENCY.search_placeholder}
          value={search}
          onChange={e => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <i className='tabler-search' style={{ fontSize: '1rem', color: GH_COLORS.neutral.textSecondary }} />
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

        <Stack direction='row' sx={{ flex: 1, justifyContent: 'flex-end' }}>
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
        </Stack>
      </Stack>
    </Card>
  )
}

export default SpaceFilters
