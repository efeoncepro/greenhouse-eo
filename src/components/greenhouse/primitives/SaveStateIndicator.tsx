'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import useReducedMotion from '@/hooks/useReducedMotion'
import { formatDate as formatGreenhouseDate } from '@/lib/format'

export type SaveStateKind = 'clean' | 'dirty' | 'saving' | 'saved'

export interface SaveStateIndicatorProps {
  state: SaveStateKind
  changeCount?: number
  lastSavedAt?: Date | null
}

const formatRelativeTime = (date: Date): string => {
  const now = Date.now()
  const delta = Math.max(0, now - date.getTime())
  const seconds = Math.floor(delta / 1000)

  if (seconds < 5) return 'ahora'
  if (seconds < 60) return `hace ${seconds}s`
  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `hace ${hours}h`

  return formatGreenhouseDate(date, {
  day: '2-digit',
  month: 'short'
}, 'es-CL')
}

const PRIMARY_LABEL: Record<SaveStateKind, string> = {
  clean: 'Sin cambios',
  dirty: 'Sin guardar',
  saving: 'Guardando…',
  saved: 'Guardado'
}

/**
 * SaveStateIndicator — primitive de feedback del save lifecycle para docks
 * enterprise-style (Stripe, Linear, Ramp).
 *
 * Render: dot semantic + label principal (body2) + caption opcional con contexto
 * (número de cambios sin guardar, o timestamp relativo del último save). En
 * saving el dot pulsa; con prefers-reduced-motion la animación cae a opacidad
 * fija. Color-only-state evitado: cada estado pairs color + label textual.
 *
 * Consumers: QuoteSummaryDock v2 (TASK-505). Reusable por invoice/PO/contract
 * builders conforme entren.
 */
const SaveStateIndicator = ({ state, changeCount, lastSavedAt }: SaveStateIndicatorProps) => {
  const prefersReduced = useReducedMotion()

  const secondary =
    state === 'dirty' && changeCount && changeCount > 0
      ? `${changeCount} cambio${changeCount === 1 ? '' : 's'}`
      : state === 'saved' && lastSavedAt
        ? formatRelativeTime(lastSavedAt)
        : null

  return (
    <Stack
      direction='row'
      spacing={1}
      alignItems='flex-start'
      aria-live='polite'
      aria-label={secondary ? `${PRIMARY_LABEL[state]}, ${secondary}` : PRIMARY_LABEL[state]}
    >
      <Box
        component='span'
        aria-hidden='true'
        sx={theme => ({
          mt: 0.75,
          width: 8,
          height: 8,
          borderRadius: '50%',
          flexShrink: 0,
          backgroundColor:
            state === 'saving'
              ? theme.palette.info.main
              : state === 'dirty'
                ? theme.palette.warning.main
                : state === 'saved'
                  ? theme.palette.success.main
                  : theme.palette.action.disabled,
          animation:
            state === 'saving' && !prefersReduced
              ? 'save-dot-pulse 1200ms ease-in-out infinite'
              : 'none',
          '@keyframes save-dot-pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.35 }
          }
        })}
      />
      <Stack spacing={0.125}>
        <Typography variant='body2' sx={{ fontWeight: 500, lineHeight: 1.2 }}>
          {PRIMARY_LABEL[state]}
        </Typography>
        {secondary ? (
          <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.2 }}>
            {secondary}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  )
}

export default SaveStateIndicator
