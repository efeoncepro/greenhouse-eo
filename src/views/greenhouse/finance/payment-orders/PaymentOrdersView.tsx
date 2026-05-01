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
import type { PaymentCalendarItem } from '@/lib/finance/payment-calendar/list-calendar-items'

import PaymentOrdersKpiRow from './PaymentOrdersKpiRow'
import ObligationsTab from './tabs/ObligationsTab'
import OrdersTab from './tabs/OrdersTab'
import CalendarTab from './tabs/CalendarTab'
import EventsTab from './tabs/EventsTab'
import OrderDetailDrawer from './OrderDetailDrawer'
import CreateOrderDialog from './CreateOrderDialog'

type TabKey = 'obligations' | 'orders' | 'calendar' | 'events'

const PaymentOrdersView = () => {
  const [tab, setTab] = useState<TabKey>('obligations')

  const [kpis, setKpis] = useState<PaymentOrdersKpis | null>(null)
  const [kpisLoading, setKpisLoading] = useState(true)

  const [obligations, setObligations] = useState<PaymentObligation[]>([])
  const [obligationsLoading, setObligationsLoading] = useState(false)
  const [selectedObligationIds, setSelectedObligationIds] = useState<Set<string>>(new Set())

  const [orders, setOrders] = useState<PaymentOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const [calendar, setCalendar] = useState<PaymentCalendarItem[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [drawerOrder, setDrawerOrder] = useState<PaymentOrderWithLines | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)

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
      toast.error('No fue posible cargar las ordenes')
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  const loadCalendar = useCallback(async () => {
    setCalendarLoading(true)

    try {
      const r = await fetch('/api/admin/finance/payment-calendar')

      if (!r.ok) throw new Error('calendar_failed')
      const json = await r.json()

      setCalendar(json.items ?? [])
    } catch (e) {
      console.error(e)
      toast.error('No fue posible cargar el calendario')
    } finally {
      setCalendarLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadKpis()
    void loadObligations()
    void loadOrders()
    void loadCalendar()
  }, [loadKpis, loadObligations, loadOrders, loadCalendar])

  // ── Actions ─────────────────────────────────────────────────

  const handleOpenCreate = useCallback(() => {
    if (selectedObligationIds.size === 0) {
      toast.info('Selecciona al menos una obligacion')

      return
    }

    setCreateDialogOpen(true)
  }, [selectedObligationIds])

  const handleOrderCreated = useCallback(
    async (order: PaymentOrder) => {
      setCreateDialogOpen(false)
      setSelectedObligationIds(new Set())
      toast.success(`Orden ${order.title} creada`)
      await Promise.all([loadKpis(), loadObligations(), loadOrders(), loadCalendar()])
    },
    [loadKpis, loadObligations, loadOrders, loadCalendar]
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
    await Promise.all([loadKpis(), loadObligations(), loadOrders(), loadCalendar()])

    if (drawerOrder?.orderId) {
      await handleOpenOrder(drawerOrder.orderId)
    }
  }, [loadKpis, loadObligations, loadOrders, loadCalendar, drawerOrder, handleOpenOrder])

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
              <Typography variant='h4'>Ordenes de pago</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 720 }}>
                Convierte obligaciones financieras en ordenes auditables con maker-checker, programacion
                y trazabilidad de envio. Las obligaciones provienen automaticamente de nomina exportada,
                facturas de proveedores y obligaciones tributarias.
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

      {/* Tabs */}
      <Card elevation={0} sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}>
        <CardHeader
          title={
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v as TabKey)}
              variant='scrollable'
              scrollButtons='auto'
              aria-label='Pestanas de Ordenes de pago'
            >
              <Tab value='obligations' label={`Obligaciones (${obligationsAvailableForOrder.length})`} />
              <Tab value='orders' label={`Ordenes (${orders.length})`} />
              <Tab value='calendar' label={`Calendario (${calendar.length})`} />
              <Tab value='events' label='Eventos' />
            </Tabs>
          }
          sx={{ pb: 0 }}
        />
        <CardContent>
          {tab === 'obligations' ? (
            obligationsAvailableForOrder.length === 0 && !obligationsLoading ? (
              <EmptyState
                icon='tabler-clipboard-off'
                title='Sin obligaciones por programar'
                description='Las obligaciones de nomina se generan al exportar un periodo. Las facturas de proveedores y obligaciones tributarias se materializaran en proximas iteraciones.'
              />
            ) : (
              <ObligationsTab
                obligations={obligationsAvailableForOrder}
                loading={obligationsLoading}
                selectedIds={selectedObligationIds}
                onToggle={toggleObligation}
                onClearSelection={clearSelection}
                onCreateOrder={handleOpenCreate}
              />
            )
          ) : null}

          {tab === 'orders' ? (
            orders.length === 0 && !ordersLoading ? (
              <EmptyState
                icon='tabler-stack-2'
                title='Aun no hay ordenes de pago'
                description='Selecciona obligaciones desde la pestana Obligaciones y crea tu primera orden.'
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

          {tab === 'calendar' ? (
            calendar.length === 0 && !calendarLoading ? (
              <EmptyState
                icon='tabler-calendar'
                title='Calendario vacio'
                description='Cuando haya obligaciones u ordenes con fechas declaradas se mostraran aqui agrupadas por estado y vencimiento.'
              />
            ) : (
              <CalendarTab items={calendar} loading={calendarLoading} onOpenOrder={handleOpenOrder} />
            )
          ) : null}

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

      <Alert severity='info' icon={<i className='tabler-info-circle' />} sx={{ alignSelf: 'flex-start' }}>
        Esta vista lee desde <code>greenhouse_finance.payment_obligations</code> y{' '}
        <code>greenhouse_finance.payment_orders</code>. Cada accion publica un evento en{' '}
        <code>greenhouse_sync.outbox_events</code> para auditoria y proyecciones reactivas.
      </Alert>
    </Stack>
  )
}

export default PaymentOrdersView
