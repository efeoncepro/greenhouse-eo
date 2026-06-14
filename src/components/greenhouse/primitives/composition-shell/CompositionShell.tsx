'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import Stack from '@mui/material/Stack'
import { useTheme, type Theme } from '@mui/material/styles'

import { motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

import {
  COMPOSITION_SHELL_REGION_META,
  compositionShellActionToTelemetryName,
  createCompositionShellEvent,
  regionViewTransitionName,
  resolveComposition,
  resolveCompositionConfig,
  resolveCompositionLayout,
  resolveSizeClass
} from './composition-shell-controller'
import {
  compositionInterruptibleLayoutTransition,
  compositionRegionReveal
} from './composition-shell-motion'
import { registerCompositionViewTransitionName } from './composition-shell-vt-guard'
import type { CompositionShellProps, CompositionShellRegion, CompositionShellSizeClass } from './composition-shell-types'

/**
 * CompositionShell — ver `composition-shell-types.ts` para el contrato. Layout primitive de shell que
 * compone regiones nombradas (singleton view-transition-name) según una composición declarada por el
 * consumer, con morph in-place (el host dispara `startViewTransition`), reflow adaptativo por size class
 * (ResizeObserver) y regiones como query containers (`container-type: inline-size`) para que su contenido
 * (Adaptive Card / TASK-1115) se adapte. a11y + reduced-motion horneados; cero hardcode (tokens). Reuse-not-fork.
 *
 * Hardening + fluidez (TASK-1119 + TASK-1117, aditivo + opt-in, default byte-idéntico a V1):
 *  - Guard dev-time del singleton view-transition-name (colisión → "morph silencioso").
 *  - Telemetry opt-in de cambios de composición (`onTelemetry`).
 *  - `fluidity='rich'` → entrada orquestada con stagger (motion tokens) + morph interrumpible opcional
 *    (framer-motion `layout`, coexiste con VT, nunca sobre el mismo morph).
 *  - `split` en compact → `aside` como drawer temporal real (semántica modal, focus trap MUI).
 */

// Cada región es query container + conserva su view-transition-name estable (morph FLIP gratis).
// En modo `baseline` el sx gobierna opacity/transition (V1). En modo `rich` framer-motion es dueño del
// opacity (entrada + condense) → el sx NO setea opacity para no pelear con el animate.
// `reduced` viene del hook `useReducedMotion` (SSR-safe: false en SSR + primer paint, se actualiza
// post-mount sin causar hydration mismatch) — NO leemos matchMedia en render (eso es un branch
// server/client que rompe la hidratación).
const regionSx = (
  theme: Theme,
  region: CompositionShellRegion,
  condense: boolean,
  rich: boolean,
  reduced: boolean
) => {
  const meta = COMPOSITION_SHELL_REGION_META[region]

  const base = {
    minInlineSize: meta.minInlineSize > 0 ? `${meta.minInlineSize}px` : 0,
    containerType: 'inline-size' as const,
    outline: 'none'
  }

  if (rich) return base

  return {
    ...base,
    // El morph estructural lo interpola el browser via view-transition-name. La transición de opacidad
    // cubre la condensación de `primary` cuando otra región lidera (degrada honesto sin reduced-motion).
    transition: reduced
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
  // Default `rich` (decisión del operador 2026-06-14): la coreografía rica (stagger de entrada) es el
  // estándar — más moderna y atractiva. Reduced-motion horneado + el primer paint no se retrasa (el stagger
  // solo anima al cambiar de composición / montar contenido nuevo). `baseline` queda como opt-out explícito.
  // El morph interrumpible (framer-motion `layout`) sigue siendo opt-in vía `morphStrategy='interruptible'`.
  fluidity = 'rich',
  morphStrategy = 'viewTransition',
  onTelemetry,
  telemetrySource,
  className
}: CompositionShellProps) => {
  const theme = useTheme()
  const reduced = useReducedMotion()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const leadingRegionRef = useRef<HTMLElement | null>(null)
  const prevCompositionRef = useRef<string | null>(null)
  // VT names por-instancia: dos shells en la misma página no colisionan (constraint VT singleton).
  const vtId = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  const resolvedComposition = resolveComposition({ composition, kind })
  const config = resolveCompositionConfig({ composition, kind })

  const rich = fluidity === 'rich'
  const interruptible = rich && morphStrategy === 'interruptible'

  // Size class: override explícito (SSR/tests) o medido del propio contenedor (ResizeObserver, client-only).
  const [measuredSizeClass, setMeasuredSizeClass] = useState<CompositionShellSizeClass>('expanded')
  const sizeClass = sizeClassOverride ?? measuredSizeClass

  // `split` en compact → `aside` se vuelve drawer temporal (disclosure local, el resto apila).
  const [asideDrawerOpen, setAsideDrawerOpen] = useState(false)

  // Gate de hidratación para el reveal de framer-motion: el SSR + primer paint montan en estado FINAL
  // (`initial=false`) → el HTML del server matchea el cliente (sin hydration mismatch). El stagger de
  // entrada anima recién cuando una región NUEVA monta por un cambio de composición (post-mount, client).
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => setHasMounted(true), [])

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

  const { layout, asideAsDrawer } = resolveCompositionLayout(resolvedComposition, sizeClass)

  // Cuando el aside deja de ser drawer (volvemos a expanded/medium) cerramos el drawer para no dejar
  // un overlay abierto huérfano tras el reflow.
  useEffect(() => {
    if (!asideAsDrawer && asideDrawerOpen) setAsideDrawerOpen(false)
  }, [asideAsDrawer, asideDrawerOpen])

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

  // Telemetry opt-in: emite `composition.compose` al cambiar de composición y `composition.settle` al
  // asentarse. Sin sink (`onTelemetry`) → cero costo. Reusa el mapper canónico (no emite en no-ops).
  const prevTelemetryCompositionRef = useRef<string | null>(null)

  useEffect(() => {
    if (!onTelemetry) return

    const prev = prevTelemetryCompositionRef.current

    if (prev !== null && prev !== resolvedComposition) {
      const name = compositionShellActionToTelemetryName('composing')

      if (name) {
        onTelemetry(
          createCompositionShellEvent({
            name,
            composition: resolvedComposition,
            previousComposition: prev as CompositionShellProps['composition'],
            sizeClass,
            source: telemetrySource
          })
        )
      }
    }

    prevTelemetryCompositionRef.current = resolvedComposition
    // sizeClass intencional fuera de deps: el evento de compose se dispara por cambio de composición.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedComposition, onTelemetry, telemetrySource])

  useEffect(() => {
    if (!onTelemetry || state !== 'composed') return

    const name = compositionShellActionToTelemetryName('composed')

    if (name) {
      onTelemetry(
        createCompositionShellEvent({ name, composition: resolvedComposition, sizeClass, source: telemetrySource })
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, onTelemetry, telemetrySource])

  const renderRegion = (region: CompositionShellRegion, staggerIndex: number) => {
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

    // `key` se pasa DIRECTO a JSX (nunca vía spread — React lo prohíbe).
    const shared = {
      ...a11yProps,
      ref: isLeading ? (leadingRegionRef as React.Ref<HTMLDivElement>) : undefined,
      tabIndex: isLeading ? -1 : undefined,
      'data-capture': `composition-shell-region-${region}`,
      'data-composition-region': region,
      style: { viewTransitionName: regionViewTransitionName(region, vtId) }
    }

    if (rich) {
      // Secuencia DUEÑA del shell, SSR-safe: el shell asigna el `staggerIndex` central (orden de DOM: dock →
      // contenido → overlay) y la región revela explícito con ese delay. Reveal explícito (no variant
      // inheritance) → framer SSR-renderiza el estado final en server + cliente sin hydration mismatch.
      // Antes de montar (SSR + primer paint) entra en estado final (`initial=false`) → matchea el HTML del server.
      const motionProps = compositionRegionReveal(staggerIndex, condense, reduced)

      return (
        <Box
          key={region}
          {...shared}
          component={motion.div}
          layout={interruptible ? true : undefined}
          initial={hasMounted ? motionProps.initial : false}
          animate={motionProps.animate}
          transition={interruptible ? compositionInterruptibleLayoutTransition(reduced) : motionProps.transition}
          sx={regionSx(theme, region, condense, true, reduced)}
        >
          {content}
        </Box>
      )
    }

    return (
      <Box key={region} {...shared} sx={regionSx(theme, region, condense, false, reduced)}>
        {content}
      </Box>
    )
  }

  // Regiones de contenido in-flow. Si el aside es drawer en compact, se separa del flujo (va al Drawer).
  const inFlowContentRegions = config.contentRegions.filter(r => regions[r] && !(r === 'aside' && asideAsDrawer))

  // Secuencia DUEÑA del shell (SSR-safe): el shell asigna el índice de stagger central en orden de DOM
  // (dock → contenido → overlay) y cada región revela explícito con ese delay. NO usamos `staggerChildren` de
  // framer (requiere variant inheritance, que NO SSR-renderiza los estilos de los hijos → hydration mismatch +
  // viola never-hidden). El reveal explícito SSR-renderiza el estado final en server + cliente, sin mismatch.
  let staggerCursor = 0
  const nextIndex = () => staggerCursor++

  const dockNode = regions.dock ? renderRegion('dock', nextIndex()) : null

  const body =
    layout === 'split' ? (
      <Box
        sx={{
          display: 'grid',
          gap: 5,
          // En xs (teléfono) `split` apila: el piso de 360px del aside no cabe en un viewport de ~390 y
          // empujaría el scrollWidth de página (clase ISSUE-015). Desde sm el aside vuelve a su columna.
          // Esto es CSS-level, complementario al colapso a drawer del size-class compact (asideAsDrawer).
          gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) clamp(320px, 32%, 480px)' },
          alignItems: 'start',
          '& > *': { minInlineSize: 0 }
        }}
      >
        {inFlowContentRegions.map(r => renderRegion(r, nextIndex()))}
      </Box>
    ) : (
      <Stack spacing={5} sx={{ minInlineSize: 0 }}>
        {inFlowContentRegions.map(r => renderRegion(r, nextIndex()))}
      </Stack>
    )

  const overlayNode = regions.overlay ? renderRegion('overlay', nextIndex()) : null

  // Dev-time guard: registra los view-transition-name de las regiones in-flow renderizadas (las que llevan
  // VT name). Si dos elementos comparten un nombre → warn (morph silencioso). Cleanup al desmontar/cambiar.
  const inFlowRegionKey = [regions.dock ? 'dock' : '', ...inFlowContentRegions, regions.overlay ? 'overlay' : '']
    .filter(Boolean)
    .join('|')

  useEffect(() => {
    const names = inFlowRegionKey
      .split('|')
      .filter(Boolean)
      .map(r => regionViewTransitionName(r as CompositionShellRegion, vtId))

    const cleanups = names.map(registerCompositionViewTransitionName)

    return () => cleanups.forEach(fn => fn())
  }, [inFlowRegionKey, vtId])

  // El aside como drawer temporal (compact + split). MUI Drawer temporary aporta focus trap + aria-modal +
  // Esc nativos. El trigger es disclosure local (mecanismo, no dominio); usa el label accesible del aside.
  const asideDrawer: ReactNode =
    asideAsDrawer && regions.aside ? (
      <>
        <Button
          variant='tonal'
          onClick={() => setAsideDrawerOpen(true)}
          aria-haspopup='dialog'
          aria-expanded={asideDrawerOpen}
          startIcon={<i className='tabler-layout-sidebar-right' />}
          data-capture='composition-shell-aside-drawer-trigger'
          sx={{ alignSelf: 'flex-start' }}
        >
          {asideLabel}
        </Button>
        <Drawer
          anchor='right'
          open={asideDrawerOpen}
          onClose={() => setAsideDrawerOpen(false)}
          ModalProps={{ keepMounted: false }}
          slotProps={{
            paper: {
              component: 'aside',
              role: 'complementary',
              'aria-label': asideLabel,
              sx: { width: 'min(420px, 88vw)', p: 5 }
            }
          }}
          data-capture='composition-shell-aside-drawer'
        >
          {regions.aside}
        </Drawer>
      </>
    ) : null

  return (
    <Box
      ref={rootRef}
      className={className}
      data-capture='composition-shell'
      data-composition={resolvedComposition}
      data-size-class={sizeClass}
      data-state={state}
      data-fluidity={fluidity}
      data-morph-strategy={rich ? morphStrategy : undefined}
      sx={{ minInlineSize: 0 }}
    >
      <Stack spacing={5} sx={{ minInlineSize: 0 }}>
        {/* dock (composer / action dock) — aditivo a cualquier composición; lidera arriba (patrón AI Overviews). */}
        {dockNode}
        {asideDrawer}
        {body}
        {/* overlay — fallback excepcional; el consumer decide su tratamiento (drawer/modal) en su contenido. */}
        {overlayNode}
      </Stack>
    </Box>
  )
}

export default CompositionShell
