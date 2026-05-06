'use client'

import { type ReactNode } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import {
  MarginHealthChip,
  SaveStateIndicator,
  type MarginClassification,
  type MarginHealthChipProps,
  type SaveStateKind
} from '.'

export interface EntitySummaryDockCta {
  label: string
  onClick: () => void
  loading?: boolean
  disabled?: boolean

  /** Tabler icon class (e.g. 'tabler-send'). Renders as startIcon when provided. */
  iconClassName?: string

  /**
   * Razón humana cuando el CTA está deshabilitado. Se inyecta como tooltip
   * arriba del botón y como `aria-describedby` para que la causa sea verbalizable.
   */
  disabledReason?: string
}

export interface EntitySummaryDockSaveState {
  kind: SaveStateKind
  changeCount?: number
  lastSavedAt?: Date | null
}

export interface EntitySummaryDockProps {
  /**
   * Slot principal — totales, métricas, KPI prominente. Cuando está vacío,
   * `emptyStateMessage` toma su lugar.
   */
  centerSlot?: ReactNode

  /**
   * Mensaje contextual cuando no hay datos suficientes para mostrar el
   * centerSlot. Si está presente y `centerSlot` no, reemplaza al slot por una
   * leyenda informativa con icono.
   */
  emptyStateMessage?: string | null

  /** Save state indicator en la zona izquierda (encima del contextualIndicator). */
  saveState?: EntitySummaryDockSaveState | null

  /**
   * Indicador contextual semántico debajo del save state — típicamente un
   * health chip (margen, SLA, capacity). Cuando se pasa `marginIndicator`,
   * el dock renderiza `MarginHealthChip` con esos props. Para indicadores
   * custom, usar `leftSlotExtra`.
   */
  marginIndicator?: MarginHealthChipProps | null

  /**
   * Slot adicional en la zona izquierda, debajo del marginIndicator. Útil
   * para chips/indicadores propios del dominio (compliance, validez, etc.).
   */
  leftSlotExtra?: ReactNode

  /** CTA primaria — siempre presente. */
  primaryCta: EntitySummaryDockCta

  /** CTA secundaria opcional — render como `variant='tonal'` a la izquierda del primary. */
  secondaryCta?: EntitySummaryDockCta | null

  /**
   * Alert inline en la parte superior del dock (encima del bloque central).
   * Útil para errores de simulación, warnings de cálculo, etc.
   */
  simulationError?: ReactNode | null

  /** ARIA label para el contenedor `<aside role='status'>`. Requerido. */
  ariaLabel: string

  /** ID estable para `aria-describedby` del primary CTA (default 'entity-summary-dock'). */
  id?: string
}

/**
 * Generic sticky-bottom cockpit primitive — chasis canónico para builders
 * (quote, invoice, purchase order, contract, finiquito, statement of work).
 *
 * Layout 3-zona Grid 3/6/3 en md+ con un colapso natural a single-column en xs.
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │  Estado            │  centerSlot / emptyState         │  CTAs     │
 *   │  (saveState +      │  (TotalsLadder, KPI prominente,  │  [tonal]  │
 *   │  marginIndicator)  │  empty leyenda…)                 │  [primary]│
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * - Glass background + sticky bottom + soft shadow (Greenhouse dock contract).
 * - Live region a11y consolidada en el root aside.
 * - Disabled CTA con `disabledReason` → Tooltip wrap + visuallyHidden id.
 *
 * **Reusable platform-wide**. NO importa lógica de dominio. Los slots son
 * `ReactNode` para que el consumer componga TotalsLadder, MarginHealthChip,
 * AnimatedCounter, etc., sin que el primitive sepa de finance/hr/commercial.
 */
const EntitySummaryDock = ({
  centerSlot,
  emptyStateMessage,
  saveState,
  marginIndicator,
  leftSlotExtra,
  primaryCta,
  secondaryCta,
  simulationError,
  ariaLabel,
  id = 'entity-summary-dock'
}: EntitySummaryDockProps) => {
  const reasonId = `${id}-cta-reason`
  const isPrimaryDisabled = Boolean(primaryCta.disabled || primaryCta.loading)
  const showCenter = Boolean(centerSlot) || !emptyStateMessage

  return (
    <Box
      component='aside'
      role='status'
      aria-live='polite'
      aria-label={ariaLabel}
      sx={theme => ({
        position: 'sticky',
        bottom: 16,
        zIndex: theme.zIndex.appBar - 2,
        marginTop: 3,
        px: { xs: 2, md: 3 },
        py: 2,
        backgroundColor: alpha(theme.palette.background.paper, 0.96),
        backdropFilter: 'saturate(180%) blur(10px)',
        WebkitBackdropFilter: 'saturate(180%) blur(10px)',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        boxShadow: `0 12px 32px -12px ${alpha(theme.palette.common.black, 0.22)}`
      })}
    >
      {simulationError ? (
        <Alert
          severity='error'
          role='alert'
          icon={<i className='tabler-alert-triangle' aria-hidden='true' />}
          sx={{ mb: 1.5, py: 0.5 }}
        >
          {typeof simulationError === 'string' ? (
            <Typography variant='body2'>{simulationError}</Typography>
          ) : (
            simulationError
          )}
        </Alert>
      ) : null}

      <Grid container columnSpacing={{ xs: 0, md: 3 }} rowSpacing={{ xs: 1.5, md: 0 }} alignItems='center'>
        {/* ───────────── ZONA 1: Estado (md=3) ───────────── */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Stack spacing={1} alignItems='flex-start'>
            {saveState ? (
              <SaveStateIndicator
                state={saveState.kind}
                changeCount={saveState.changeCount}
                lastSavedAt={saveState.lastSavedAt ?? null}
              />
            ) : null}
            {marginIndicator ? <MarginHealthChip {...marginIndicator} /> : null}
            {leftSlotExtra}
          </Stack>
        </Grid>

        {/* ───────────── ZONA 2: Contenido central (md=6) ───────────── */}
        <Grid size={{ xs: 12, md: 6 }}>
          {showCenter ? (
            centerSlot ?? null
          ) : (
            <Stack direction='row' spacing={1.5} alignItems='center' useFlexGap>
              <Box
                component='i'
                className='tabler-info-circle'
                aria-hidden='true'
                sx={{ fontSize: 20, color: 'text.secondary' }}
              />
              <Typography variant='body2' color='text.secondary' sx={{ fontWeight: 500 }}>
                {emptyStateMessage}
              </Typography>
            </Stack>
          )}
        </Grid>

        {/* ───────────── ZONA 3: Acciones (md=3) ───────────── */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Stack
            direction='row'
            spacing={1.5}
            alignItems='center'
            justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
            flexWrap='wrap'
            useFlexGap
          >
            {secondaryCta ? (
              <Button
                variant='tonal'
                color='secondary'
                size='medium'
                onClick={secondaryCta.onClick}
                disabled={Boolean(secondaryCta.disabled || secondaryCta.loading)}
                startIcon={
                  secondaryCta.loading ? (
                    <CircularProgress size={16} color='inherit' aria-label='Cargando' />
                  ) : secondaryCta.iconClassName ? (
                    <i className={secondaryCta.iconClassName} aria-hidden='true' />
                  ) : undefined
                }
                sx={{ minHeight: 44 }}
              >
                {secondaryCta.label}
              </Button>
            ) : null}

            {(() => {
              const button = (
                <Button
                  variant='contained'
                  size='medium'
                  onClick={primaryCta.onClick}
                  disabled={isPrimaryDisabled}
                  aria-describedby={isPrimaryDisabled && primaryCta.disabledReason ? reasonId : undefined}
                  startIcon={
                    primaryCta.loading ? (
                      <CircularProgress size={16} color='inherit' aria-label='Cargando' />
                    ) : primaryCta.iconClassName ? (
                      <i className={primaryCta.iconClassName} aria-hidden='true' />
                    ) : undefined
                  }
                  sx={{ minHeight: 44, fontWeight: 600 }}
                >
                  {primaryCta.label}
                </Button>
              )

              if (isPrimaryDisabled && primaryCta.disabledReason) {
                return (
                  <>
                    <Tooltip title={primaryCta.disabledReason} placement='top'>
                      <Box component='span' sx={{ display: 'inline-flex' }}>
                        {button}
                      </Box>
                    </Tooltip>
                    <Box component='span' id={reasonId} sx={visuallyHidden}>
                      {primaryCta.disabledReason}
                    </Box>
                  </>
                )
              }

              return button
            })()}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}

export default EntitySummaryDock
export type { MarginClassification, SaveStateKind }
