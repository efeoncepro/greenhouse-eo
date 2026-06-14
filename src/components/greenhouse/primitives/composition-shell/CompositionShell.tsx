'use client'

import { useEffect, useId, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import { useTheme, type Theme } from '@mui/material/styles'

import {
  COMPOSITION_SHELL_REGION_META,
  regionViewTransitionName,
  resolveComposition,
  resolveCompositionConfig,
  resolveCompositionLayout,
  resolveSizeClass
} from './composition-shell-controller'
import type { CompositionShellProps, CompositionShellRegion, CompositionShellSizeClass } from './composition-shell-types'

/**
 * CompositionShell — ver `composition-shell-types.ts` para el contrato. Layout primitive de shell que
 * compone regiones nombradas (singleton view-transition-name) según una composición declarada por el
 * consumer, con morph in-place (el host dispara `startViewTransition`), reflow adaptativo por size class
 * (ResizeObserver) y regiones como query containers (`container-type: inline-size`) para que su contenido
 * (Adaptive Card / TASK-1115) se adapte. a11y + reduced-motion horneados; cero hardcode (tokens). Reuse-not-fork.
 */

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

// Cada región es query container + conserva su view-transition-name estable (morph FLIP gratis).
const regionSx = (theme: Theme, region: CompositionShellRegion, condense: boolean) => {
  const meta = COMPOSITION_SHELL_REGION_META[region]

  return {
    minInlineSize: meta.minInlineSize > 0 ? `${meta.minInlineSize}px` : 0,
    containerType: 'inline-size' as const,
    // El morph estructural lo interpola el browser via view-transition-name. La transición de opacidad
    // cubre la condensación de `primary` cuando otra región lidera (degrada honesto sin reduced-motion).
    transition: prefersReducedMotion()
      ? 'none'
      : theme.transitions.create(['opacity'], { duration: theme.transitions.duration.shorter }),
    opacity: condense ? 0.92 : 1
  }
}

const CompositionShell = ({
  composition,
  kind,
  state = 'composed',
  regions,
  sizeClass: sizeClassOverride,
  leadLabel = 'Respuesta',
  asideLabel = 'Panel contextual',
  className
}: CompositionShellProps) => {
  const theme = useTheme()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const leadingRegionRef = useRef<HTMLElement | null>(null)
  const prevCompositionRef = useRef<string | null>(null)
  // VT names por-instancia: dos shells en la misma página no colisionan (constraint VT singleton).
  const vtId = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  const resolvedComposition = resolveComposition({ composition, kind })
  const config = resolveCompositionConfig({ composition, kind })

  // Size class: override explícito (SSR/tests) o medido del propio contenedor (ResizeObserver, client-only).
  const [measuredSizeClass, setMeasuredSizeClass] = useState<CompositionShellSizeClass>('expanded')
  const sizeClass = sizeClassOverride ?? measuredSizeClass

  useEffect(() => {
    if (sizeClassOverride || typeof ResizeObserver === 'undefined') return

    const node = rootRef.current

    if (!node) return

    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width

      setMeasuredSizeClass(resolveSizeClass(width))
    })

    observer.observe(node)

    return () => observer.disconnect()
  }, [sizeClassOverride])

  const { layout } = resolveCompositionLayout(resolvedComposition, sizeClass)

  // La región que lidera la composición (lead si la monta, sino primary) — destino del focus tras el morph.
  const leadingRegion: CompositionShellRegion = config.contentRegions.includes('lead') ? 'lead' : 'primary'

  // Focus routing (a11y): tras un cambio de composición (no en el mount inicial ni en cada re-render),
  // el foco va al heading de la región que lidera. Degrada honesto si el nodo no existe.
  useEffect(() => {
    const prev = prevCompositionRef.current

    if (prev !== null && prev !== resolvedComposition && state !== 'composing') {
      leadingRegionRef.current?.focus({ preventScroll: false })
    }

    prevCompositionRef.current = resolvedComposition
  }, [resolvedComposition, state])

  const renderRegion = (region: CompositionShellRegion) => {
    const content = regions[region]

    if (!content) return null

    const isLeading = region === leadingRegion
    const condense = region === 'primary' && config.condensesPrimary

    // a11y: lead = region etiquetada; aside = complementary; primary/dock = flujo plano.
    const a11yProps =
      region === 'lead'
        ? { component: 'section' as const, role: 'region', 'aria-label': leadLabel }
        : region === 'aside'
          ? { component: 'aside' as const, role: 'complementary', 'aria-label': asideLabel }
          : {}

    return (
      <Box
        key={region}
        {...a11yProps}
        ref={isLeading ? (leadingRegionRef as React.Ref<HTMLDivElement>) : undefined}
        tabIndex={isLeading ? -1 : undefined}
        data-capture={`composition-shell-region-${region}`}
        data-composition-region={region}
        style={{ viewTransitionName: regionViewTransitionName(region, vtId) }}
        sx={{ ...regionSx(theme, region, condense), outline: 'none' }}
      >
        {content}
      </Box>
    )
  }

  const contentRegions = config.contentRegions.filter(r => regions[r])

  const body =
    layout === 'split' ? (
      <Box
        sx={{
          display: 'grid',
          gap: 5,
          gridTemplateColumns: 'minmax(0, 1fr) clamp(360px, 32%, 480px)',
          alignItems: 'start',
          '& > *': { minInlineSize: 0 }
        }}
      >
        {contentRegions.map(renderRegion)}
      </Box>
    ) : (
      <Stack spacing={5} sx={{ minInlineSize: 0 }}>
        {contentRegions.map(renderRegion)}
      </Stack>
    )

  return (
    <Box
      ref={rootRef}
      className={className}
      data-capture='composition-shell'
      data-composition={resolvedComposition}
      data-size-class={sizeClass}
      data-state={state}
      sx={{ minInlineSize: 0 }}
    >
      <Stack spacing={5} sx={{ minInlineSize: 0 }}>
        {/* dock (composer / action dock) — aditivo a cualquier composición; lidera arriba (patrón AI Overviews). */}
        {regions.dock ? renderRegion('dock') : null}
        {body}
        {/* overlay — fallback excepcional; el consumer decide su tratamiento (drawer/modal) en su contenido. */}
        {regions.overlay ? renderRegion('overlay') : null}
      </Stack>
    </Box>
  )
}

export default CompositionShell
