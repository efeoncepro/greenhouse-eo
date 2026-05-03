'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

import { toast } from 'sonner'

import EmptyState from '@/components/greenhouse/EmptyState'
import type { PaymentOrdersKpis } from '@/lib/finance/payment-orders/get-kpis'
import type { PaymentObligation } from '@/types/payment-obligations'
import type { PaymentOrder, PaymentOrderWithLines } from '@/types/payment-orders'

import PaymentOrdersKpiRow from './PaymentOrdersKpiRow'
import PaymentOrdersHealthGrid from './PaymentOrdersHealthGrid'
import ObligationsTab from './tabs/ObligationsTab'
import OrdersTab from './tabs/OrdersTab'
import ReconciliationTab from './tabs/ReconciliationTab'
import EventsTab from './tabs/EventsTab'
import ObligationDetailDrawer from './ObligationDetailDrawer'
import OrderDetailDrawer from './OrderDetailDrawer'
import CreateOrderDialog from './CreateOrderDialog'

type TabKey = 'obligations' | 'orders' | 'reconciliation' | 'events'

const PaymentOrdersView = () => {
  const [tab, setTab] = useState<TabKey>('obligations')

  const [kpis, setKpis] = useState<PaymentOrdersKpis | null>(null)
  const [kpisLoading, setKpisLoading] = useState(true)

  const [obligations, setObligations] = useState<PaymentObligation[]>([])
  const [obligationsLoading, setObligationsLoading] = useState(false)
  const [selectedObligationIds, setSelectedObligationIds] = useState<Set<string>>(new Set())

  const [orders, setOrders] = useState<PaymentOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [drawerOrder, setDrawerOrder] = useState<PaymentOrderWithLines | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)

  const [openObligationId, setOpenObligationId] = useState<string | null>(null)

  // ── Loaders ─────────────────────────────────────────────────

  const loadKpis = useCallback(async () => {
    setKpisLoading(true)

    try {
      const r = await fetch('/api/admin/finance/payment-orders/kpis')

      if (!r.ok) throw new Error('kpis_failed')
      setKpis(await r.json())
    } catch (e) {
      console.error(e)
      toast.error('No fue posible cargar los KPIs')
    } finally {
      setKpisLoading(false)
    }
  }, [])

  const loadObligations = useCallback(async () => {
    setObligationsLoading(true)

    try {
      const r = await fetch('/api/admin/finance/payment-obligations?limit=200&status=all')

      if (!r.ok) throw new Error('obligations_failed')
      const json = await r.json()

      setObligations(json.items ?? [])
    } catch (e) {
      console.error(e)
      toast.error('No fue posible cargar las obligaciones')
    } finally {
      setObligationsLoading(false)
    }
  }, [])

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)

    try {
      const r = await fetch('/api/admin/finance/payment-orders?limit=200')

      if (!r.ok) throw new Error('orders_failed')
      const json = await r.json()

      setOrders(json.items ?? [])
    } catch (e) {
      console.error(e)
      toast.error('No fue posible cargar las órdenes')
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadKpis()
    void loadObligations()
    void loadOrders()
  }, [loadKpis, loadObligations, loadOrders])

  // ── Actions ─────────────────────────────────────────────────

  const handleOpenCreate = useCallback(() => {
    if (selectedObligationIds.size === 0) {
      toast.info('Selecciona al menos una obligación')

      return
    }

    setCreateDialogOpen(true)
  }, [selectedObligationIds])

  const handleOrderCreated = useCallback(
    async (order: PaymentOrder) => {
      setCreateDialogOpen(false)
      setSelectedObligationIds(new Set())
      toast.success(`Orden ${order.title} creada`)
      await Promise.all([loadKpis(), loadObligations(), loadOrders()])
    },
    [loadKpis, loadObligations, loadOrders]
  )

  const handleOpenOrder = useCallback(async (orderId: string) => {
    setDrawerLoading(true)
    setDrawerOrder({ orderId } as unknown as PaymentOrderWithLines)

    try {
      const r = await fetch(`/api/admin/finance/payment-orders/${orderId}`)

      if (!r.ok) throw new Error('order_failed')
      const json = await r.json()

      setDrawerOrder(json.order)
    } catch (e) {
      console.error(e)
      toast.error('No fue posible abrir la orden')
      setDrawerOrder(null)
    } finally {
      setDrawerLoading(false)
    }
  }, [])

  const handleOrderActionComplete = useCallback(async () => {
    await Promise.all([loadKpis(), loadObligations(), loadOrders()])

    if (drawerOrder?.orderId) {
      await handleOpenOrder(drawerOrder.orderId)
    }
  }, [loadKpis, loadObligations, loadOrders, drawerOrder, handleOpenOrder])

  // ── Selection helpers ──────────────────────────────────────

  const obligationsAvailableForOrder = useMemo(
    () => obligations.filter(o => o.status === 'generated' || o.status === 'partially_paid'),
    [obligations]
  )

  const toggleObligation = useCallback((id: string) => {
    setSelectedObligationIds(prev => {
      const next = new Set(prev)

      if (next.has(id)) next.delete(id)
      else next.add(id)

      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedObligationIds(new Set()), [])

  const selectedObligations = useMemo(
    () => obligationsAvailableForOrder.filter(o => selectedObligationIds.has(o.obligationId)),
    [obligationsAvailableForOrder, selectedObligationIds]
  )

  // ── Render ──────────────────────────────────────────────────

  return (
    <Stack spacing={6}>
      {/* Header */}
      <Card elevation={0} sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }} justifyContent='space-between'>
            <Stack spacing={0.5}>
              <Typography variant='overline' color='text.secondary' letterSpacing='0.06em'>
                Finanzas · Pagos
              </Typography>
              <Typography variant='h4'>Órdenes de pago</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 720 }}>
                Tesorería convierte obligaciones en pagos ejecutables, sin tocar el cálculo de Payroll. Las
                obligaciones provienen automáticamente de nómina exportada, facturas de proveedores y
                obligaciones tributarias. Esta vista permite planificarlas, agruparlas en órdenes,
                aprobarlas y liberarlas a procesador con trazabilidad maker-checker.
              </Typography>
            </Stack>
            <Button
              variant='contained'
              startIcon={<i className='tabler-clipboard-plus' />}
              onClick={handleOpenCreate}
              disabled={selectedObligationIds.size === 0}
            >
              Crear orden ({selectedObligationIds.size})
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <PaymentOrdersKpiRow kpis={kpis} loading={kpisLoading} />

      {/* Health grid: bridge stats + drift per period (mockup spec §"DRIFT HEALTH") */}
      <PaymentOrdersHealthGrid />

      {/* Tabs */}
      <Card elevation={0} sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}>
        <CardHeader
          title={
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v as TabKey)}
              variant='scrollable'
              scrollButtons='auto'
              aria-label='Pestañas de Órdenes de pago'
            >
              <Tab value='obligations' label={`Obligaciones (${obligationsAvailableForOrder.length})`} />
              <Tab value='orders' label={`Órdenes de pago (${orders.length})`} />
              <Tab value='reconciliation' label='Conciliación' />
              <Tab value='events' label='Eventos del outbox' />
            </Tabs>
          }
          sx={{ pb: 0 }}
        />
        <CardContent>
          {tab === 'obligations' ? (
            obligations.length === 0 && !obligationsLoading ? (
              <EmptyState
                icon='tabler-clipboard-off'
                title='Sin obligaciones por programar'
                description='Las obligaciones de nómina se generan al exportar un periodo. Las facturas de proveedores y obligaciones tributarias se materializarán en próximas iteraciones.'
              />
            ) : (
              <ObligationsTab
                obligations={obligations}
                loading={obligationsLoading}
                selectedIds={selectedObligationIds}
                onToggle={toggleObligation}
                onClearSelection={clearSelection}
                onCreateOrder={handleOpenCreate}
                onOpenObligation={setOpenObligationId}
              />
            )
          ) : null}

          {tab === 'orders' ? (
            orders.length === 0 && !ordersLoading ? (
              <EmptyState
                icon='tabler-stack-2'
                title='Aún no hay órdenes de pago'
                description='Selecciona obligaciones desde la pestaña Obligaciones y crea tu primera orden.'
                action={
                  <Button variant='outlined' onClick={() => setTab('obligations')}>
                    Ir a obligaciones
                  </Button>
                }
              />
            ) : (
              <OrdersTab orders={orders} loading={ordersLoading} onOpenOrder={handleOpenOrder} />
            )
          ) : null}

          {tab === 'reconciliation' ? <ReconciliationTab /> : null}

          {tab === 'events' ? <EventsTab /> : null}
        </CardContent>
      </Card>

      <CreateOrderDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        obligations={selectedObligations}
        onCreated={handleOrderCreated}
      />

      <OrderDetailDrawer
        order={drawerOrder}
        loading={drawerLoading}
        onClose={() => setDrawerOrder(null)}
        onActionComplete={handleOrderActionComplete}
      />

      <ObligationDetailDrawer
        obligationId={openObligationId}
        onClose={() => setOpenObligationId(null)}
      />

      <Alert severity='info' icon={<i className='tabler-info-circle' />} sx={{ alignSelf: 'flex-start' }}>
        Esta vista lee desde <code>greenhouse_finance.payment_obligations</code> y{' '}
        <code>greenhouse_finance.payment_orders</code>. Cada acción publica un evento en{' '}
        <code>greenhouse_sync.outbox_events</code> para auditoría y proyecciones reactivas.
      </Alert>
    </Stack>
  )
}

export default PaymentOrdersView
