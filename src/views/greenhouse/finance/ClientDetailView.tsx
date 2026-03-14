'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FinanceContact {
  name: string
  email: string
  phone: string
  role: string
}

interface FinancialProfile {
  clientProfileId: string
  hubspotCompanyId: string
  taxId: string | null
  taxIdType: string | null
  legalName: string | null
  billingAddress: string | null
  billingCountry: string | null
  paymentTermsDays: number
  paymentCurrency: string
  requiresPo: boolean
  requiresHes: boolean
  currentPoNumber: string | null
  currentHesNumber: string | null
  financeContacts: FinanceContact[]
  specialConditions: string | null
  createdBy: string | null
  createdAt: string | null
  updatedAt: string | null
}

interface Invoice {
  incomeId: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  totalAmount: number
  currency: string
  paymentStatus: string
  amountPaid: number
  amountPending: number
}

interface ClientDetailData {
  financialProfile: FinancialProfile
  invoices: Invoice[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCLP = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount)
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00')
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

const statusConfig: Record<string, { color: 'success' | 'warning' | 'info' | 'error'; label: string }> = {
  paid: { color: 'success', label: 'Pagado' },
  partial: { color: 'warning', label: 'Parcial' },
  pending: { color: 'info', label: 'Pendiente' },
  overdue: { color: 'error', label: 'Vencido' }
}

const roleLabels: Record<string, string> = {
  billing: 'Facturación',
  payment: 'Pagos',
  admin: 'Administración',
  legal: 'Legal'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ClientDetailView = () => {
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ClientDetailData | null>(null)
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      setLoading(true)

      try {
        const res = await fetch(`/api/finance/clients/${id}`)

        if (res.ok) {
          const json = await res.json()

          setData(json)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Skeleton variant='rounded' width={40} height={40} />
          <Box>
            <Skeleton variant='text' width={280} height={32} />
            <Skeleton variant='text' width={180} height={20} />
          </Box>
        </Box>
        <Skeleton variant='rounded' height={48} />
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Skeleton variant='rounded' height={360} />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Skeleton variant='rounded' height={360} />
          </Grid>
        </Grid>
      </Box>
    )
  }

  if (!data) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, py: 12 }}>
        <Typography variant='h6' color='text.secondary'>
          No se encontró el perfil del cliente
        </Typography>
        <Button component={Link} href='/finance/clients' variant='outlined' startIcon={<i className='tabler-arrow-left' />}>
          Volver a clientes
        </Button>
      </Box>
    )
  }

  const { financialProfile: fp, invoices } = data

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Button
            component={Link}
            href='/finance/clients'
            variant='outlined'
            color='secondary'
            sx={{ minWidth: 40, width: 40, height: 40, p: 0 }}
          >
            <i className='tabler-arrow-left' />
          </Button>
          <Box>
            <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
              {fp.legalName || fp.clientProfileId}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
              HubSpot ID: {fp.hubspotCompanyId}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {fp.requiresPo && (
            <CustomChip round='true' color='info' label='Requiere OC' icon={<i className='tabler-file-check' />} />
          )}
          {fp.requiresHes && (
            <CustomChip round='true' color='warning' label='Requiere HES' icon={<i className='tabler-file-description' />} />
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <TabContext value={activeTab}>
        <CustomTabList onChange={(_, value) => setActiveTab(value)} variant='scrollable' pill='true'>
          <Tab
            value='profile'
            label='Perfil financiero'
            icon={<i className='tabler-building-bank' />}
            iconPosition='start'
          />
          <Tab
            value='invoices'
            label='Facturas'
            icon={<i className='tabler-file-invoice' />}
            iconPosition='start'
          />
        </CustomTabList>

        {/* Tab 1: Perfil financiero */}
        <TabPanel value='profile' className='p-0'>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6, mt: 4 }}>
            <Grid container spacing={6}>
              {/* Left column: Datos de facturación */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                  <CardHeader
                    title='Datos de facturación'
                    avatar={
                      <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                        <i className='tabler-receipt' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
                      </Avatar>
                    }
                  />
                  <Divider />
                  <CardContent>
                    <Grid container spacing={4}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>
                          Razón social
                        </Typography>
                        <Typography variant='body2'>{fp.legalName || '—'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>
                          RUT
                        </Typography>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {fp.taxId || '—'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>
                          Dirección de facturación
                        </Typography>
                        <Typography variant='body2'>{fp.billingAddress || '—'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>
                          País de facturación
                        </Typography>
                        <Typography variant='body2'>{fp.billingCountry || '—'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>
                          Plazo de pago
                        </Typography>
                        <Typography variant='body2'>{fp.paymentTermsDays} días</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>
                          Moneda de pago
                        </Typography>
                        <Typography variant='body2'>{fp.paymentCurrency}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>
                          N° Orden de compra
                        </Typography>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {fp.currentPoNumber || '—'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>
                          N° HES
                        </Typography>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {fp.currentHesNumber || '—'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Right column: Contactos financieros */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                  <CardHeader
                    title='Contactos financieros'
                    avatar={
                      <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                        <i className='tabler-address-book' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
                      </Avatar>
                    }
                  />
                  <Divider />
                  <CardContent>
                    {fp.financeContacts.length === 0 ? (
                      <Typography variant='body2' color='text.secondary' sx={{ py: 4, textAlign: 'center' }}>
                        Sin contactos financieros registrados
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {fp.financeContacts.map((contact, idx) => (
                          <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant='body2' fontWeight={600}>
                                {contact.name}
                              </Typography>
                              <CustomChip
                                round='true'
                                size='small'
                                color='secondary'
                                label={roleLabels[contact.role] || contact.role}
                              />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <i className='tabler-mail' style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }} />
                              <Typography variant='caption' color='text.secondary'>
                                {contact.email}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <i className='tabler-phone' style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }} />
                              <Typography variant='caption' color='text.secondary'>
                                {contact.phone}
                              </Typography>
                            </Box>
                            {idx < fp.financeContacts.length - 1 && <Divider sx={{ mt: 2 }} />}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Condiciones especiales */}
            {fp.specialConditions && (
              <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                <CardHeader
                  title='Condiciones especiales'
                  avatar={
                    <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                      <i className='tabler-alert-triangle' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
                    </Avatar>
                  }
                />
                <Divider />
                <CardContent>
                  <Typography variant='body2'>{fp.specialConditions}</Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        </TabPanel>

        {/* Tab 2: Facturas */}
        <TabPanel value='invoices' className='p-0'>
          <Box sx={{ mt: 4 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader
                title='Historial de facturas'
                avatar={
                  <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
                    <i className='tabler-file-invoice' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
                  </Avatar>
                }
              />
              <Divider />
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>N° Factura</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Vencimiento</TableCell>
                      <TableCell align='right'>Monto</TableCell>
                      <TableCell align='right'>Pagado</TableCell>
                      <TableCell align='right'>Pendiente</TableCell>
                      <TableCell align='center'>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align='center' sx={{ py: 6 }}>
                          <Typography variant='body2' color='text.secondary'>
                            No hay facturas registradas para este cliente
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map(inv => {
                        const status = statusConfig[inv.paymentStatus] ?? { color: 'secondary' as const, label: inv.paymentStatus }

                        return (
                          <TableRow key={inv.incomeId} hover>
                            <TableCell>
                              <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {inv.invoiceNumber}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>{formatDate(inv.invoiceDate)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>{formatDate(inv.dueDate)}</Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography variant='body2' fontWeight={500}>
                                {formatCLP(inv.totalAmount)}
                              </Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography variant='body2'>{formatCLP(inv.amountPaid)}</Typography>
                            </TableCell>
                            <TableCell align='right'>
                              <Typography variant='body2'>{formatCLP(inv.amountPending)}</Typography>
                            </TableCell>
                            <TableCell align='center'>
                              <CustomChip round='true' size='small' color={status.color} label={status.label} />
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
        </TabPanel>
      </TabContext>
    </Box>
  )
}

export default ClientDetailView
