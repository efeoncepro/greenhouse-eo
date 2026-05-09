'use client'

import { useCallback, useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import { ROLE_CODES } from '@/config/role-codes'
import { getMicrocopy } from '@/lib/copy'
import { GH_ORGANIZATION_WORKSPACE } from '@/lib/copy/agency'
import { formatCurrency as formatGreenhouseCurrency } from '@/lib/format'

import AddMembershipDrawer from '@/views/greenhouse/organizations/drawers/AddMembershipDrawer'

const COPY = getMicrocopy()

/**
 * TASK-613 Slice 1 — Finance Clients legacy content extracted to a self-contained
 * facet sub-component. Preserves 1:1 the 3 KPIs (Por cobrar / Vencidas / Condiciones)
 * + 4 tabs (Facturación / Contactos / Facturas / Deals) + AddMembershipDrawer
 * from `src/views/greenhouse/finance/ClientDetailView.tsx`.
 *
 * Usage: rendered by `FinanceFacet` when `entrypointContext === 'finance'`. Receives
 * `clientProfileId` via prop (resolved server-side by the page wrapper from the
 * canonical bridge `resolveFinanceClientContext`). Self-fetches the legacy endpoint
 * `/api/finance/clients/[id]` since that is the canonical source of richer Finance
 * data (invoices/deals/financialProfile) — Account 360's finance facet is a
 * narrower projection.
 *
 * The facet does NOT render header chrome (org name, status, breadcrumb) — that
 * is owned by `OrganizationWorkspaceShell`. Only renders the Finance-specific
 * KPI strip + sub-tabs + drawer slot.
 */

interface FinanceContact {
  name: string
  email: string
  phone: string
  role: string
}

interface Company {
  organizationId?: string | null
  clientId: string | null
  greenhouseClientName: string | null
  hubspotCompanyId: string | null
  companyName: string | null
  companyDomain: string | null
  companyCountry: string | null
  businessLine: string | null
  serviceModules: string[]
}

interface FinancialProfile {
  organizationId?: string | null
  clientId?: string | null
  clientProfileId: string
  hubspotCompanyId: string | null
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
  invoiceNumber: string | null
  invoiceDate: string | null
  dueDate: string | null
  totalAmount: number
  currency: string
  paymentStatus: string
  amountPaid: number
  amountPending: number
}

interface Deal {
  dealId: string | null
  dealName: string | null
  dealStage: string | null
  pipeline: string | null
  amount: number
  closeDate: string | null
}

interface Summary {
  totalReceivable: number
  activeInvoicesCount: number
  overdueInvoicesCount: number
}

interface ClientDetailData {
  company: Company
  financialProfile: FinancialProfile
  summary: Summary
  invoices: Invoice[]
  deals: Deal[]
}

const formatCLP = (amount: number): string =>
  formatGreenhouseCurrency(amount, 'CLP', { minimumFractionDigits: 0 }, 'es-CL')

const formatAmount = (amount: number, currency: string): string =>
  formatGreenhouseCurrency(amount, currency, { maximumFractionDigits: currency === 'CLP' ? 0 : 2 }, 'es-CL')

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—'

  const date = new Date(dateStr + 'T00:00:00')
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

const statusConfig: Record<string, { color: 'success' | 'warning' | 'info' | 'error'; label: string }> = {
  paid: { color: 'success', label: COPY.states.paid },
  partial: { color: 'warning', label: COPY.states.partial },
  pending: { color: 'info', label: COPY.states.pending },
  overdue: { color: 'error', label: COPY.states.expired }
}

const roleLabels: Record<string, string> = {
  procurement: 'Adquisiciones',
  accounts_payable: 'Cuentas por pagar',
  finance_director: 'Director financiero',
  controller: 'Controller',
  billing: 'Facturación',
  payment: 'Pagos',
  admin: 'Administración',
  legal: 'Legal',
  other: 'Otro'
}

export type FinanceClientsContentProps = {
  /**
   * Lookup id passed by the page wrapper. Accepted shapes (resolveFinanceClientContext):
   *  - `clientProfileId` (legacy URL shape, default for `/finance/clients/[id]`)
   *  - `organizationId` (when entering with org id directly)
   */
  lookupId: string
}

const FinanceClientsContent = ({ lookupId }: FinanceClientsContentProps) => {
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.roleCodes?.includes(ROLE_CODES.EFEONCE_ADMIN) ?? false

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ClientDetailData | null>(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [addContactOpen, setAddContactOpen] = useState(false)

  const loadClientDetail = useCallback(async () => {
    if (!lookupId) return

    setLoading(true)

    try {
      const res = await fetch(`/api/finance/clients/${lookupId}`)

      if (res.ok) {
        setData(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [lookupId])

  useEffect(() => {
    void loadClientDetail()
  }, [loadClientDetail])

  if (loading) {
    return (
      <Stack spacing={6}>
        <Grid container spacing={6}>
          {[0, 1, 2].map(i => (
            <Grid size={{ xs: 12, sm: 4 }} key={i}>
              <Skeleton variant='rounded' height={120} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={48} />
        <Skeleton variant='rounded' height={360} />
      </Stack>
    )
  }

  if (!data) {
    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent>
          <Stack spacing={2} alignItems='center' sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress size={0} sx={{ display: 'none' }} />
            <Typography variant='h6' color='text.secondary'>
              {GH_ORGANIZATION_WORKSPACE.shell.degraded.title}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {GH_ORGANIZATION_WORKSPACE.shell.degraded.reasons.unknown}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const { company, financialProfile: fp, summary, invoices, deals } = data
  const canAddFinanceContact = isAdmin && Boolean(fp.organizationId)
  const hasCanonicalOrganization = Boolean(fp.organizationId)

  const handleAddContactSuccess = () => {
    toast.success('Contacto financiero agregado.')
    void loadClientDetail()
  }

  return (
    <Stack spacing={6}>
      {/* Inline meta chips (preserve legacy header signaling sin duplicar header chrome del shell) */}
      <Stack direction='row' spacing={2} flexWrap='wrap'>
        {fp.requiresPo && (
          <CustomChip round='true' color='info' label='Requiere OC' icon={<i className='tabler-file-check' />} />
        )}
        {fp.requiresHes && (
          <CustomChip round='true' color='warning' label='Requiere HES' icon={<i className='tabler-file-description' />} />
        )}
        {company.businessLine && (
          <CustomChip round='true' color='primary' label={company.businessLine} />
        )}
      </Stack>

      {/* Finance-specific KPI strip (3 cards: Por cobrar / Vencidas / Condiciones) */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <HorizontalWithSubtitle
            title='Por cobrar'
            stats={formatCLP(summary.totalReceivable)}
            subtitle={`${summary.activeInvoicesCount} factura${summary.activeInvoicesCount !== 1 ? 's' : ''} activa${summary.activeInvoicesCount !== 1 ? 's' : ''}`}
            avatarIcon='tabler-cash'
            avatarColor='warning'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <HorizontalWithSubtitle
            title='Vencidas'
            stats={String(summary.overdueInvoicesCount)}
            subtitle='Facturas vencidas'
            avatarIcon='tabler-alert-triangle'
            avatarColor={summary.overdueInvoicesCount > 0 ? 'error' : 'success'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <HorizontalWithSubtitle
            title='Condiciones'
            stats={`${fp.paymentTermsDays} días`}
            subtitle={`Moneda: ${fp.paymentCurrency}`}
            avatarIcon='tabler-clock'
            avatarColor='info'
          />
        </Grid>
      </Grid>

      {/* 4 sub-tabs canónicos del Finance Clients legacy */}
      <TabContext value={activeTab}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CustomTabList onChange={(_, value) => setActiveTab(value)} variant='scrollable' pill='true'>
            <Tab value='profile' label='Facturación' icon={<i className='tabler-building-bank' />} iconPosition='start' />
            <Tab value='contacts' label='Contactos' icon={<i className='tabler-address-book' />} iconPosition='start' />
            <Tab value='invoices' label='Facturas' icon={<i className='tabler-file-invoice' />} iconPosition='start' />
            <Tab value='deals' label='Deals' icon={<i className='tabler-briefcase' />} iconPosition='start' />
          </CustomTabList>
        </Card>

        <TabPanel value='profile' className='p-0'>
          <Stack spacing={6} sx={{ mt: 4 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader
                title='Datos de facturación'
                avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><i className='tabler-receipt' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} /></Avatar>}
              />
              <Divider />
              <CardContent>
                <Grid container spacing={4}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>Razón social</Typography>
                    <Typography variant='body2'>{fp.legalName || '—'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>RUT</Typography>
                    <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}>{fp.taxId || '—'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>Dirección de facturación</Typography>
                    <Typography variant='body2'>{fp.billingAddress || '—'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>País</Typography>
                    <Typography variant='body2'>{fp.billingCountry || '—'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>Plazo de pago</Typography>
                    <Typography variant='body2'>{fp.paymentTermsDays} días</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>Moneda</Typography>
                    <Typography variant='body2'>{fp.paymentCurrency}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>N° OC vigente</Typography>
                    <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}>{fp.currentPoNumber || '—'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase' }}>N° HES vigente</Typography>
                    <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}>{fp.currentHesNumber || '—'}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {fp.specialConditions && (
              <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                <CardHeader
                  title='Condiciones especiales'
                  avatar={<Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}><i className='tabler-alert-triangle' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} /></Avatar>}
                />
                <Divider />
                <CardContent>
                  <Typography variant='body2'>{fp.specialConditions}</Typography>
                </CardContent>
              </Card>
            )}
          </Stack>
        </TabPanel>

        <TabPanel value='contacts' className='p-0'>
          <Box sx={{ mt: 4 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader
                title='Contactos financieros'
                avatar={<Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}><i className='tabler-address-book' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} /></Avatar>}
                action={canAddFinanceContact ? (
                  <Button
                    variant='contained'
                    size='small'
                    startIcon={<i className='tabler-plus' />}
                    onClick={() => setAddContactOpen(true)}
                  >
                    Agregar contacto
                  </Button>
                ) : undefined}
              />
              <Divider />
              <CardContent>
                {!hasCanonicalOrganization && (
                  <Alert severity='info' sx={{ mb: 4 }}>
                    Este cliente todavía no tiene una organización canónica vinculada, así que no se pueden agregar contactos desde esta vista.
                  </Alert>
                )}
                {fp.financeContacts.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant='body2' color='text.secondary'>
                      Sin contactos financieros registrados
                    </Typography>
                    {canAddFinanceContact && (
                      <Button
                        variant='tonal'
                        size='small'
                        startIcon={<i className='tabler-plus' />}
                        sx={{ mt: 3 }}
                        onClick={() => setAddContactOpen(true)}
                      >
                        Crear primer contacto
                      </Button>
                    )}
                  </Box>
                ) : (
                  <Stack spacing={4}>
                    {fp.financeContacts.map((contact, idx) => (
                      <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant='body2' fontWeight={600}>{contact.name}</Typography>
                          <CustomChip round='true' size='small' color='secondary' label={roleLabels[contact.role] || contact.role} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <i className='tabler-mail' style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }} />
                          <Typography variant='caption' color='text.secondary'>{contact.email}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <i className='tabler-phone' style={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }} />
                          <Typography variant='caption' color='text.secondary'>{contact.phone}</Typography>
                        </Box>
                        {idx < fp.financeContacts.length - 1 && <Divider sx={{ mt: 2 }} />}
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        <TabPanel value='invoices' className='p-0'>
          <Box sx={{ mt: 4 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader
                title='Historial de facturas'
                avatar={<Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}><i className='tabler-file-invoice' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} /></Avatar>}
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
                          <Typography variant='body2' color='text.secondary'>No hay facturas registradas</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map(inv => {
                        const status = statusConfig[inv.paymentStatus] ?? { color: 'secondary' as const, label: inv.paymentStatus }

                        return (
                          <TableRow
                            key={inv.incomeId}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => router.push(`/finance/income/${inv.incomeId}`)}
                          >
                            <TableCell>
                              <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}>
                                {inv.invoiceNumber || inv.incomeId}
                              </Typography>
                            </TableCell>
                            <TableCell><Typography variant='body2'>{formatDate(inv.invoiceDate)}</Typography></TableCell>
                            <TableCell><Typography variant='body2'>{formatDate(inv.dueDate)}</Typography></TableCell>
                            <TableCell align='right'><Typography variant='body2' fontWeight={500}>{formatAmount(inv.totalAmount, inv.currency)}</Typography></TableCell>
                            <TableCell align='right'><Typography variant='body2'>{formatAmount(inv.amountPaid, inv.currency)}</Typography></TableCell>
                            <TableCell align='right'><Typography variant='body2'>{formatAmount(inv.amountPending, inv.currency)}</Typography></TableCell>
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

        <TabPanel value='deals' className='p-0'>
          <Box sx={{ mt: 4 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardHeader
                title='Deals de HubSpot'
                avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><i className='tabler-briefcase' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} /></Avatar>}
              />
              <Divider />
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Deal</TableCell>
                      <TableCell>Stage</TableCell>
                      <TableCell>Pipeline</TableCell>
                      <TableCell align='right'>Monto</TableCell>
                      <TableCell>Cierre</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align='center' sx={{ py: 6 }}>
                          <Typography variant='body2' color='text.secondary'>Sin deals de HubSpot disponibles</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      deals.map((deal, idx) => (
                        <TableRow key={deal.dealId || idx} hover>
                          <TableCell>
                            <Typography variant='body2' fontWeight={500}>{deal.dealName || '—'}</Typography>
                          </TableCell>
                          <TableCell>
                            <CustomChip round='true' size='small' color='primary' label={deal.dealStage || '—'} />
                          </TableCell>
                          <TableCell><Typography variant='body2'>{deal.pipeline || '—'}</Typography></TableCell>
                          <TableCell align='right'>
                            <Typography variant='body2' fontWeight={500}>
                              {deal.amount > 0 ? formatCLP(deal.amount) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell><Typography variant='body2'>{formatDate(deal.closeDate)}</Typography></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Box>
        </TabPanel>
      </TabContext>

      {fp.organizationId && (
        <AddMembershipDrawer
          open={addContactOpen}
          organizationId={fp.organizationId}
          spaces={null}
          title='Agregar contacto financiero'
          submitLabel='Agregar contacto'
          allowedMembershipTypes={['billing', 'contact']}
          initialMembershipType='billing'
          onClose={() => setAddContactOpen(false)}
          onSuccess={() => {
            setAddContactOpen(false)
            handleAddContactSuccess()
          }}
        />
      )}
    </Stack>
  )
}

export default FinanceClientsContent
