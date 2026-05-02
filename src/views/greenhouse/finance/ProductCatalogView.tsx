'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

// ── Types ──

interface Product {
  productId: string
  name: string
  sku: string | null
  description: string | null
  unitPrice: number | null
  costOfGoodsSold: number | null
  margin: number | null
  currency: string
  isRecurring: boolean
  billingFrequency: string | null
  category: string | null
  isActive: boolean
  source: string
  hubspotProductId: string | null
}

// ── Config ──

const SOURCE_OPTIONS = [
  { value: '', label: 'Todas las fuentes' },
  { value: 'hubspot', label: 'HubSpot' },
  { value: 'manual', label: 'Manual' }
]

const SOURCE_CHIP_CONFIG: Record<string, { label: string; color: 'warning' | 'secondary' }> = {
  hubspot: { label: 'HubSpot', color: 'warning' },
  manual: { label: 'Manual', color: 'secondary' }
}

// ── Helpers ──

const formatCLP = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

// ── Create Product Drawer ──

const CreateProductDrawer = ({
  open,
  onClose,
  onCreated
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [description, setDescription] = useState('')
  const [unitPrice, setUnitPrice] = useState<number | ''>('')
  const [costOfGoodsSold, setCostOfGoodsSold] = useState<number | ''>('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [billingFrequency, setBillingFrequency] = useState('')

  const resetForm = () => {
    setName('')
    setSku('')
    setDescription('')
    setUnitPrice('')
    setCostOfGoodsSold('')
    setIsRecurring(false)
    setBillingFrequency('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    setError(null)

    if (!name.trim()) {
      setError('Ingresa un nombre para el producto')

      return
    }

    if (!sku.trim()) {
      setError('Ingresa un SKU')

      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/finance/products/hubspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim(),
          description: description.trim() || undefined,
          unitPrice: unitPrice !== '' ? Number(unitPrice) : undefined,
          costOfGoodsSold: costOfGoodsSold !== '' ? Number(costOfGoodsSold) : undefined,
          isRecurring,
          billingFrequency: billingFrequency || undefined
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'No se pudo crear el producto')

        return
      }

      handleClose()
      onCreated()
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer anchor='right' open={open} onClose={handleClose} sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 420 } } }}>
      <Box sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Typography variant='h6'>Nuevo producto HubSpot</Typography>
          <IconButton onClick={handleClose} aria-label='Cerrar'>
            <i className='tabler-x' />
          </IconButton>
        </Box>

        <Stack spacing={3}>
          <CustomTextField fullWidth size='small' label='Nombre' value={name} onChange={e => setName(e.target.value)} />
          <CustomTextField fullWidth size='small' label='SKU' value={sku} onChange={e => setSku(e.target.value)} placeholder='ej. SVC-CRM-001' />
          <CustomTextField fullWidth size='small' label='Descripcion' value={description} onChange={e => setDescription(e.target.value)} multiline rows={2} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <CustomTextField size='small' label='Precio unitario' type='number' value={unitPrice} onChange={e => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))} sx={{ flex: 1 }} />
            <CustomTextField size='small' label='Costo (COGS)' type='number' value={costOfGoodsSold} onChange={e => setCostOfGoodsSold(e.target.value === '' ? '' : Number(e.target.value))} sx={{ flex: 1 }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <input type='checkbox' id='isRecurring' checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
            <label htmlFor='isRecurring'><Typography variant='body2'>Producto recurrente</Typography></label>
          </Box>
          {isRecurring && (
            <CustomTextField select size='small' label='Frecuencia' value={billingFrequency} onChange={e => setBillingFrequency(e.target.value)}>
              <MenuItem value='monthly'>Mensual</MenuItem>
              <MenuItem value='quarterly'>Trimestral</MenuItem>
              <MenuItem value='annual'>Anual</MenuItem>
            </CustomTextField>
          )}

          {error && <Typography variant='body2' color='error' role='alert'>{error}</Typography>}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant='tonal' color='secondary' onClick={handleClose} disabled={submitting}>Cancelar</Button>
            <Button variant='contained' onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Creando...' : 'Crear producto'}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Drawer>
  )
}

// ── Main Component ──

const ProductCatalogView = () => {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Product[]>([])
  const [sourceFilter, setSourceFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (sourceFilter) params.set('source', sourceFilter)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())
      params.set('active', 'true')

      const res = await fetch(`/api/finance/products?${params.toString()}`)

      if (res.ok) {
        const data = await res.json()

        setItems(data.items ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [sourceFilter, searchQuery])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  if (loading) {
    return (
      <Stack spacing={4}>
        <Skeleton variant='rounded' height={56} />
        <Skeleton variant='rounded' height={400} />
      </Stack>
    )
  }

  return (
    <Stack spacing={4}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 500 }}>Productos</Typography>
          <Typography variant='body2' color='text.secondary'>
            Catalogo de productos y servicios sincronizado con HubSpot
          </Typography>
        </Box>
        <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setDrawerOpen(true)}>
          Nuevo producto
        </Button>
      </Box>

      <Card variant='outlined'>
        <CardHeader
          title='Catalogo de productos'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-package' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            </Avatar>
          }
          action={
            <CustomChip round='true' size='small' variant='tonal' color='secondary' label={`${items.length} productos`} />
          }
        />
        <Divider />
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <CustomTextField
            size='small'
            label='Buscar'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder='Nombre o SKU...'
            sx={{ minWidth: 200 }}
          />
          <CustomTextField
            select
            size='small'
            label='Fuente'
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            {SOURCE_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </CustomTextField>
        </CardContent>
        <Divider />

        {items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }} role='status'>
            <Typography variant='h6' sx={{ mb: 1 }}>Sin productos</Typography>
            <Typography variant='body2' color='text.secondary'>
              Los productos aparecen aqui cuando se sincronizan desde HubSpot o se crean manualmente.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align='right'>Precio</TableCell>
                  <TableCell align='right'>Costo</TableCell>
                  <TableCell align='right'>Margen</TableCell>
                  <TableCell>Recurrente</TableCell>
                  <TableCell>Fuente</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map(p => {
                  const sourceConf = SOURCE_CHIP_CONFIG[p.source] ?? SOURCE_CHIP_CONFIG.manual

                  return (
                    <TableRow key={p.productId} hover>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontWeight: 500 }}>{p.name}</Typography>
                        {p.description && (
                          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>
                          {p.sku ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>
                          {p.unitPrice !== null ? formatCLP(p.unitPrice) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>
                          {p.costOfGoodsSold !== null ? formatCLP(p.costOfGoodsSold) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        {p.margin !== null ? (
                          <CustomChip
                            round='true'
                            size='small'
                            variant='tonal'
                            color={p.margin >= 30 ? 'success' : p.margin >= 10 ? 'warning' : 'error'}
                            label={`${p.margin.toFixed(1)}%`}
                          />
                        ) : (
                          <Typography variant='body2' color='text.secondary'>—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.isRecurring ? (
                          <CustomChip round='true' size='small' variant='tonal' color='info' label={p.billingFrequency === 'monthly' ? 'Mensual' : p.billingFrequency === 'quarterly' ? 'Trimestral' : p.billingFrequency === 'annual' ? 'Anual' : 'Recurrente'} sx={{ height: 20, fontSize: '0.65rem' }} />
                        ) : (
                          <Typography variant='body2' color='text.secondary'>Unico</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <CustomChip round='true' size='small' variant='tonal' color={sourceConf.color} label={sourceConf.label} sx={{ height: 20, fontSize: '0.65rem' }} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      <CreateProductDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onCreated={fetchProducts} />
    </Stack>
  )
}

export default ProductCatalogView
