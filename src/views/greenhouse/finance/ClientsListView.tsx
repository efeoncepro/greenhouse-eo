'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import CreateClientDrawer from '@views/greenhouse/finance/drawers/CreateClientDrawer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientProfile {
  clientProfileId: string
  hubspotCompanyId: string
  legalName: string | null
  taxId: string | null
  paymentTermsDays: number
  paymentCurrency: string
  requiresPo: boolean
  requiresHes: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ClientsListView = () => {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<ClientProfile[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [poFilter, setPoFilter] = useState('')
  const [hesFilter, setHesFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const fetchClients = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (search) params.set('search', search)
      if (poFilter === 'true') params.set('requiresPo', 'true')
      if (hesFilter === 'true') params.set('requiresHes', 'true')

      const res = await fetch(`/api/finance/clients?${params.toString()}`)

      if (res.ok) {
        const data = await res.json()

        setClients(data.items ?? [])
        setTotal(data.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [search, poFilter, hesFilter])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Derived KPIs
  const poCount = clients.filter(c => c.requiresPo).length
  const hesCount = clients.filter(c => c.requiresHes).length
  const usdCount = clients.filter(c => c.paymentCurrency === 'USD').length

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading && clients.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box>
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
            Clientes
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Perfil financiero de clientes
          </Typography>
        </Box>
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant='rounded' height={120} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={400} />
      </Box>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
            Clientes
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Perfil financiero de clientes
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant='outlined'
            color='info'
            startIcon={<i className={syncing ? 'tabler-loader-2' : 'tabler-refresh'} />}
            disabled={syncing}
            onClick={async () => {
              setSyncing(true)

              try {
                const res = await fetch('/api/finance/clients/sync', { method: 'POST' })

                if (res.ok) {
                  const data = await res.json()

                  alert(data.message)
                  fetchClients()
                } else {
                  const data = await res.json().catch(() => ({}))

                  alert(data.error || `Error al sincronizar (${res.status})`)
                }
              } catch {
                alert('Error de conexión al sincronizar')
              } finally {
                setSyncing(false)
              }
            }}
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar clientes'}
          </Button>
          <Button
            variant='contained'
            color='primary'
            startIcon={<i className='tabler-plus' />}
            onClick={() => setDrawerOpen(true)}
          >
            Nuevo perfil
          </Button>
        </Box>
      </Box>

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Total clientes'
            stats={String(total)}
            subtitle='Perfiles financieros'
            avatarIcon='tabler-users-group'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Requieren OC'
            stats={String(poCount)}
            subtitle='Orden de compra obligatoria'
            avatarIcon='tabler-file-check'
            avatarColor='warning'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Requieren HES'
            stats={String(hesCount)}
            subtitle='Hoja de entrada de servicio'
            avatarIcon='tabler-file-description'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Facturación USD'
            stats={String(usdCount)}
            subtitle='Clientes en dólares'
            avatarIcon='tabler-currency-dollar'
            avatarColor='success'
          />
        </Grid>
      </Grid>

      {/* Filters + Table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Directorio de clientes'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
              <i className='tabler-users-group' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <CustomTextField
            size='small'
            placeholder='Buscar por nombre o RUT...'
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ minWidth: 240 }}
            InputProps={{
              startAdornment: <i className='tabler-search' style={{ fontSize: 18, marginRight: 8, color: 'var(--mui-palette-text-secondary)' }} />
            }}
          />
          <CustomTextField
            select
            size='small'
            value={poFilter}
            onChange={e => setPoFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value=''>OC: Todos</MenuItem>
            <MenuItem value='true'>Requiere OC</MenuItem>
          </CustomTextField>
          <CustomTextField
            select
            size='small'
            value={hesFilter}
            onChange={e => setHesFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value=''>HES: Todos</MenuItem>
            <MenuItem value='true'>Requiere HES</MenuItem>
          </CustomTextField>
        </CardContent>
        <Divider />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Razón social</TableCell>
                <TableCell sx={{ width: 120 }}>RUT</TableCell>
                <TableCell sx={{ width: 100 }}>Plazo</TableCell>
                <TableCell sx={{ width: 80 }}>Moneda</TableCell>
                <TableCell sx={{ width: 60 }} align='center'>OC</TableCell>
                <TableCell sx={{ width: 60 }} align='center'>HES</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align='center' sx={{ py: 6 }}>
                    <Typography variant='body2' color='text.secondary'>
                      No hay perfiles de clientes registrados aún
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                clients.map(client => (
                  <TableRow
                    key={client.clientProfileId}
                    hover
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant='body2' fontWeight={600}>
                          {client.legalName || client.clientProfileId}
                        </Typography>
                        <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {client.hubspotCompanyId}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {client.taxId || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{client.paymentTermsDays} días</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' fontWeight={500}>{client.paymentCurrency}</Typography>
                    </TableCell>
                    <TableCell align='center'>
                      {client.requiresPo ? (
                        <CustomChip round='true' size='small' color='warning' label='Sí' />
                      ) : (
                        <Typography variant='caption' color='text.secondary'>No</Typography>
                      )}
                    </TableCell>
                    <TableCell align='center'>
                      {client.requiresHes ? (
                        <CustomChip round='true' size='small' color='info' label='Sí' />
                      ) : (
                        <Typography variant='caption' color='text.secondary'>No</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <CreateClientDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSuccess={() => { setDrawerOpen(false); fetchClients() }} />
    </Box>
  )
}

export default ClientsListView
