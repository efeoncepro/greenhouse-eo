'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'
import { GH_GROWTH_AEO_OPERATOR } from '@/lib/copy/growth'
// Type-only import (erased en build): el módulo es server-only, pero el union de estados es el contrato.
import type { RecommendationStatusValue } from '@/lib/growth/ai-visibility/recommendation-status'

/**
 * TASK-1276 Slice 2 — Control de estado de ejecución del Plan AEO (nodo S7, write del operador).
 *
 * Cliente del command gobernado `setRecommendationStatus` (TASK-1275) vía su API route: CERO lógica
 * de negocio acá — la única regla replicada es UX (motivo requerido en `blocked`/`dismissed`, que el
 * server igual valida con 422). Estados color-independientes (texto + ícono SIEMPRE, nunca color solo);
 * `aria-pressed` en el grupo; sin motion gratuito (el cambio de estado re-renderiza sin animación).
 */

const P = GH_GROWTH_AEO_OPERATOR.plan

// Paridad compile-time con RECOMMENDATION_STATUS_VALUES (server-only): si el server agrega/renombra
// un estado, `satisfies` rompe acá y obliga a actualizar el control.
const STATUS_OPTIONS = [
  'not_started',
  'in_progress',
  'blocked',
  'done',
  'dismissed'
] as const satisfies readonly RecommendationStatusValue[]

const REASON_REQUIRED: readonly RecommendationStatusValue[] = ['blocked', 'dismissed']

const STATUS_ICON: Record<RecommendationStatusValue, string> = {
  not_started: 'tabler-circle',
  in_progress: 'tabler-progress',
  blocked: 'tabler-hand-stop',
  done: 'tabler-circle-check',
  dismissed: 'tabler-circle-minus'
}

const STATUS_CHIP_COLOR: Record<RecommendationStatusValue, 'default' | 'info' | 'warning' | 'success'> = {
  not_started: 'default',
  in_progress: 'info',
  blocked: 'warning',
  done: 'success',
  dismissed: 'default'
}

export interface PlanStatusVM {
  status: RecommendationStatusValue
  reason: string | null
  updatedBy: string | null
  updatedAt: string | null
}

export interface PlanStatusSectionProps {
  /** Estado actual del foco; null = sin seguimiento aún (degradación honesta). */
  current: PlanStatusVM | null
  /** Write en vuelo para ESTE foco (deshabilita el grupo). */
  busy: boolean
  onSetStatus: (status: RecommendationStatusValue, reason: string | null) => void
}

/** Chip de estado del plan, color-independiente (texto + ícono siempre). */
export const PlanStatusChip = ({
  status,
  size
}: {
  status: RecommendationStatusValue | null
  size?: 'small' | 'medium'
}) =>
  status === null ? (
    <Chip size={size} variant='outlined' icon={<i className='tabler-help-circle' />} label={P.untracked} />
  ) : (
    <Chip
      size={size}
      variant={STATUS_CHIP_COLOR[status] === 'default' ? 'outlined' : 'tonal'}
      color={STATUS_CHIP_COLOR[status] === 'default' ? undefined : STATUS_CHIP_COLOR[status]}
      icon={<i className={STATUS_ICON[status]} />}
      label={P.status[status]}
    />
  )

const PlanStatusSection = ({ current, busy, onSetStatus }: PlanStatusSectionProps) => {
  // Selección pendiente de motivo (blocked/dismissed): el write se difiere hasta confirmar el reason.
  const [pendingStatus, setPendingStatus] = useState<RecommendationStatusValue | null>(null)
  const [reason, setReason] = useState('')
  const [reasonMissing, setReasonMissing] = useState(false)

  const activeStatus = current?.status ?? null

  const choose = (status: RecommendationStatusValue) => {
    if (busy || status === activeStatus) return

    if (REASON_REQUIRED.includes(status)) {
      setPendingStatus(status)
      setReason('')
      setReasonMissing(false)

      return
    }

    setPendingStatus(null)
    onSetStatus(status, null)
  }

  const confirmWithReason = () => {
    if (!pendingStatus) return

    const trimmed = reason.trim()

    if (trimmed.length === 0) {
      setReasonMissing(true)

      return
    }

    onSetStatus(pendingStatus, trimmed)
    setPendingStatus(null)
  }

  return (
    <Box
      data-capture='aeo-plan-status'
      sx={theme => ({
        p: 4,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper
      })}
    >
      <Stack spacing={4}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent='space-between'
        >
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant='h5' component='h3'>
              {P.sectionTitle}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {P.sectionHelp}
            </Typography>
          </Stack>
          <PlanStatusChip status={activeStatus} />
        </Stack>

        <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap role='group' aria-label={P.groupAria}>
          {STATUS_OPTIONS.map(status => {
            const active = status === activeStatus || status === pendingStatus

            return (
              <Button
                key={status}
                size='small'
                variant={active ? 'contained' : 'outlined'}
                color={active ? 'primary' : 'inherit'}
                disabled={busy}
                aria-pressed={active}
                startIcon={<i className={STATUS_ICON[status]} />}
                onClick={() => choose(status)}
                // Neutro (NUNCA secondary olivo para affordances): borde divider + texto secundario.
                sx={active ? undefined : { color: 'text.secondary', borderColor: 'divider' }}
              >
                {P.status[status]}
              </Button>
            )
          })}
        </Stack>

        {pendingStatus ? (
          <Stack spacing={2} sx={{ maxWidth: 560 }}>
            <CustomTextField
              fullWidth
              label={P.reasonLabel}
              placeholder={P.reasonPlaceholder}
              value={reason}
              disabled={busy}
              error={reasonMissing}
              helperText={
                reasonMissing
                  ? pendingStatus === 'blocked'
                    ? P.reasonRequiredBlocked
                    : P.reasonRequiredDismissed
                  : undefined
              }
              onChange={e => {
                setReason(e.target.value)
                if (reasonMissing && e.target.value.trim().length > 0) setReasonMissing(false)
              }}
            />
            <Stack direction='row' spacing={2}>
              <Button size='small' variant='contained' disabled={busy} onClick={confirmWithReason}>
                {P.reasonConfirm}
              </Button>
              <Button
                size='small'
                variant='outlined'
                color='inherit'
                sx={{ color: 'text.secondary', borderColor: 'divider' }}
                disabled={busy}
                onClick={() => {
                  setPendingStatus(null)
                  setReasonMissing(false)
                }}
              >
                {P.reasonCancel}
              </Button>
            </Stack>
          </Stack>
        ) : null}

        {busy ? (
          <Typography variant='caption' color='text.secondary'>
            {P.saving}
          </Typography>
        ) : current?.reason ? (
          <Typography variant='caption' color='text.secondary'>
            {P.reasonLabel}: {current.reason}
          </Typography>
        ) : null}

        {current?.updatedBy ? (
          <Typography variant='caption' color='text.secondary'>
            {P.updatedBy(current.updatedBy)}
            {current.updatedAt ? ` · ${current.updatedAt}` : ''}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  )
}

export default PlanStatusSection
