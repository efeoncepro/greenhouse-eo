'use client'

import { useEffect, useMemo } from 'react'

import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'

import CustomTextField from '@core/components/mui/TextField'

import type { PersonListItem } from '@/types/people'
import type { TeamRoleCategory } from '@/types/team'
import { roleCategoryLabel } from './helpers'

type Props = {
  data: PersonListItem[]
  role: string
  country: string
  status: string
  search: string
  setRole: (v: string) => void
  setCountry: (v: string) => void
  setStatus: (v: string) => void
  setSearch: (v: string) => void
  setFiltered: (d: PersonListItem[]) => void
}

const PeopleListFilters = ({
  data, role, country, status, search,
  setRole, setCountry, setStatus, setSearch, setFiltered
}: Props) => {
  const roles = useMemo(
    () => [...new Set(data.map(d => d.roleCategory))].sort(),
    [data]
  )

  const countries = useMemo(
    () => [...new Set(data.map(d => d.locationCountry).filter(Boolean))].sort() as string[],
    [data]
  )

  useEffect(() => {
    const filtered = data.filter(item => {
      if (role && item.roleCategory !== role) return false
      if (country && item.locationCountry !== country) return false
      if (status === 'active' && !item.active) return false
      if (status === 'inactive' && item.active) return false

      if (search) {
        const q = search.toLowerCase()

        return item.displayName.toLowerCase().includes(q) || item.publicEmail.toLowerCase().includes(q)
      }

      return true
    })

    setFiltered(filtered)
  }, [data, role, country, status, search, setFiltered])

  return (
    <CardContent>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <CustomTextField
            select
            fullWidth
            size='small'
            label='Rol'
            value={role}
            onChange={e => setRole(e.target.value)}
          >
            <MenuItem value=''>Todos</MenuItem>
            {roles.map(r => (
              <MenuItem key={r} value={r}>
                {roleCategoryLabel[r as TeamRoleCategory] ?? r}
              </MenuItem>
            ))}
          </CustomTextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <CustomTextField
            select
            fullWidth
            size='small'
            label='País'
            value={country}
            onChange={e => setCountry(e.target.value)}
          >
            <MenuItem value=''>Todos</MenuItem>
            {countries.map(c => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </CustomTextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <CustomTextField
            select
            fullWidth
            size='small'
            label='Estado'
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <MenuItem value=''>Todos</MenuItem>
            <MenuItem value='active'>Activo</MenuItem>
            <MenuItem value='inactive'>Inactivo</MenuItem>
          </CustomTextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <CustomTextField
            fullWidth
            size='small'
            placeholder='Buscar por nombre o email...'
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </Grid>
      </Grid>
    </CardContent>
  )
}

export default PeopleListFilters
