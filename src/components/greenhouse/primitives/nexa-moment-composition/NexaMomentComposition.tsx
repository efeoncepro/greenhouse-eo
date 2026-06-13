'use client'

import { useEffect, useRef } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import { alpha, useTheme, type Theme } from '@mui/material/styles'

import { resolveNexaMomentCompositionConfig } from './nexa-moment-composition-controller'
import type { NexaMomentCompositionProps } from './nexa-moment-composition-types'

/**
 * NexaMomentComposition — ver `nexa-moment-composition-types.ts` para el contrato. Layout primitive que
 * compone un Momento Nexa con una superficie operativa (host) sin reemplazarla. Reusa el `moment` y el
 * `composer` por slot (no conoce el dominio). Diferenciadores propios: anclaje cita↔host + next-step
 * gobernado + puente a la lente. a11y + reduced-motion horneados; cero hardcode (tokens AXIS).
 */

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

// Anclaje: el ítem del host citado se resalta con un anillo suave (un solo acento, AXIS primary) — la
// evidencia ES el contenido operativo. El borde hairline carga la separación bajo forced-colors.
const hostAnchorSx = (theme: Theme) => ({
  '& [data-nexa-anchor]': {
    transition: prefersReducedMotion()
      ? 'none'
      : theme.transitions.create(['box-shadow', 'background-color'], { duration: theme.transitions.duration.short }),
    borderRadius: `${theme.shape.customBorderRadius.sm}px`
  },
  '& [data-nexa-anchor-active="true"]': {
    boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
    backgroundColor: alpha(theme.palette.primary.main, 0.04)
  }
})

const momentRegionSx = (theme: Theme) => ({
  border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
  borderRadius: `${theme.shape.customBorderRadius.md}px`,
  backgroundColor: alpha(theme.palette.primary.main, 0.018),
  outline: 'none',
  minInlineSize: 0
})

const COMPOSER_VT = { viewTransitionName: 'nexa-moment-composer' }
const HOST_VT = { viewTransitionName: 'nexa-moment-host' }

const NexaMomentComposition = ({
  variant,
  kind,
  state,
  host,
  moment,
  composer,
  nextStep,
  bridge,
  activeAnchorId,
  momentLabel = 'Momento Nexa',
  className
}: NexaMomentCompositionProps) => {
  const theme = useTheme()
  const config = resolveNexaMomentCompositionConfig({ variant, kind })
  const hostRef = useRef<HTMLDivElement | null>(null)

  const showMoment = state !== 'dormant' && Boolean(moment)
  const split = config.layout === 'split' && showMoment

  // Anclaje cita↔host: resalta el ítem del host marcado con `data-nexa-anchor` y lo trae a la vista.
  // Cliente-only (useEffect); degrada honesto si el navegador no soporta CSS.escape o el ítem no existe.
  useEffect(() => {
    const root = hostRef.current

    if (!root) return

    root.querySelectorAll('[data-nexa-anchor-active="true"]').forEach(el => el.removeAttribute('data-nexa-anchor-active'))

    if (!activeAnchorId) return

    const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(activeAnchorId) : activeAnchorId
    const target = root.querySelector(`[data-nexa-anchor="${escaped}"]`)

    if (!target) return

    target.setAttribute('data-nexa-anchor-active', 'true')
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' })
  }, [activeAnchorId])

  const momentRegion = showMoment ? (
    <Box
      component='section'
      role='region'
      aria-label={momentLabel}
      tabIndex={-1}
      data-capture='nexa-moment-region'
      sx={{ ...momentRegionSx(theme), p: { xs: 4, md: 5 }, display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      <Box sx={{ minInlineSize: 0 }}>{moment}</Box>
      {/* Next-step gobernado (action boundary) — el diferenciador propio: Nexa propone una acción operativa. */}
      {nextStep ? <Box data-capture='nexa-moment-next-step'>{nextStep}</Box> : null}
      {/* Puente a la lente dedicada (AI Mode) — transfiere el contexto, no reinicia. */}
      {bridge ? <Box data-capture='nexa-moment-bridge'>{bridge}</Box> : null}
    </Box>
  ) : null

  const hostBox = (
    <Box
      ref={hostRef}
      data-capture='nexa-moment-host'
      style={HOST_VT}
      sx={{
        ...hostAnchorSx(theme),
        minInlineSize: 0,
        // El host condensa (no desaparece) cuando el Momento lidera arriba — sigue vivo y accionable.
        opacity: 1,
        transition: prefersReducedMotion() ? 'none' : theme.transitions.create(['opacity'], { duration: theme.transitions.duration.shorter })
      }}
    >
      {host}
    </Box>
  )

  return (
    <Box className={className} data-capture='nexa-moment-composition' data-state={state} data-variant={config.variant} sx={{ minInlineSize: 0 }}>
      <Stack spacing={5} sx={{ minInlineSize: 0 }}>
        {/* El composer queda arriba (refinar / nueva pregunta) — patrón AI Overviews. Persiste en el morph. */}
        <Box data-capture='nexa-moment-composer' style={COMPOSER_VT} sx={{ minInlineSize: 0 }}>
          {composer}
        </Box>

        {split ? (
          <Box
            sx={{
              display: 'grid',
              gap: 5,
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' },
              alignItems: 'start',
              '& > *': { minInlineSize: 0 }
            }}
          >
            {momentRegion}
            {hostBox}
          </Box>
        ) : (
          <Stack spacing={5} sx={{ minInlineSize: 0 }}>
            {momentRegion}
            {hostBox}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}

export default NexaMomentComposition
