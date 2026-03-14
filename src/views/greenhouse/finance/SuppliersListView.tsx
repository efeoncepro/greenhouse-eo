'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Supplier {
  supplierId: string
  legalName: string
  tradeName: string | null
  category: string
  country: string
  isInternational: boolean
  paymentCurrency: string
  defaultPaymentTerms: number
  primaryContactName: string | null
  primaryContactEmail: string | null
  isActive: boolean
}

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, { label: string; color: 'primary' | 'success' | 'info' | 'warning' | 'error' | 'secondary' }> = {
  software: { label: 'Software', color: 'info' },
  infrastructure: { label: 'Infraestructura', color: 'primary' },
  professional_services: { label: 'Servicios profesionales', color: 'success' },
  media: { label: 'Media', color: 'warning' },
  creative: { label: 'Creatividad', color: 'error' },
  hr_services: { label: 'RRHH', color: 'info' },
  office: { label: 'Oficina', color: 'secondary' },
  legal_accounting: { label: 'Legal / Contable', color: 'primary' },
  other: { label: 'Otro', color: 'secondary' }
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'Todas las categorías' },
  { value: 'software', label: 'Software' },
  { value: 'infrastructure', label: 'Infraestructura' },
  { value: 'professional_services', label: 'Servicios profesionales' },
  { value: 'media', label: 'Media' },
  { value: 'creative', label: 'Creatividad' },
  { value: 'hr_services', label: 'RRHH' },
  { value: 'office', label: 'Oficina' },
  { value: 'legal_accounting', label: 'Legal / Contable' },
  { value: 'other', label: 'Otro' }
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SuppliersListView = () => {
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [internationalFilter, setInternationalFilter] = useState('')

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (categoryFilter) params.set('category', categoryFilter)
      if (internationalFilter) params.set('international', internationalFilter)

      const res = await fetch(`/api/finance/suppliers?${params.toString()}`)

      if (res.ok) {
        const data = await res.json()

        setSuppliers(data.items ?? [])
        setTotal(data.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, internationalFilter])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  // Derived KPIs
  const activeCount = suppliers.filter(s => s.isActive).length
  const internationalCount = suppliers.filter(s => s.isInternational).length
  const categoryCounts = suppliers.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1

    return acc
  }, {})

  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading && suppliers.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box>
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
            Proveedores
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Directorio y gestión de proveedores
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
            Proveedores
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Directorio y gestión de proveedores
          </Typography>
        </Box>
        <Button
          variant='contained'
          color='primary'
          startIcon={<i className='tabler-plus' />}
          href='/finance/suppliers'
        >
          Nuevo proveedor
        </Button>
      </Box>

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Total proveedores'
            stats={String(total)}
            subtitle='Registrados en el sistema'
            avatarIcon='tabler-building-store'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Activos'
            stats={String(activeCount)}
            subtitle={`De ${total} registrados`}
            avatarIcon='tabler-check'
            avatarColor='success'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Internacionales'
            stats={String(internationalCount)}
            subtitle='Pago en USD'
            avatarIcon='tabler-world'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Categoría principal'
            stats={topCategory ? CATEGORY_LABELS[topCategory[0]]?.label || topCategory[0] : '—'}
            subtitle={topCategory ? `${topCategory[1]} proveedores` : 'Sin datos'}
            avatarIcon='tabler-tag'
            avatarColor='warning'
          />
        </Grid>
      </Grid>

      {/* Filters + Table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Directorio de proveedores'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-building-store' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <CustomTextField
            select
            size='small'
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {CATEGORY_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            select
            size='small'
            value={internationalFilter}
            onChange={e => setInternationalFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value=''>Todos</MenuItem>
            <MenuItem value='true'>Internacional</MenuItem>
            <MenuItem value='false'>Nacional</MenuItem>
          </CustomTextField>
        </CardContent>
        <Divider />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Proveedor</TableCell>
                <TableCell sx={{ width: 150 }}>Categoría</TableCell>
                <TableCell sx={{ width: 80 }}>País</TableCell>
                <TableCell sx={{ width: 80 }}>Moneda</TableCell>
                <TableCell sx={{ width: 100 }}>Plazo</TableCell>
                <TableCell sx={{ width: 160 }}>Contacto</TableCell>
                <TableCell sx={{ width: 60 }} align='center'>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 6 }}>
                    <Typography variant='body2' color='text.secondary'>
                      No hay proveedores registrados aún
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map(supplier => {
                  const catConfig = CATEGORY_LABELS[supplier.category] || CATEGORY_LABELS.other

                  return (
                    <TableRow
                      key={supplier.supplierId}
                      hover
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant='body2' fontWeight={600}>
                            {supplier.tradeName || supplier.legalName}
                          </Typography>
                          {supplier.tradeName ? (
                            <Typography variant='caption' color='text.secondary'>
                              {supplier.legalName}
                            </Typography>
                          ) : null}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          color={catConfig.color}
                          label={catConfig.label}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{supplier.country}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' fontWeight={500}>{supplier.paymentCurrency}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{supplier.defaultPaymentTerms} días</Typography>
                      </TableCell>
                      <TableCell>
                        {supplier.primaryContactName ? (
                          <Box>
                            <Typography variant='body2' fontSize='0.8rem'>{supplier.primaryContactName}</Typography>
                            {supplier.primaryContactEmail ? (
                              <Typography variant='caption' color='text.secondary'>{supplier.primaryContactEmail}</Typography>
                            ) : null}
                          </Box>
                        ) : (
                          <Typography variant='caption' color='text.secondary'>—</Typography>
                        )}
                      </TableCell>
                      <TableCell align='center'>
                        <CustomChip
                          round='true'
                          size='small'
                          color={supplier.isActive ? 'success' : 'secondary'}
                          label={supplier.isActive ? 'Activo' : 'Inactivo'}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  )
}

export default SuppliersListView
