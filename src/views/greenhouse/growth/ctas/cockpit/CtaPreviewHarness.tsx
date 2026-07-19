'use client'

/**
 * TASK-1430 — harness de preview del cockpit: monta el CORE del renderer
 * canónico (paridad CSS por construcción vía `.ghc-scope`) dentro de marcos que
 * simulan el host público. El harness controla el CONTEXTO (host, esquema,
 * ancho del contenedor, contenido, asset) — jamás recrea el card en MUI ni
 * decide density: esa la deriva el renderer con sus container queries.
 *
 * Autoridad visual: diseño Claude Design "Cockpit de CTAs" (instrucción del
 * operador 2026-07-18) traducido a tokens del theme.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'

import { GH_GROWTH_CTA_OPERATOR } from '@/lib/copy/growth'
import type { CtaRenderContractMirror } from '@/growth-cta-renderer/contract'
import { CTA_FIXTURES } from '@/growth-cta-renderer/fixtures'

import {
  buildPreviewContract,
  type CtaAuthoringDraft,
  type PreviewContentMode,
} from './cta-cockpit-meta'

const O = GH_GROWTH_CTA_OPERATOR
const P = O.cockpit.author.preview

/**
 * Umbrales de density del renderer (presentación del badge; la VERDAD es la
 * container query del propio shell en `src/growth-cta-renderer/styles.ts`:
 * full ≥560 · condensed 400–559 · peek <400).
 */
const DENSITY_FULL_MIN = 560
const DENSITY_CONDENSED_MIN = 400

export const densityForWidth = (width: number): 'full' | 'condensed' | 'peek' =>
  width >= DENSITY_FULL_MIN ? 'full' : width >= DENSITY_CONDENSED_MIN ? 'condensed' : 'peek'

export type PreviewHost = 'think' | 'wordpress'
export type PreviewScheme = 'light' | 'dark'

/**
 * Marco del HOST EXTERNO simulado, mapeado a tokens del theme: el bookend navy
 * de Think usa la familia navy de marca (`customColors.midnight/deepAzure`) y
 * WordPress la superficie neutra. El card del CTA usa sus propios tokens
 * `--gh-cta-*` del renderer — este marco es chrome diagnóstico del cockpit.
 */
const hostFrame = (theme: Theme, host: PreviewHost) =>
  host === 'think'
    ? {
        bg: theme.palette.customColors.midnight,
        line: alpha(theme.palette.common.white, 0.14),
        border: theme.palette.customColors.deepAzure,
        ink: alpha(theme.palette.common.white, 0.78),
      }
    : {
        bg: theme.palette.grey[200],
        line: alpha(theme.palette.common.black, 0.09),
        border: theme.palette.divider,
        ink: theme.palette.text.secondary,
      }

/** Monta el core del renderer sobre un div `.ghc-scope` (mismo patrón TASK-1340/1429/1431). */
const mountContract = async (root: HTMLDivElement, contract: CtaRenderContractMirror): Promise<() => void> => {
  const [{ CtaRenderer }, { ensureStylesInjected }, { resolveCtaSystemCopy }] = await Promise.all([
    import('@/growth-cta-renderer/renderer'),
    import('@/growth-cta-renderer/styles'),
    import('@/growth-cta-renderer/copy'),
  ])

  ensureStylesInjected(document)

  root.classList.add('ghc-scope')
  root.dataset.ghcVariant = contract.styleVariant ?? 'default'
  root.dataset.ghcPlacement = contract.placement
  root.style.containerType = 'inline-size'

  const renderer = new CtaRenderer({
    root,
    contract,
    copy: resolveCtaSystemCopy(),
    telemetry: { emit: () => undefined },
    onPrimary: async () => true,
    onIngest: () => undefined,
    inertNavigation: true,
  })

  renderer.render()

  return () => renderer.destroy()
}

interface PreviewFrameProps {
  contract: CtaRenderContractMirror
  host: PreviewHost
  scheme: PreviewScheme
  /** Ancho del CONTENEDOR del CTA en px (density derivada). Sin valor = fluido. */
  widthPx?: number
  heightPx: number
  mini?: boolean
  degraded?: boolean
  suppressedEvidence?: boolean
  onMountError?: () => void
  dataCapture?: string
}

/** Marco de host: fondo externo simulado + líneas de contenido + el renderer real. */
export const PreviewFrame = ({
  contract,
  host,
  scheme,
  widthPx,
  heightPx,
  mini = false,
  degraded = false,
  suppressedEvidence = false,
  onMountError,
  dataCapture,
}: PreviewFrameProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const theme = useTheme()
  const frame = hostFrame(theme, host)
  const [failClosed, setFailClosed] = useState(false)
  const showRenderer = !degraded && !suppressedEvidence

  useEffect(() => {
    if (!showRenderer) return undefined

    let disposed = false
    let cleanup: (() => void) | null = null

    setFailClosed(false)

    void (async () => {
      if (!hostRef.current) return

      try {
        const dispose = await mountContract(hostRef.current, contract)

        // Fail-closed honesto: si el renderer dejó el root en `empty` (acción no
        // resoluble / contrato inválido), el visitante no vería NADA — el cockpit
        // lo dice en vez de mostrar un marco vacío indistinguible de un bug.
        if (hostRef.current?.dataset.ghcState === 'empty') setFailClosed(true)

        if (disposed) dispose()
        else cleanup = dispose
      } catch {
        onMountError?.()
      }
    })()

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [contract, showRenderer, onMountError])

  const lines = Array.from({ length: mini ? 3 : 6 })

  return (
    <Box
      data-capture={dataCapture}
      sx={theme => ({
        position: 'relative',
        borderRadius: `${theme.shape.customBorderRadius.xl}px`,
        overflow: 'hidden',
        minHeight: heightPx,
        background: frame.bg,
        border: `1px solid ${frame.border}`,
        p: mini ? 4 : 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Stack spacing={2.5} sx={{ position: 'absolute', inset: 0, p: mini ? 4 : 6 }} aria-hidden>
        {lines.map((_, index) => (
          <Box
            key={index}
            sx={theme => ({
              height: index === 0 ? 12 : 8,
              width: index === 0 ? '52%' : `${60 + ((index * 7) % 34)}%`,
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              background: frame.line,
            })}
          />
        ))}
      </Stack>

      {degraded ? (
        <Stack spacing={2} alignItems='center' sx={{ position: 'relative', textAlign: 'center', maxWidth: 320, color: frame.ink }}>
          <i className='tabler-plug-connected-x' style={{ fontSize: 22 }} aria-hidden />
          <Typography variant='subtitle2' sx={{ color: 'inherit' }}>
            {P.degradedTitle}
          </Typography>
          <Typography variant='caption' sx={{ color: 'inherit', opacity: 0.85 }}>
            {P.degradedBody}
          </Typography>
        </Stack>
      ) : suppressedEvidence ? (
        <Stack spacing={2} alignItems='center' sx={{ position: 'relative', textAlign: 'center', maxWidth: 280, color: frame.ink }}>
          <i className='tabler-eye-off' style={{ fontSize: 22 }} aria-hidden />
          <Typography variant='subtitle2' sx={{ color: 'inherit' }}>
            {P.suppressedEvidenceTitle}
          </Typography>
          <Typography variant='caption' sx={{ color: 'inherit', opacity: 0.85 }}>
            {P.suppressedEvidenceBody}
          </Typography>
        </Stack>
      ) : failClosed ? (
        <Stack
          spacing={2}
          alignItems='center'
          sx={{ position: 'relative', textAlign: 'center', maxWidth: 320, color: frame.ink }}
          data-capture='cta-preview-fail-closed'
        >
          <i className='tabler-shield-x' style={{ fontSize: 22 }} aria-hidden />
          <Typography variant='subtitle2' sx={{ color: 'inherit' }}>
            {P.failClosedTitle}
          </Typography>
          <Typography variant='caption' sx={{ color: 'inherit', opacity: 0.85 }}>
            {P.failClosedBody}
          </Typography>
        </Stack>
      ) : (
        <Box
          ref={hostRef}
          sx={{
            position: 'relative',
            width: widthPx ? `${widthPx}px` : '100%',
            maxWidth: '100%',
            colorScheme: scheme,
            transition: theme => theme.transitions.create('width', { duration: theme.transitions.duration.short }),
          }}
        />
      )}
    </Box>
  )
}

/**
 * Escala visual de un frame renderizado a un ancho REAL de contenedor: el CTA
 * se monta al `targetWidth` declarado (la container query deriva la density
 * verdadera) y el conjunto se escala para caber en la celda. La escala es
 * presentación; los px CSS internos — y por lo tanto la density — no cambian.
 */
const ScaledFrame = ({ targetWidth, height, children }: { targetWidth: number; height: number; children: ReactNode }) => {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const node = wrapRef.current

    if (!node) return undefined

    const observer = new ResizeObserver(entries => {
      const cellWidth = entries[0]?.contentRect.width ?? targetWidth

      setScale(Math.min(1, cellWidth / targetWidth))
    })

    observer.observe(node)

    return () => observer.disconnect()
  }, [targetWidth])

  return (
    <Box ref={wrapRef} sx={theme => ({ overflow: 'hidden', height: height * scale, borderRadius: `${theme.shape.customBorderRadius.xl}px` })}>
      <Box sx={{ width: targetWidth, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</Box>
    </Box>
  )
}

// ─── Segmented control (pill group del mock, tokens del theme) ────────────────

interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: string
}

interface SegmentedControlProps<T extends string> {
  label: string
  value: T
  options: Array<SegmentOption<T>>
  onChange: (value: T) => void
}

export const SegmentedControl = <T extends string>({ label, value, options, onChange }: SegmentedControlProps<T>) => (
  <Stack spacing={1.5}>
    <Typography variant='caption' sx={{ fontWeight: 600, color: 'text.primary' }}>
      {label}
    </Typography>
    <Box
      role='group'
      aria-label={label}
      sx={{
        display: 'inline-flex',
        flexWrap: 'wrap',
        gap: 1,
        p: 1,
        borderRadius: theme => `${theme.shape.customBorderRadius.lg}px`,
        bgcolor: 'action.hover',
        border: theme => `1px solid ${theme.palette.divider}`,
        alignSelf: 'flex-start',
      }}
    >
      {options.map(option => {
        const active = option.value === value

        return (
          <Button
            key={option.value}
            size='small'
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            startIcon={option.icon ? <i className={option.icon} style={{ fontSize: 16 }} /> : undefined}
            sx={{
              px: 3,
              py: 1,
              minWidth: 0,
              borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
              textTransform: 'none',
              fontWeight: 600,
              color: active ? 'primary.main' : 'text.secondary',
              bgcolor: active ? 'background.paper' : 'transparent',
              boxShadow: active ? 2 : 'none',
              '&:hover': { bgcolor: active ? 'background.paper' : 'action.selected' },
            }}
          >
            {option.label}
          </Button>
        )
      })}
    </Box>
  </Stack>
)

// ─── Matriz de density del slide-in (TASK-1429; se reutiliza, no se recrea) ───

const SLIDE_IN_DENSITY_WIDTHS: Array<{ key: string; width: number; labelKey: 'densityFull' | 'densityCondensed' | 'densityPeek' }> = [
  { key: 'full', width: 680, labelKey: 'densityFull' },
  { key: 'condensed', width: 480, labelKey: 'densityCondensed' },
  { key: 'peek', width: 350, labelKey: 'densityPeek' },
]

export const SlideInDensityMatrix = ({ contract }: { contract: CtaRenderContractMirror }) => {
  const hostsRef = useRef<Array<HTMLDivElement | null>>([])
  const [demoBusy, setDemoBusy] = useState(false)

  useEffect(() => {
    let disposed = false
    const cleanups: Array<() => void> = []

    void (async () => {
      for (const host of hostsRef.current) {
        if (!host || disposed) continue

        const dispose = await mountContract(host, contract)

        if (disposed) dispose()
        else cleanups.push(dispose)
      }
    })()

    return () => {
      disposed = true
      cleanups.forEach(dispose => dispose())
    }
  }, [contract])

  const openLiveDemo = async () => {
    setDemoBusy(true)

    try {
      const [{ SlideInController }, { ensureStylesInjected }, { resolveCtaSystemCopy }] = await Promise.all([
        import('@/growth-cta-renderer/slide-in'),
        import('@/growth-cta-renderer/styles'),
        import('@/growth-cta-renderer/copy'),
      ])

      ensureStylesInjected(document)

      const controller = new SlideInController({
        doc: document,
        host: document.body,
        contract: { ...contract, cta: { ...contract.cta, ctaId: `cdef-demo-${Date.now()}` } },
        copy: resolveCtaSystemCopy(),
        telemetry: { emit: () => undefined },
        onPrimary: async () => true,
        onIngest: () => undefined,
        triggerMode: 'immediate',
        inertNavigation: true,
      })

      controller.arm()
    } finally {
      setDemoBusy(false)
    }
  }

  return (
    <Stack spacing={4}>
      {SLIDE_IN_DENSITY_WIDTHS.map((density, index) => (
        <Box key={density.key} data-capture={`cta-preview-density-${density.key}`}>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
            {O.preview[density.labelKey]}
          </Typography>
          <Box
            ref={(node: HTMLDivElement | null) => {
              hostsRef.current[index] = node
            }}
            sx={{ maxWidth: density.width }}
          />
        </Box>
      ))}
      <Box>
        <Button
          variant='outlined'
          size='small'
          disabled={demoBusy}
          onClick={() => void openLiveDemo()}
          aria-label={O.preview.slideInDemoAria}
          data-capture='cta-slidein-demo-trigger'
        >
          {O.preview.slideInDemoCta}
        </Button>
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
          {O.preview.slideInDemoHint}
        </Typography>
      </Box>
    </Stack>
  )
}

// ─── Chips diagnósticos (fuera del canvas; jamás llegan al visitante) ─────────

export const DiagnosticChips = ({ items }: { items: Array<{ k: string; v: string }> }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
    {items.map(item => (
      <Box
        key={`${item.k}-${item.v}`}
        component='span'
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 0.5,
          borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
          border: theme => `1px solid ${theme.palette.divider}`,
          bgcolor: 'action.hover',
          typography: 'caption',
          fontWeight: 600,
          color: 'text.primary',
        }}
      >
        <Box component='span' sx={{ color: 'text.primary', fontWeight: 500 }}>
          {item.k}
        </Box>
        {item.v}
      </Box>
    ))}
  </Box>
)

// ─── Harness completo (paso Vista previa del authoring) ───────────────────────

interface CtaPreviewHarnessProps {
  draft: CtaAuthoringDraft
  degraded: boolean
  onDegradedChange: (degraded: boolean) => void
  diagnostics: Array<{ k: string; v: string }>
}

const WIDTH_PRESETS = [
  { labelKey: 'presetPeek' as const, width: 360 },
  { labelKey: 'presetCondensed' as const, width: 520 },
  { labelKey: 'presetFull' as const, width: 820 },
]

const PAIRWISE_COMBOS: Array<{ host: PreviewHost; scheme: PreviewScheme; width: number; suppressed?: boolean; label: string }> = [
  { host: 'wordpress', scheme: 'light', width: 620, label: 'WP · claro · full' },
  { host: 'think', scheme: 'dark', width: 460, label: 'Think · oscuro · condensed' },
  { host: 'wordpress', scheme: 'light', width: 360, label: 'WP · claro · peek' },
  { host: 'think', scheme: 'light', width: 620, label: 'Think · claro · full' },
  { host: 'wordpress', scheme: 'dark', width: 460, label: 'WP · oscuro · condensed' },
  { host: 'think', scheme: 'dark', width: 620, suppressed: true, label: 'Think · suprimido (evidencia)' },
]

export const CtaPreviewHarness = ({ draft, degraded, onDegradedChange, diagnostics }: CtaPreviewHarnessProps) => {
  const [host, setHost] = useState<PreviewHost>('think')
  const [scheme, setScheme] = useState<PreviewScheme>('light')
  const [contentMode, setContentMode] = useState<PreviewContentMode>('nominal')
  const [assetPresent, setAssetPresent] = useState(true)
  const [width, setWidth] = useState(760)
  const [mountKey, setMountKey] = useState(0)

  // Identidad estable del contract (un objeto nuevo por render remontaría el renderer en loop).
  const contract = useMemo(() => buildPreviewContract(draft, contentMode, assetPresent), [draft, contentMode, assetPresent])
  const density = densityForWidth(width)
  const isSlideIn = draft.placement === 'slide_in'

  const handleMountError = useCallback(() => onDegradedChange(true), [onDegradedChange])

  const focusPrimary = () => {
    const primary = document.querySelector<HTMLElement>('[data-capture="cta-harness-canvas"] .ghc-primary')

    primary?.focus()
  }

  return (
    <Stack spacing={5}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 4 }}>
        <SegmentedControl
          label={P.hostLabel}
          value={host}
          onChange={setHost}
          options={[
            { value: 'think', label: P.hostThink, icon: 'tabler-square-rounded' },
            { value: 'wordpress', label: P.hostWordpress, icon: 'tabler-brand-wordpress' },
          ]}
        />
        <SegmentedControl
          label={P.themeLabel}
          value={scheme}
          onChange={setScheme}
          options={[
            { value: 'light', label: P.themeLight, icon: 'tabler-sun' },
            { value: 'dark', label: P.themeDark, icon: 'tabler-moon' },
          ]}
        />
        <SegmentedControl
          label={P.contentLabel}
          value={contentMode}
          onChange={setContentMode}
          options={[
            { value: 'nominal', label: P.contentNominal },
            { value: 'long', label: P.contentLong },
            { value: 'minimal', label: P.contentMinimal },
          ]}
        />
        <SegmentedControl
          label={P.assetLabel}
          value={assetPresent ? 'present' : 'missing'}
          onChange={value => setAssetPresent(value === 'present')}
          options={[
            { value: 'present', label: P.assetPresent },
            { value: 'missing', label: P.assetMissing },
          ]}
        />
      </Box>

      <Stack
        spacing={2}
        sx={{
          p: 4,
          borderRadius: theme => `${theme.shape.customBorderRadius.lg}px`,
          bgcolor: 'action.hover',
          border: theme => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction='row' alignItems='center' justifyContent='space-between' gap={2} flexWrap='wrap'>
          <Typography variant='caption' sx={{ fontWeight: 600 }}>
            {P.widthLabel}
          </Typography>
          <Stack direction='row' alignItems='center' gap={2}>
            <Typography variant='monoId' sx={{ fontWeight: 700 }}>
              {width} px
            </Typography>
            <Box
              component='span'
              sx={{
                px: 2,
                py: 0.5,
                borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
                typography: 'caption',
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: 'primary.dark',
                bgcolor: theme => alpha(theme.palette.primary.main, 0.12),
              }}
            >
              {P.widthDensityPrefix} {density}
            </Box>
          </Stack>
        </Stack>
        <Slider
          value={width}
          min={320}
          max={900}
          step={4}
          onChange={(_, value) => setWidth(value as number)}
          aria-label={P.widthLabel}
          size='small'
        />
        <Stack direction='row' gap={1.5}>
          {WIDTH_PRESETS.map(preset => (
            <Button
              key={preset.labelKey}
              size='small'
              variant='outlined'
              color='inherit'
              onClick={() => setWidth(preset.width)}
              sx={{ borderRadius: '9999px', py: 0.5, textTransform: 'none', color: 'text.secondary', borderColor: 'divider' }}
            >
              {P[preset.labelKey]}
            </Button>
          ))}
        </Stack>
        <Typography variant='caption' color='text.disabled'>
          {P.widthHint}
        </Typography>
      </Stack>

      {isSlideIn ? (
        <SlideInDensityMatrix contract={contract} />
      ) : (
        <Box data-capture='cta-harness-canvas'>
          <PreviewFrame
            key={`${mountKey}-${host}-${scheme}-${contentMode}-${assetPresent}`}
            contract={contract}
            host={host}
            scheme={scheme}
            widthPx={width}
            heightPx={380}
            degraded={degraded}
            onMountError={handleMountError}
          />
        </Box>
      )}

      <Stack direction='row' alignItems='center' gap={2} flexWrap='wrap'>
        <Button
          size='small'
          variant='outlined'
          startIcon={<i className='tabler-refresh' style={{ fontSize: 16 }} />}
          onClick={() => setMountKey(key => key + 1)}
        >
          {P.remount}
        </Button>
        <Button
          size='small'
          variant='outlined'
          startIcon={<i className='tabler-keyboard' style={{ fontSize: 16 }} />}
          onClick={focusPrimary}
        >
          {P.focusPrimary}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          size='small'
          color={degraded ? 'error' : 'inherit'}
          variant={degraded ? 'contained' : 'text'}
          startIcon={<i className='tabler-bug' style={{ fontSize: 16 }} />}
          onClick={() => onDegradedChange(!degraded)}
          data-capture='cta-harness-degrade-toggle'
          sx={degraded ? undefined : { color: 'text.secondary' }}
        >
          {degraded ? P.restoreRenderer : P.simulateFail}
        </Button>
      </Stack>
      <Typography variant='caption' color='text.secondary'>
        {P.interactHint} {P.failClosedNote}
      </Typography>

      <DiagnosticChips items={diagnostics} />
      <Typography variant='caption' color='text.disabled' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <i className='tabler-info-circle' style={{ fontSize: 14 }} aria-hidden />
        {P.badgesNote}
      </Typography>

      {!isSlideIn ? (
        <Stack spacing={3}>
          <Typography variant='subtitle2'>{P.matrixTitle}</Typography>
          <Box
            role='group'
            aria-label={P.matrixAria}
            data-capture='cta-harness-matrix'
            sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}
          >
            {PAIRWISE_COMBOS.map(combo => (
              <Stack key={combo.label} spacing={1.5}>
                <ScaledFrame targetWidth={combo.width + 64} height={210}>
                  <PreviewFrame
                    contract={contract}
                    host={combo.host}
                    scheme={combo.scheme}
                    widthPx={combo.width}
                    heightPx={210}
                    mini
                    suppressedEvidence={combo.suppressed}
                    onMountError={handleMountError}
                  />
                </ScaledFrame>
                <Typography variant='caption' sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  {combo.label}
                </Typography>
              </Stack>
            ))}
          </Box>
        </Stack>
      ) : null}
    </Stack>
  )
}

/** Contrato de preview desde un fixture (matriz de density del detalle). */
export const fixtureContract = (key: keyof typeof CTA_FIXTURES): CtaRenderContractMirror => CTA_FIXTURES[key].build()
