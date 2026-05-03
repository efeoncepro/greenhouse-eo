'use client'

import { useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import {
  createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel,
  getSortedRowModel, useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import { fuzzyFilter } from '@/components/tableUtils'
import { formatFte } from '@/views/greenhouse/people/helpers'

import tableStyles from '@core/styles/table.module.css'

import type { OrganizationPerson } from '../types'

type Props = {
  organizationId: string
  isAdmin?: boolean
  onAddMembership?: () => void
}

const TYPE_CONFIG: Record<string, { label: string; color: 'info' | 'secondary' | 'warning' }> = {
  team_member: { label: 'Equipo Efeonce', color: 'info' },
  client_user: { label: 'Usuario', color: 'secondary' },
  client_contact: { label: 'Contacto', color: 'secondary' },
  contact: { label: 'Contacto', color: 'secondary' },
  billing: { label: 'Facturación', color: 'warning' },
  contractor: { label: 'Contratista', color: 'secondary' },
  partner: { label: 'Partner', color: 'secondary' },
  advisor: { label: 'Asesor', color: 'secondary' }
}

const ASSIGNMENT_TYPE_CONFIG: Record<string, { label: string; color: 'default' | 'info' | 'warning' }> = {
  internal: { label: 'Interno', color: 'default' },
  staff_augmentation: { label: 'Staff Aug', color: 'info' },
  mixed: { label: 'Mixto', color: 'warning' }
}

const formatEmploymentContext = (person: OrganizationPerson) => {
  const tokens = [person.jobLevel, person.employmentType].filter(Boolean)

  return tokens.length > 0 ? tokens.join(' · ') : null
}

// ── Columns ──

const colHelper = createColumnHelper<OrganizationPerson>()

 
const columns: ColumnDef<OrganizationPerson, any>[] = [
  colHelper.accessor('fullName', {
    header: 'Persona',
    cell: ({ row }) => (
      <Box>
        <Typography variant='body2' fontWeight={600}>{row.original.fullName ?? 'Sin nombre'}</Typography>
        {row.original.canonicalEmail && <Typography variant='caption' color='text.secondary'>{row.original.canonicalEmail}</Typography>}
      </Box>
    )
  }),
  colHelper.accessor('membershipType', {
    header: 'Tipo',
    cell: ({ row, getValue }) => {
      const cfg = TYPE_CONFIG[getValue()]
      const assignmentCfg = row.original.assignmentType ? ASSIGNMENT_TYPE_CONFIG[row.original.assignmentType] : null

      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <CustomChip round='true' size='small' variant='tonal' color={cfg?.color ?? 'secondary'} label={cfg?.label ?? getValue()} />
          {assignmentCfg ? (
            <CustomChip round='true' size='small' variant='tonal' color={assignmentCfg.color} label={assignmentCfg.label} />
          ) : null}
        </Box>
      )
    }
  }),
  colHelper.accessor('roleLabel', {
    header: 'Rol',
    cell: ({ row, getValue }) => (
      <Box>
        <Typography variant='body2' color='text.secondary'>{getValue() ?? '—'}</Typography>
        {formatEmploymentContext(row.original) ? (
          <Typography variant='caption' color='text.secondary'>
            {formatEmploymentContext(row.original)}
          </Typography>
        ) : null}
      </Box>
    )
  }),
  colHelper.accessor('department', {
    header: 'Departamento',
    cell: ({ getValue }) => <Typography variant='body2' color='text.secondary'>{getValue() ?? '—'}</Typography>
  }),
  colHelper.accessor('assignedFte', {
    header: 'FTE',
    cell: ({ getValue }) => (
      <Typography variant='body2'>
        {typeof getValue() === 'number' ? formatFte(getValue()) : '—'}
      </Typography>
    ),
    meta: { align: 'right' }
  }),
  colHelper.accessor('isPrimary', {
    header: 'Principal',
    cell: ({ getValue }) => getValue()
      ? <i className='tabler-star-filled' style={{ fontSize: 16, color: 'var(--mui-palette-warning-main)' }} aria-label='Contacto principal' />
      : <Typography variant='body2' color='text.secondary'>—</Typography>,
    meta: { align: 'center' }
  })
]

// ── Component ──

const OrganizationPeopleTab = ({ organizationId, isAdmin, onAddMembership }: Props) => {
  const [memberships, setMemberships] = useState<OrganizationPerson[]>([])
  const [teamSummary, setTeamSummary] = useState<{ totalMembers: number; totalFte: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'fullName', desc: false }])
  const [globalFilter, setGlobalFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [resLegacy, res360] = await Promise.all([
          fetch(`/api/organizations/${organizationId}/memberships`)
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`/api/organization/${organizationId}/360?facets=team`)
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null)
        ])

        if (resLegacy) {
          setMemberships(resLegacy.items ?? [])
        }

        if (res360?.team) {
          setTeamSummary({
            totalMembers: res360.team.totalMembers ?? 0,
            totalFte: res360.team.totalFte ?? 0
          })
        } else {
          setTeamSummary(null)
        }
      } catch {
        // Non-blocking
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [organizationId])

  const table = useReactTable({
    data: memberships,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  })

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Grid container spacing={6}>
      {/* 360 Team Summary KPIs */}
      {teamSummary ? (
        <>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <HorizontalWithSubtitle
              title='Total personas'
              stats={String(teamSummary.totalMembers)}
              subtitle='miembros vinculados (360)'
              avatarIcon='tabler-users'
              avatarColor='info'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <HorizontalWithSubtitle
              title='FTE total'
              stats={formatFte(teamSummary.totalFte)}
              subtitle='dedicación acumulada (360)'
              avatarIcon='tabler-clock'
              avatarColor='success'
            />
          </Grid>
        </>
      ) : null}

      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title={`Personas (${memberships.length})`}
            subheader='Membresías y contexto operativo de personas vinculadas a esta organización'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
                <i className='tabler-users' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
              </Avatar>
            }
            action={
              isAdmin && onAddMembership ? (
                <Button variant='tonal' size='small' startIcon={<i className='tabler-user-plus' />} onClick={onAddMembership}>
                  Agregar persona
                </Button>
              ) : undefined
            }
          />
          <Divider />
          {memberships.length === 0 ? (
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
                <Typography variant='h6' sx={{ mb: 1 }}>Sin personas vinculadas</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Aún no hay membresías registradas para esta organización.
                </Typography>
              </Box>
            </CardContent>
          ) : (
            <>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <CustomTextField value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} placeholder='Buscar persona…' sx={{ minWidth: 220 }} />
                <Typography variant='caption' color='text.secondary' sx={{ alignSelf: 'center' }}>{table.getFilteredRowModel().rows.length} de {memberships.length}</Typography>
              </CardContent>
              <div className='overflow-x-auto'>
                <table className={tableStyles.table}>
                  <thead>
                    {table.getHeaderGroups().map(hg => (
                      <tr key={hg.id}>
                        {hg.headers.map(header => (
                          <th key={header.id} onClick={header.column.getToggleSortingHandler()} className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })} style={{ textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.length === 0 ? (
                      <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}><Typography variant='body2' color='text.secondary'>Sin resultados</Typography></td></tr>
                    ) : table.getRowModel().rows.map(row => (
                      <tr key={row.id}>
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </Grid>
    </Grid>
  )
}

export default OrganizationPeopleTab
