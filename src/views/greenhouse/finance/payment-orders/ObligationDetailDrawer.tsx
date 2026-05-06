'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'

import { toast } from 'sonner'

import { getMicrocopy } from '@/lib/copy'

import CustomAvatar from '@core/components/mui/Avatar'

import type { PaymentObligationDetail } from '@/lib/finance/payment-obligations/get-obligation-detail'
import type { PaymentObligationKind, PaymentObligationStatus } from '@/types/payment-obligations'

const TASK407_ARIA_CERRAR_DETALLE = "Cerrar detalle"


const GREENHOUSE_COPY = getMicrocopy()

interface ObligationDetailDrawerProps {
  obligationId: string | null
  onClose: () => void
}

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0
  }).format(amount)

const formatDateTime = (iso: string | null) => {
  if (!iso) return '—'

  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDate = (iso: string | null) => {
  if (!iso) return '—'

  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const obligationKindMeta: Record<PaymentObligationKind, { label: string; color: 'primary' | 'info' | 'warning' | 'secondary' }> = {
  employee_net_pay: { label: 'Pago neto', color: 'primary' },
  employer_social_security: { label: 'Cargas previsionales', color: 'info' },
  employee_withheld_component: { label: 'Retención SII', color: 'warning' },
  provider_payroll: { label: 'Provider Deel', color: 'info' },
  processor_fee: { label: 'Fee processor', color: 'secondary' },
  fx_component: { label: 'Componente FX', color: 'secondary' },
  manual: { label: 'Manual', color: 'secondary' }
}

const statusMeta: Record<PaymentObligationStatus, { label: string; color: 'primary' | 'info' | 'warning' | 'success' | 'error' | 'secondary' }> = {
  generated: { label: 'Generada', color: 'primary' },
  scheduled: { label: 'Programada', color: 'info' },
  partially_paid: { label: GREENHOUSE_COPY.states.partial, color: 'warning' },
  paid: { label: 'Pagada', color: 'success' },
  reconciled: { label: 'Conciliada', color: 'info' },
  closed: { label: 'Cerrada', color: 'secondary' },
  cancelled: { label: 'Anulada', color: 'secondary' },
  superseded: { label: 'Reemplazada', color: 'warning' }
}

const eventTypeMeta = (eventType: string): { label: string; icon: string; color: 'primary' | 'info' | 'warning' | 'success' | 'error' | 'secondary' } => {
  if (eventType === 'finance.payment_obligation.generated') return { label: 'Obligación generada', icon: 'tabler-circle-plus', color: 'primary' }
  if (eventType === 'finance.payment_obligation.superseded') return { label: 'Reconciliada (drift auto-resuelto)', icon: 'tabler-refresh', color: 'warning' }
  if (eventType === 'finance.payment_obligation.paid') return { label: 'Marcada como pagada', icon: 'tabler-circle-check', color: 'success' }
  if (eventType === 'finance.payment_obligation.cancelled') return { label: 'Cancelada', icon: 'tabler-circle-x', color: 'error' }
  if (eventType === 'payroll.period.exported') return { label: 'Período de Payroll exportado', icon: 'tabler-file-export', color: 'info' }
  if (eventType === 'payroll.period.closed') return { label: 'Período de Payroll cerrado', icon: 'tabler-lock', color: 'success' }
  if (eventType.startsWith('finance.payment_order')) return { label: eventType.split('.').slice(-1)[0], icon: 'tabler-file-invoice', color: 'primary' }

  return { label: eventType, icon: 'tabler-bolt', color: 'secondary' }
}

const orderStateMeta = (state: string): { label: string; color: 'primary' | 'info' | 'warning' | 'success' | 'error' | 'secondary' } => {
  const map: Record<string, { label: string; color: 'primary' | 'info' | 'warning' | 'success' | 'error' | 'secondary' }> = {
    draft: { label: GREENHOUSE_COPY.states.draft, color: 'secondary' },
    pending_approval: { label: 'Pendiente aprobación', color: 'warning' },
    approved: { label: 'Aprobada', color: 'info' },
    scheduled: { label: 'Programada', color: 'info' },
    submitted: { label: 'Enviada', color: 'primary' },
    paid: { label: 'Pagada', color: 'success' },
    settled: { label: 'Conciliada', color: 'success' },
    closed: { label: 'Cerrada', color: 'secondary' },
    failed: { label: 'Fallida', color: 'error' },
    cancelled: { label: 'Cancelada', color: 'error' }
  }

  return map[state] ?? { label: state, color: 'secondary' }
}

const beneficiaryAvatarColor = (
  type: string
): 'primary' | 'info' | 'warning' | 'secondary' => {
  if (type === 'member') return 'primary'
  if (type === 'supplier') return 'info'
  if (type === 'tax_authority') return 'warning'

  return 'secondary'
}

const initialsForBeneficiary = (name: string | null, id: string, type: string): string => {
  if (type === 'tax_authority' && id === 'cl_sii') return 'SII'

  const source = name ?? id

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p.charAt(0).toUpperCase())
    .join('') || '·'
}

const ObligationDetailDrawer = ({ obligationId, onClose }: ObligationDetailDrawerProps) => {
  const [detail, setDetail] = useState<PaymentObligationDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!obligationId) {
      setDetail(null)

      return
    }

    let cancelled = false

    ;(async () => {
      setLoading(true)

      try {
        const r = await fetch(`/api/admin/finance/payment-obligations/${obligationId}`)

        if (!r.ok) {
          const err = await r.json().catch(() => ({}))

          throw new Error(err.error ?? 'No fue posible cargar la obligación')
        }

        const json = (await r.json()) as PaymentObligationDetail

        if (!cancelled) setDetail(json)
      } catch (e) {
        console.error(e)

        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Error de red')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [obligationId])

  const isOpen = obligationId !== null

  return (
    <Drawer
      anchor='right'
      open={isOpen}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}
    >
      <Box sx={{ p: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Stack spacing={0.5}>
          <Typography variant='h6'>Detalle de obligación</Typography>
          {detail ? (
            <Typography variant='caption' color='text.disabled' sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {detail.obligation.obligationId}
            </Typography>
          ) : null}
        </Stack>
        <IconButton onClick={onClose} aria-label={TASK407_ARIA_CERRAR_DETALLE} size='small'>
          <i className='tabler-x' />
        </IconButton>
      </Box>
      <Divider />

      {loading || !detail ? (
        <Box sx={{ p: 4 }}>
          <LinearProgress />
        </Box>
      ) : (
        <Stack spacing={5} sx={{ p: 4 }}>
          {/* ── RESUMEN ───────────────────────────────────────── */}
          <Stack spacing={2.5}>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}
            >
              Resumen
            </Typography>

            <Stack direction='row' spacing={2} alignItems='center'>
              <CustomAvatar
                skin='light'
                color={beneficiaryAvatarColor(detail.obligation.beneficiaryType)}
                size={48}
                src={detail.obligation.beneficiaryAvatarUrl ?? undefined}
                sx={{ fontSize: 16, fontWeight: 600 }}
              >
                {initialsForBeneficiary(detail.obligation.beneficiaryName, detail.obligation.beneficiaryId, detail.obligation.beneficiaryType)}
              </CustomAvatar>
              <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant='subtitle1' fontWeight={600} noWrap>
                  {detail.obligation.beneficiaryName ?? detail.obligation.beneficiaryId}
                </Typography>
                <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={obligationKindMeta[detail.obligation.obligationKind].color}
                    label={obligationKindMeta[detail.obligation.obligationKind].label}
                  />
                  <Chip
                    size='small'
                    variant='tonal'
                    color={statusMeta[detail.obligation.status].color}
                    label={statusMeta[detail.obligation.status].label}
                  />
                </Stack>
              </Stack>
            </Stack>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 3, rowGap: 2 }}>
              <DataField label='Monto'>
                <Typography variant='subtitle2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(detail.obligation.amount, detail.obligation.currency)}
                </Typography>
              </DataField>
              <DataField label='Periodo'>
                <Typography variant='body2'>{detail.obligation.periodId ?? '—'}</Typography>
              </DataField>
              <DataField label='Vence'>
                <Typography variant='body2'>{formatDate(detail.obligation.dueDate)}</Typography>
              </DataField>
              <DataField label='Origen'>
                <Typography variant='caption' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {detail.obligation.sourceKind} · {detail.obligation.sourceRef}
                </Typography>
              </DataField>
            </Box>
          </Stack>

          {/* ── PAYSLIP DELIVERY (TASK-759) ──────────────────── */}
          {detail.payslipDelivery ? (
            <>
              <Divider />
              <Stack spacing={1.5}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}
                >
                  Recibo de nómina
                </Typography>
                <Box
                  sx={theme => ({
                    p: 2,
                    borderRadius: 1.5,
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: detail.payslipDelivery!.status === 'email_sent'
                      ? `${theme.palette.success.main}0A`
                      : detail.payslipDelivery!.status === 'email_failed'
                        ? `${theme.palette.error.main}0A`
                        : 'transparent'
                  })}
                >
                  <Stack direction='row' spacing={2} alignItems='center'>
                    <CustomAvatar
                      skin='light'
                      color={
                        detail.payslipDelivery.status === 'email_sent' ? 'success'
                          : detail.payslipDelivery.status === 'email_failed' ? 'error'
                            : 'secondary'
                      }
                      size={32}
                      sx={{ fontSize: 14 }}
                    >
                      <i className={
                        detail.payslipDelivery.status === 'email_sent'
                          ? 'tabler-mail-check'
                          : detail.payslipDelivery.status === 'email_failed'
                            ? 'tabler-mail-x'
                            : 'tabler-mail'
                      } aria-hidden='true' />
                    </CustomAvatar>
                    <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                      {detail.payslipDelivery.status === 'email_sent' ? (
                        <>
                          <Typography variant='body2' fontWeight={500}>
                            Enviado a {detail.payslipDelivery.emailRecipient}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {formatDateTime(detail.payslipDelivery.emailSentAt)}
                            {detail.payslipDelivery.deliveryTrigger
                              ? ` · trigger: ${detail.payslipDelivery.deliveryTrigger === 'period_exported' ? 'al exportar período' : detail.payslipDelivery.deliveryTrigger === 'payment_paid' ? 'al pagar la orden' : 'reenvío manual'}`
                              : ''}
                          </Typography>
                        </>
                      ) : detail.payslipDelivery.status === 'email_failed' ? (
                        <>
                          <Typography variant='body2' fontWeight={500} color='error.main'>
                            Envío fallido
                          </Typography>
                          {detail.payslipDelivery.errorMessage ? (
                            <Typography variant='caption' color='text.disabled'>
                              {detail.payslipDelivery.errorMessage.slice(0, 120)}
                            </Typography>
                          ) : null}
                        </>
                      ) : detail.payslipDelivery.status === 'generated' ? (
                        <>
                          <Typography variant='body2' fontWeight={500}>
                            PDF generado, esperando envío
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            El email se enviará cuando se marque la orden como pagada
                          </Typography>
                        </>
                      ) : (
                        <Typography variant='body2' fontWeight={500} color='error.main'>
                          Generación fallida
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                </Box>
              </Stack>
            </>
          ) : null}

          <Divider />

          {/* ── COMPONENTES DEL PAGO ──────────────────────────── */}
          <Stack spacing={2}>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}
            >
              Componentes del pago
            </Typography>
            <Box sx={theme => ({ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, overflow: 'hidden' })}>
              <Table size='small'>
                <TableBody>
                  {detail.components.map((c, idx) => {
                    const isNet = idx === detail.components.length - 1 && detail.components.length > 1

                    return (
                      <TableRow
                        key={`${c.label}-${idx}`}
                        sx={isNet ? theme => ({ backgroundColor: `${theme.palette.primary.main}11` }) : undefined}
                      >
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography variant='body2' fontWeight={isNet ? 600 : 400}>
                              {c.label}
                            </Typography>
                            {c.description ? (
                              <Typography variant='caption' color='text.secondary'>
                                {c.description}
                              </Typography>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography
                            variant='body2'
                            fontWeight={isNet ? 600 : 500}
                            sx={{
                              fontVariantNumeric: 'tabular-nums',
                              color: c.sign === 'negative' ? 'error.main' : undefined
                            }}
                          >
                            {c.sign === 'negative' ? '− ' : ''}
                            {formatAmount(c.amount, c.currency)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Box>
          </Stack>

          <Divider />

          {/* ── AUDITORÍA ─────────────────────────────────────── */}
          <Stack spacing={2}>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}
            >
              Auditoría
            </Typography>
            {detail.audit.length === 0 ? (
              <Typography variant='caption' color='text.disabled'>
                Sin eventos registrados aún.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {detail.audit.map(event => {
                  const meta = eventTypeMeta(event.eventType)

                  return (
                    <Stack key={event.eventId} direction='row' spacing={2} alignItems='flex-start'>
                      <CustomAvatar
                        skin='light'
                        color={meta.color}
                        size={28}
                        sx={{ fontSize: 14 }}
                      >
                        <i className={meta.icon} aria-hidden='true' />
                      </CustomAvatar>
                      <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant='body2' fontWeight={500}>
                          {meta.label}
                        </Typography>
                        <Typography variant='caption' color='text.disabled' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatDateTime(event.occurredAt)}
                          {event.actor ? ` · ${event.actor.slice(0, 16)}` : ''}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {event.eventType}
                        </Typography>
                      </Stack>
                      <Chip size='small' variant='outlined' label={event.status} />
                    </Stack>
                  )
                })}
              </Stack>
            )}
          </Stack>

          <Divider />

          {/* ── PRÓXIMA ACCIÓN ─────────────────────────────────── */}
          <Stack spacing={2}>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}
            >
              Próxima acción
            </Typography>

            {detail.orderLinks.length > 0 ? (
              <Stack spacing={1.5}>
                <Typography variant='body2' color='text.secondary'>
                  Esta obligación está incluida en {detail.orderLinks.length} orden{detail.orderLinks.length === 1 ? '' : 'es'} de pago.
                </Typography>
                {detail.orderLinks.map(link => {
                  const stateChip = orderStateMeta(link.orderState)

                  return (
                    <Box
                      key={link.lineId}
                      sx={theme => ({
                        p: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        flexWrap: 'wrap'
                      })}
                    >
                      <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant='body2' fontWeight={500} noWrap>
                          {link.orderTitle}
                        </Typography>
                        <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                          <Chip size='small' variant='tonal' color={stateChip.color} label={stateChip.label} />
                          {link.scheduledFor ? (
                            <Typography variant='caption' color='text.secondary'>
                              Programada {formatDate(link.scheduledFor)}
                            </Typography>
                          ) : null}
                          {link.paidAt ? (
                            <Typography variant='caption' color='success.main'>
                              Pagada {formatDate(link.paidAt)}
                            </Typography>
                          ) : null}
                        </Stack>
                      </Stack>
                      <Button
                        component={Link}
                        href={`/finance/payment-orders?orderId=${encodeURIComponent(link.orderId)}`}
                        size='small'
                        variant='outlined'
                        endIcon={<i className='tabler-external-link' aria-hidden='true' />}
                      >
                        Ver orden
                      </Button>
                    </Box>
                  )
                })}
              </Stack>
            ) : detail.obligation.status === 'generated' ? (
              <Stack spacing={1.5}>
                <Typography variant='body2' color='text.secondary'>
                  Esta obligación todavía no está incluida en ninguna orden de pago. Selecciónala en la tabla
                  para crear o agregar a una orden.
                </Typography>
                <Button
                  variant='contained'
                  size='small'
                  onClick={onClose}
                  startIcon={<i className='tabler-clipboard-plus' aria-hidden='true' />}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Volver a la tabla
                </Button>
              </Stack>
            ) : detail.obligation.status === 'paid' || detail.obligation.status === 'reconciled' || detail.obligation.status === 'closed' ? (
              <Typography variant='body2' color='text.secondary'>
                Esta obligación está saldada — no requiere acción adicional.
              </Typography>
            ) : detail.obligation.status === 'cancelled' || detail.obligation.status === 'superseded' ? (
              <Stack spacing={1}>
                <Typography variant='body2' color='text.secondary'>
                  Esta obligación fue {detail.obligation.status === 'cancelled' ? 'cancelada' : 'reemplazada por una versión superior'}.
                </Typography>
                {detail.obligation.cancelledReason ? (
                  <Typography variant='caption' color='text.disabled'>
                    Motivo: {detail.obligation.cancelledReason}
                  </Typography>
                ) : null}
              </Stack>
            ) : (
              <Typography variant='body2' color='text.secondary'>
                Sin acciones recomendadas en este estado.
              </Typography>
            )}
          </Stack>
        </Stack>
      )}
    </Drawer>
  )
}

const DataField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Stack spacing={0.5}>
    <Typography
      variant='caption'
      color='text.secondary'
      sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}
    >
      {label}
    </Typography>
    {children}
  </Stack>
)

export default ObligationDetailDrawer
