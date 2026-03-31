'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'

import SupplierProviderToolingTab from './SupplierProviderToolingTab'
import type { SupplierProviderToolingSnapshot } from './SupplierProviderToolingTab'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentRecord {
  expenseId: string
  amount: number
  currency: string
  paymentDate: string | null
  paymentMethod: string | null
  documentNumber: string | null
  description: string
}

interface SupplierDetail {
  supplierId: string
  providerId: string | null
  legalName: string
  tradeName: string | null
  taxId: string
  taxIdType: string
  country: string
  category: string
  serviceType: string | null
  isInternational: boolean
  primaryContactName: string | null
  primaryContactEmail: string | null
  primaryContactPhone: string | null
  website: string | null
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountType: string | null
  bankRouting: string | null
  paymentCurrency: string
  defaultPaymentTerms: number
  defaultPaymentMethod: string
  requiresPo: boolean
  isActive: boolean
  notes: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  providerTooling: SupplierProviderToolingSnapshot | null
  paymentHistory: PaymentRecord[]
}

// ---------------------------------------------------------------------------
// Category labels
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  software: 'Software',
  infrastructure: 'Infraestructura',
  professional_services: 'Servicios profesionales',
  media: 'Media',
  creative: 'Creatividad',
  hr_services: 'RRHH',
  office: 'Oficina',
  legal_accounting: 'Legal / Contable',
  other: 'Otro'
}

// ---------------------------------------------------------------------------
// Payment method labels
// ---------------------------------------------------------------------------

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transfer: 'Transferencia',
  check: 'Cheque',
  cash: 'Efectivo',
  credit_card: 'Tarjeta de crédito',
  other: 'Otro'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: currency === 'CLP' ? 0 : 2 }).format(amount)

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return '—'
  }

  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()

  return `${dd}/${mm}/${yyyy}`
}

// ---------------------------------------------------------------------------
// Field row helper
// ---------------------------------------------------------------------------

const FieldRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
    <Typography variant='caption' sx={{ textTransform: 'uppercase', color: 'text.disabled' }}>
      {label}
    </Typography>
    <Typography variant='body2'>{value ?? '—'}</Typography>
  </Box>
)

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

const LoadingSkeleton = () => (
  <Stack spacing={4}>
    <Stack direction='row' spacing={2} alignItems='center'>
      <Skeleton variant='circular' width={40} height={40} />
      <Box>
        <Skeleton width={240} height={28} />
        <Skeleton width={160} height={20} />
      </Box>
    </Stack>
    <Skeleton variant='rounded' height={300} />
    <Skeleton variant='rounded' height={200} />
  </Stack>
)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SupplierDetailView = () => {
  const params = useParams()
  const supplierId = params.id as string

  const [supplier, setSupplier] = useState<SupplierDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    const controller = new AbortController()

    const loadSupplier = async () => {
      try {
        setIsLoading(true)

        const response = await fetch(`/api/finance/suppliers/${supplierId}`, {
          cache: 'no-store',
          signal: controller.signal
        })

        if (!response.ok) {
          throw new Error(`Error al cargar proveedor (${response.status})`)
        }

        const data: SupplierDetail = await response.json()

        setSupplier(data)
      } catch (err: unknown) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message ?? 'Error desconocido')
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadSupplier()

    return () => controller.abort()
  }, [supplierId])

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <Box sx={{ p: 4 }}>
        <LoadingSkeleton />
      </Box>
    )
  }

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  if (error || !supplier) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color='error'>{error ?? 'No se encontró el proveedor'}</Typography>
        <Button component={Link} href='/finance/suppliers' variant='text' sx={{ mt: 2 }}>
          <i className='tabler-arrow-left' style={{ marginRight: 6 }} />
          Volver a proveedores
        </Button>
      </Box>
    )
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const categoryLabel = CATEGORY_LABELS[supplier.category] ?? supplier.category

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Stack direction='row' alignItems='center' spacing={2} sx={{ mb: 4 }}>
        <Button component={Link} href='/finance/suppliers' variant='text' size='small' sx={{ minWidth: 'auto' }}>
          <i className='tabler-arrow-left' />
        </Button>

        <Box sx={{ flex: 1 }}>
          <Stack direction='row' alignItems='center' spacing={1.5} flexWrap='wrap'>
            <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
              {supplier.legalName}
            </Typography>
            <CustomChip label={categoryLabel} size='small' round='true' variant='tonal' color='primary' />
            <CustomChip
              label={supplier.providerId ? 'Provider 360 conectado' : 'Sin vínculo canónico'}
              size='small'
              round='true'
              variant='tonal'
              color={supplier.providerId ? 'info' : 'warning'}
            />
            <CustomChip
              label={supplier.isActive ? 'Activo' : 'Inactivo'}
              size='small'
              round='true'
              variant='tonal'
              color={supplier.isActive ? 'success' : 'error'}
            />
          </Stack>
          {supplier.tradeName && (
            <Typography variant='body2' color='text.secondary'>
              {supplier.tradeName}
            </Typography>
          )}
        </Box>
      </Stack>

      {/* Tabs */}
      <TabContext value={activeTab}>
        <CustomTabList onChange={(_e, val: string) => setActiveTab(val)} sx={{ mb: 3 }}>
          <Tab
            value='info'
            label='Información'
            icon={<i className='tabler-info-circle' />}
            iconPosition='start'
          />
          <Tab
            value='payments'
            label='Historial de pagos'
            icon={<i className='tabler-receipt' />}
            iconPosition='start'
          />
          <Tab
            value='provider'
            label='Provider 360'
            icon={<i className='tabler-building-store' />}
            iconPosition='start'
          />
        </CustomTabList>

        {/* ---- Tab: Información ---- */}
        <TabPanel value='info' sx={{ p: 0 }}>
          <Grid container spacing={4}>
            {/* Datos generales */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Card elevation={0} sx={{ border: t => '1px solid ' + t.palette.divider }}>
                <CardHeader
                  avatar={
                    <Avatar variant='rounded' sx={{ bgcolor: 'primary.main' }}>
                      <i className='tabler-building' />
                    </Avatar>
                  }
                  title='Datos generales'
                  titleTypographyProps={{ variant: 'h6' }}
                />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FieldRow label='Razón social' value={supplier.legalName} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FieldRow label='Nombre comercial' value={supplier.tradeName} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FieldRow label={supplier.taxIdType ?? 'RUT'} value={supplier.taxId} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FieldRow label='País' value={supplier.country} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FieldRow label='Categoría' value={categoryLabel} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FieldRow label='Tipo de servicio' value={supplier.serviceType} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FieldRow
                        label='Internacional'
                        value={supplier.isInternational ? 'Sí' : 'No'}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Datos bancarios */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Card elevation={0} sx={{ border: t => '1px solid ' + t.palette.divider }}>
                <CardHeader
                  avatar={
                    <Avatar variant='rounded' sx={{ bgcolor: 'info.main' }}>
                      <i className='tabler-building-bank' />
                    </Avatar>
                  }
                  title='Datos bancarios'
                  titleTypographyProps={{ variant: 'h6' }}
                />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12 }}>
                      <FieldRow label='Banco' value={supplier.bankName} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FieldRow label='Número de cuenta' value={supplier.bankAccountNumber} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FieldRow label='Tipo de cuenta' value={supplier.bankAccountType} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <FieldRow label='Código de ruta' value={supplier.bankRouting} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FieldRow label='Moneda de pago' value={supplier.paymentCurrency} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FieldRow
                        label='Plazo de pago'
                        value={`${supplier.defaultPaymentTerms} días`}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <FieldRow
                        label='Método de pago'
                        value={PAYMENT_METHOD_LABELS[supplier.defaultPaymentMethod] ?? supplier.defaultPaymentMethod}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Contacto principal */}
            <Grid size={{ xs: 12 }}>
              <Card elevation={0} sx={{ border: t => '1px solid ' + t.palette.divider }}>
                <CardHeader
                  avatar={
                    <Avatar variant='rounded' sx={{ bgcolor: 'success.main' }}>
                      <i className='tabler-user' />
                    </Avatar>
                  }
                  title='Contacto principal'
                  titleTypographyProps={{ variant: 'h6' }}
                />
                <CardContent>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <FieldRow label='Nombre' value={supplier.primaryContactName} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <FieldRow label='Correo electrónico' value={supplier.primaryContactEmail} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <FieldRow label='Teléfono' value={supplier.primaryContactPhone} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <FieldRow label='Sitio web' value={supplier.website} />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Notas (solo si existen) */}
            {supplier.notes && (
              <Grid size={{ xs: 12 }}>
                <Card elevation={0} sx={{ border: t => '1px solid ' + t.palette.divider }}>
                  <CardHeader
                    avatar={
                      <Avatar variant='rounded' sx={{ bgcolor: 'warning.main' }}>
                        <i className='tabler-notes' />
                      </Avatar>
                    }
                    title='Notas'
                    titleTypographyProps={{ variant: 'h6' }}
                  />
                  <CardContent>
                    <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
                      {supplier.notes}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* ---- Tab: Historial de pagos ---- */}
        <TabPanel value='payments' sx={{ p: 0 }}>
          <Card elevation={0} sx={{ border: t => '1px solid ' + t.palette.divider }}>
            <CardHeader
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'primary.main' }}>
                  <i className='tabler-receipt' />
                </Avatar>
              }
              title='Historial de pagos'
              titleTypographyProps={{ variant: 'h6' }}
            />
            <CardContent>
              {supplier.paymentHistory.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <i className='tabler-receipt-off' style={{ fontSize: 48, opacity: 0.3 }} />
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                    Este proveedor aún no tiene pagos registrados.
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Documento</TableCell>
                        <TableCell>Descripción</TableCell>
                        <TableCell align='right'>Monto</TableCell>
                        <TableCell>Moneda</TableCell>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Método</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {supplier.paymentHistory.map(payment => (
                        <TableRow key={payment.expenseId}>
                          <TableCell>
                            <Typography variant='body2'>{payment.documentNumber ?? '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{payment.description}</Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='body2'>
                              {formatAmount(payment.amount, payment.currency)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{payment.currency}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{formatDate(payment.paymentDate)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>
                              {payment.paymentMethod ? (PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod) : '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value='provider' sx={{ p: 0 }}>
          <SupplierProviderToolingTab
            supplierId={supplier.supplierId}
            supplierName={supplier.tradeName || supplier.legalName}
            providerId={supplier.providerId}
            providerTooling={supplier.providerTooling}
          />
        </TabPanel>
      </TabContext>
    </Box>
  )
}

export default SupplierDetailView
