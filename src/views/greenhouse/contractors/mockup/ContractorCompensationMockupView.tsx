'use client'

// TASK-968 mockup — showcase of the 3 compensation surfaces across 3 states.
// A) Admin editor (drawer) · B) Contractor derived read-only · C) Payable guardrail
// + override. The design expresses SoD: HR sets it, the contractor only sees it
// derived, Finance is gated. Modern microinteractions, prefers-reduced-motion aware.

import { useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import { OperationalPanel } from '@/components/greenhouse/primitives'
import { formatCurrency, type CurrencyCode } from '@/lib/format'
import { AnimatePresence, motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

import ContractorCompensationDrawer from './ContractorCompensationDrawer'
import {
  buildCompensationMock,
  cadenceLabel,
  cadenceUnitLabel,
  rateTypeLabel,
  type CompensationFormValue,
  type CompensationState
} from './compensation-data'

const MotionDiv = motion.div

const COPY = {
  edit: 'Editar compensación',
  define: 'Definir compensación',
  authorize: 'Autorizar excepción',
  cancel: 'Cancelar',
  confirmOverride: 'Autorizar y registrar'
}

const SectionHeading = ({ overline, title }: { overline: string; title: string }) => (
  <Stack spacing={0.5} sx={{ mb: 4 }}>
    <Typography variant='caption' sx={{ color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
      {overline}
    </Typography>
    <Typography variant='h6' sx={{ fontWeight: 600 }}>
      {title}
    </Typography>
  </Stack>
)

const money = (n: number, currency: string) =>
  formatCurrency(n, currency as CurrencyCode, { currencySymbolSpacing: ' ' }, 'es-CL')

const ContractorCompensationMockupView = () => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()

  const [state, setState] = useState<CompensationState>('undefined')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideDone, setOverrideDone] = useState(false)
  const [savedValue, setSavedValue] = useState<CompensationFormValue | null>(null)

  const mock = useMemo(() => buildCompensationMock(state), [state])
  const comp = savedValue && state !== 'undefined' ? savedValue : mock.compensation
  const hasRate = comp.rateAmount !== null

  const fade = (key: string, children: React.ReactNode) => (
    <AnimatePresence mode='wait'>
      <MotionDiv
        key={key}
        initial={prefersReduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReduced ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
      >
        {children}
      </MotionDiv>
    </AnimatePresence>
  )

  const hoverLift = prefersReduced
    ? {}
    : { transition: 'transform .2s ease, box-shadow .2s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: theme.shadows[3] } }

  // One-time staggered mount entrance (premium reveal; reduced-motion aware).
  const entrance = (i: number) =>
    prefersReduced
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay: 0.07 * i, ease: [0.2, 0, 0, 1] as const }
        }

  return (
    <Box sx={{ p: { xs: 4, md: 6 }, maxWidth: 1120, mx: 'auto' }}>
      <Stack spacing={1} sx={{ mb: 5 }}>
        <Typography variant='h4' sx={{ fontWeight: 700 }}>
          Compensación del contractor
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          TASK-968 — el monto acordado se setea desde admin (HR), el contractor lo ve derivado y Finance queda gateado.
          Separación de funciones: <strong>HR fija</strong> ≠ <strong>contractor cobra</strong> ≠ <strong>Finance paga</strong>.
        </Typography>
      </Stack>

      {/* State toggle */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, mb: 6 }}>
        <CardContent>
          <Stack spacing={1}>
            <Typography id='comp-state-label' variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Estado del engagement
            </Typography>
            <ToggleButtonGroup
              exclusive
              size='small'
              value={state}
              aria-labelledby='comp-state-label'
              onChange={(_, v) => {
                if (!v) return
                setState(v as CompensationState)
                setSavedValue(null)
                setOverrideDone(false)
              }}
            >
              <ToggleButton value='undefined'>Sin definir</ToggleButton>
              <ToggleButton value='defined'>Definido</ToggleButton>
              <ToggleButton value='exceeds'>Excede acuerdo</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </CardContent>
      </Card>

      {/* A — Admin editor entry (Inspector compensation panel) */}
      <MotionDiv {...entrance(0)}>
        <SectionHeading overline='Admin · HR' title='Editor de compensación' />
        <Box sx={{ mb: 8 }}>
        <OperationalPanel
          title='Compensación'
          subheader='El monto acordado se define aquí. El contractor nunca lo escribe.'
          icon='tabler-coin'
          iconColor={hasRate ? 'primary' : 'warning'}
          action={
            hasRate ? (
              <Button size='small' variant='tonal' startIcon={<i className='tabler-edit' />} onClick={() => setDrawerOpen(true)}>
                {COPY.edit}
              </Button>
            ) : null
          }
        >
          {fade(
            hasRate ? 'has' : 'empty',
            hasRate ? (
              <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, ...hoverLift }}>
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'center' }} spacing={3}>
                    <Stack spacing={0.5}>
                      <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                        Monto acordado · {rateTypeLabel(comp.rateType)} · {cadenceLabel(comp.paymentCadence)}
                      </Typography>
                      <Typography variant='h4' sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                        <AnimatedCounter value={comp.rateAmount as number} format='currency' currency={comp.currency} duration={prefersReduced ? 0 : 0.5} />
                        <Typography component='span' variant='body2' sx={{ color: 'text.secondary', fontWeight: 400 }}>
                          {' '}/ {cadenceUnitLabel(comp.paymentCadence)}
                        </Typography>
                      </Typography>
                    </Stack>
                    <CustomChip round='true' size='small' variant='tonal' color='success' label='Acordado' icon={<i className='tabler-circle-check' />} />
                  </Stack>
                </CardContent>
              </Card>
            ) : (
              <Stack
                spacing={3}
                alignItems='flex-start'
                sx={{
                  p: 5,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  border: t => `1px dashed ${alpha(t.palette.warning.main, 0.5)}`,
                  bgcolor: alpha(theme.palette.warning.main, 0.04)
                }}
              >
                <Stack direction='row' spacing={2} alignItems='center'>
                  <i className='tabler-alert-triangle' style={{ fontSize: 22, color: theme.palette.warning.main }} aria-hidden />
                  <Box>
                    <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                      Sin monto acordado
                    </Typography>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      Este engagement aún no tiene compensación definida. El contractor no puede declarar trabajo hasta definirla.
                    </Typography>
                  </Box>
                </Stack>
                <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setDrawerOpen(true)}>
                  {COPY.define}
                </Button>
              </Stack>
            )
          )}
        </OperationalPanel>
        </Box>
      </MotionDiv>

      {/* B — Contractor derived read-only */}
      <MotionDiv {...entrance(1)}>
        <SectionHeading overline='Contractor · self-service' title='Monto del envío (derivado, read-only)' />
        <Box sx={{ mb: 8 }}>
        <OperationalPanel
          title='Datos del envío'
          subheader='El contractor declara el trabajo; el monto se calcula de su compensación acordada.'
          icon='tabler-clipboard-text'
          iconColor='info'
        >
          {fade(
            `sub-${hasRate}`,
            hasRate ? (
              <Stack spacing={4}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
                  <CustomTextField label='Período de servicio' value={mock.submission.period} fullWidth disabled />
                  <CustomTextField label='Cantidad' value='—' fullWidth disabled helperText='Solo en timesheet' />
                </Stack>
                <Box
                  sx={{
                    p: 4,
                    borderRadius: `${theme.shape.customBorderRadius.md}px`,
                    bgcolor: alpha(theme.palette.info.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`
                  }}
                >
                  <Stack direction='row' spacing={2} alignItems='center'>
                    <i className='tabler-lock' style={{ fontSize: 20, color: theme.palette.info.main }} aria-hidden />
                    <Box>
                      <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                        Monto del período
                      </Typography>
                      <Typography variant='h5' sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                        <AnimatedCounter value={comp.rateAmount as number} format='currency' currency={comp.currency} duration={prefersReduced ? 0 : 0.5} />
                      </Typography>
                      <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                        Según tu compensación acordada. No editable.
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            ) : (
              <Alert severity='warning' icon={<i className='tabler-alert-circle' />}>
                Tu engagement aún no tiene monto acordado definido. Contacta a HR para habilitar tus envíos.
              </Alert>
            )
          )}
        </OperationalPanel>
        </Box>
      </MotionDiv>

      {/* C — Payable guardrail + override */}
      <MotionDiv {...entrance(2)}>
        <SectionHeading overline='Finance · payable' title='Guardrail del monto acordado' />
        <OperationalPanel
          title='Preparación del payable'
        subheader='Bloquea pagar por encima de lo acordado. La excepción se autoriza y queda auditada.'
        icon='tabler-shield-dollar'
        iconColor={mock.guardrail.breached && !overrideDone ? 'error' : 'success'}
      >
        {fade(
          `guard-${state}-${overrideDone}`,
          mock.guardrail.breached ? (
            overrideDone ? (
              <Alert severity='info' icon={<i className='tabler-file-check' />}>
                Excepción autorizada y registrada (maker-checker). El pago de {money(mock.guardrail.paymentAmount, comp.currency)} puede avanzar a Finance.
              </Alert>
            ) : (
              <Stack
                spacing={3}
                sx={{
                  p: 4,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.4)}`,
                  bgcolor: alpha(theme.palette.error.main, 0.04)
                }}
              >
                <Stack direction='row' spacing={2} alignItems='flex-start'>
                  <motion.span
                    style={{ display: 'inline-flex', flexShrink: 0 }}
                    initial={prefersReduced ? false : { scale: 0.8, opacity: 0 }}
                    animate={prefersReduced ? { opacity: 1 } : { scale: [0.8, 1.12, 1], opacity: 1 }}
                    transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
                  >
                    <i className='tabler-alert-triangle' style={{ fontSize: 22, color: theme.palette.error.main }} aria-hidden />
                  </motion.span>
                  <Box>
                    <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                      Excede el monto acordado
                    </Typography>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      Pago {money(mock.guardrail.paymentAmount, comp.currency)} · Acordado {money(mock.guardrail.agreedAmount, comp.currency)} ·{' '}
                      <Box component='span' sx={{ color: 'error.main', fontWeight: 600 }}>
                        Exceso{' '}
                        <AnimatedCounter
                          value={mock.guardrail.paymentAmount - mock.guardrail.agreedAmount}
                          format='currency'
                          currency={comp.currency}
                          duration={prefersReduced ? 0 : 0.6}
                        />
                      </Box>
                    </Typography>
                  </Box>
                </Stack>
                <Box>
                  <Button variant='tonal' color='error' startIcon={<i className='tabler-lock-open' />} onClick={() => setOverrideOpen(true)}>
                    {COPY.authorize}
                  </Button>
                </Box>
              </Stack>
            )
          ) : (
            <Alert severity='success' icon={<i className='tabler-circle-check' />}>
              {hasRate
                ? `El pago coincide con el monto acordado (${money(mock.guardrail.agreedAmount || (comp.rateAmount as number), comp.currency)}). Listo para avanzar a Finance.`
                : 'Define la compensación para habilitar el control del pago.'}
            </Alert>
          )
        )}
        </OperationalPanel>
      </MotionDiv>

      {/* Drawer (Surface A) */}
      <ContractorCompensationDrawer
        open={drawerOpen}
        mock={mock}
        onClose={() => setDrawerOpen(false)}
        onSaved={v => setSavedValue(v)}
      />

      {/* Override dialog (Surface C) */}
      <Dialog open={overrideOpen} onClose={() => setOverrideOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Autorizar excepción de pago</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              Vas a autorizar un pago por encima del monto acordado. Requiere una segunda firma (maker-checker) y queda registrado.
            </Typography>
            <CustomTextField
              label='Motivo de la excepción'
              placeholder='Ej. bono por entrega extraordinaria aprobada por…'
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
              multiline
              minRows={3}
              fullWidth
              helperText={`${overrideReason.trim().length}/10 caracteres mínimos`}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 6, pb: 5 }}>
          <Button variant='tonal' color='secondary' onClick={() => setOverrideOpen(false)}>
            {COPY.cancel}
          </Button>
          <Button
            variant='contained'
            color='error'
            disabled={overrideReason.trim().length < 10}
            onClick={() => {
              setOverrideOpen(false)
              setOverrideDone(true)
            }}
          >
            {COPY.confirmOverride}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ContractorCompensationMockupView
