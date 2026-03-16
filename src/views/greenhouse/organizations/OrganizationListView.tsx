'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

// ── Types ──────────────────────────────────────────────────────────────

interface OrganizationListItem {
  organizationId: string
  publicId: string
  organizationName: string
  legalName: string | null
  industry: string | null
  country: string | null
  hubspotCompanyId: string | null
  status: string
  active: boolean
  spaceCount: number
  membershipCount: number
  uniquePersonCount: number
  createdAt: string
  updatedAt: string
}

interface ListResponse {
  items: OrganizationListItem[]
  total: number
  page: number
  pageSize: number
}

// ── Helpers ────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
  prospect: 'warning',
  churned: 'error'
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  prospect: 'Prospecto',
  churned: 'Churned'
}

const COUNTRY_FLAGS: Record<string, string> = {
  CL: '🇨🇱', CO: '🇨🇴', VE: '🇻🇪', MX: '🇲🇽', PE: '🇵🇪', US: '🇺🇸', AR: '🇦🇷', BR: '🇧🇷', EC: '🇪🇨'
}

const countryFlag = (code: string | null) => code ? COUNTRY_FLAGS[code.toUpperCase()] ?? '🌐' : ''

// ── Component ──────────────────────────────────────────────────────────

const OrganizationListView = () => {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400)

    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    setLoading(true)

    const params = new URLSearchParams({
      page: String(page + 1),
      pageSize: String(pageSize)
    })

    if (searchDebounced) params.set('search', searchDebounced)

    try {
      const res = await fetch(`/api/organizations?${params}`)

      if (res.ok) setData(await res.json())
    } catch {
      // Non-blocking
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchDebounced])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Aggregated KPIs from current page data
  const totalOrgs = data?.total ?? 0
  const totalSpaces = data?.items.reduce((s, o) => s + o.spaceCount, 0) ?? 0
  const totalMembers = data?.items.reduce((s, o) => s + o.membershipCount, 0) ?? 0
  const totalPeople = data?.items.reduce((s, o) => s + o.uniquePersonCount, 0) ?? 0

  return (
    <Grid container spacing={6}>
      {/* KPI row */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Organizaciones'
          stats={String(totalOrgs)}
          subtitle='registradas en el sistema'
          avatarIcon='tabler-building-community'
          avatarColor='primary'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Spaces'
          stats={String(totalSpaces)}
          subtitle='tenants operativos'
          avatarIcon='tabler-layout-grid'
          avatarColor='info'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Membresías'
          stats={String(totalMembers)}
          subtitle='relaciones persona-org'
          avatarIcon='tabler-users'
          avatarColor='success'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Personas únicas'
          stats={String(totalPeople)}
          subtitle='perfiles vinculados'
          avatarIcon='tabler-user-check'
          avatarColor='warning'
        />
      </Grid>

      {/* Table card */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Organizaciones'
            subheader='Cuentas, relaciones y estructura operativa'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-building-community' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
            action={
              <CustomTextField
                placeholder='Buscar organización...'
                size='small'
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setPage(0)
                }}
                sx={{ minWidth: 220 }}
              />
            }
          />
          <Divider />

          {loading && !data ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : !data || data.items.length === 0 ? (
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 6 }} role='status'>
                <Typography variant='h6' sx={{ mb: 1 }}>Sin organizaciones</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {searchDebounced
                    ? `No hay resultados para "${searchDebounced}". Revisa la ortografía o intenta con otras palabras.`
                    : 'Aún no hay organizaciones registradas en el sistema.'}
                </Typography>
              </Box>
            </CardContent>
          ) : (
            <>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Organización</TableCell>
                      <TableCell>ID</TableCell>
                      <TableCell>País</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align='center'>Spaces</TableCell>
                      <TableCell align='center'>Personas</TableCell>
                      <TableCell>Industria</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.items.map(org => (
                      <TableRow
                        key={org.organizationId}
                        hover
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      >
                        <TableCell>
                          <Typography
                            component={Link}
                            href={`/agency/organizations/${org.organizationId}`}
                            variant='body2'
                            fontWeight={600}
                            sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {org.organizationName}
                          </Typography>
                          {org.legalName && org.legalName !== org.organizationName && (
                            <Typography variant='caption' display='block' color='text.secondary'>
                              {org.legalName}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {org.publicId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {org.country ? (
                            <Typography variant='body2'>
                              {countryFlag(org.country)} {org.country}
                            </Typography>
                          ) : (
                            <Typography variant='body2' color='text.secondary'>—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <CustomChip
                            round='true'
                            size='small'
                            variant='tonal'
                            color={STATUS_COLOR[org.status] ?? 'secondary'}
                            label={STATUS_LABEL[org.status] ?? org.status}
                          />
                        </TableCell>
                        <TableCell align='center'>
                          <Chip size='small' label={org.spaceCount} variant='outlined' />
                        </TableCell>
                        <TableCell align='center'>
                          <Chip size='small' label={org.uniquePersonCount} variant='outlined' />
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' color='text.secondary'>
                            {org.industry ?? '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Divider />
              <TablePagination
                component='div'
                count={data.total}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={pageSize}
                onRowsPerPageChange={e => {
                  setPageSize(Number(e.target.value))
                  setPage(0)
                }}
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage='Filas por página'
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
              />
            </>
          )}
        </Card>
      </Grid>
    </Grid>
  )
}

export default OrganizationListView
