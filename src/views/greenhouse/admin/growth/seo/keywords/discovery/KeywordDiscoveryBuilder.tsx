'use client'

import { useEffect, useMemo, useState } from 'react'

import type { SxProps, Theme } from '@mui/material/styles'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import { GreenhouseAsyncActionButton } from '@/components/greenhouse/primitives'
import type { GreenhouseAsyncActionState } from '@/components/greenhouse/primitives/GreenhouseAsyncActionButton'
import { GH_GROWTH_SEO_KEYWORDS } from '@/lib/copy/growth'
import { formatNumber } from '@/lib/format'
import type { SeoDiscoverySeedSourceAvailability } from '@/lib/growth/seo/keyword-discovery/queue'
import {
  DEFAULT_DISCOVERY_RESULTS_PER_CALL,
  estimateDiscoveryCost,
  MAX_DISCOVERY_EXPANSION_METHODS,
  MAX_DISCOVERY_SEEDS,
  MAX_SEED_CHARS,
  MAX_SEED_WORDS,
  validateSeedKeyword
} from '@/lib/growth/seo/keyword-discovery/contracts'
import type { SeoDiscoveryMethod, SeoDiscoverySourceKind } from '@/lib/growth/seo/keyword-discovery/contracts'

/**
 * TASK-1665 — Builder de la corrida de descubrimiento.
 *
 * Es la **superficie de comando** de la lente, no un formulario de configuración permanente:
 * el operador declara una pregunta, ve lo que va a costar y confirma. Por eso la banda de costo
 * es una región de primera clase dentro de esta misma superficie y no un tooltip ni algo que
 * aparezca después del CTA — el gasto es parte de la acción, no una nota al pie.
 *
 * ⚠️ **La preview NO es una autorización.** El costo que se muestra acá se estima en el
 * cliente con `estimateDiscoveryCost` (función pura del contrato, sin red) para que la banda
 * responda mientras el operador escribe. El command recalcula server-side antes de persistir y
 * puede bloquear con un cupo distinto: la cifra de esta pantalla informa, no habilita.
 *
 * Alcance de este componente: seeds, fuentes, métodos, mercado, alcance, costo y CTA. El estado
 * de la corrida y los candidatos son otras dos superficies (`RunStatus`, `Results`).
 */

const SCOPE_QUICK = 25
const SCOPE_FULL = DEFAULT_DISCOVERY_RESULTS_PER_CALL

/**
 * Ids ESTABLES para los controles.
 *
 * NO `useId`: dentro del subárbol de `SurfaceRecipe` produce mismatch de hidratación real —
 * hallazgo de TASK-1308 que ya obligó a declararlos a mano en la lente hermana. Repetir el
 * patrón acá no es copiar por inercia: es el mismo subárbol.
 */
const SEEDS_FIELD_ID = 'seo-discovery-seeds'
const METHODS_GROUP_ID = 'seo-discovery-methods'
const SOURCES_GROUP_ID = 'seo-discovery-sources'
const SCOPE_GROUP_ID = 'seo-discovery-scope'

/** Los tres métodos de EXPANSIÓN que esta lente ofrece. `keywords_for_site` no es uno de ellos. */
const EXPANSION_METHODS: ReadonlyArray<{ method: SeoDiscoveryMethod; label: string; helper: string }> = [
  {
    method: 'keyword_suggestions',
    label: GH_GROWTH_SEO_KEYWORDS.discovery.builder.methodSuggestions,
    helper: GH_GROWTH_SEO_KEYWORDS.discovery.builder.methodSuggestionsHelper
  },
  {
    method: 'related_keywords',
    label: GH_GROWTH_SEO_KEYWORDS.discovery.builder.methodRelated,
    helper: GH_GROWTH_SEO_KEYWORDS.discovery.builder.methodRelatedHelper
  },
  {
    method: 'keyword_ideas',
    label: GH_GROWTH_SEO_KEYWORDS.discovery.builder.methodIdeas,
    helper: GH_GROWTH_SEO_KEYWORDS.discovery.builder.methodIdeasHelper
  }
]

export interface KeywordDiscoveryBuilderProps {
  /** Mercado heredado del sitio, ya formateado para leer (`México · es-MX`). */
  marketLabel: string | null
  /** `false` cuando falta capability, flag o sitio: el CTA no se renderiza, no se deshabilita. */
  canExecute: boolean
  /** Motivo legible cuando `canExecute` es `false`. */
  disabledReason: string | null
  /** Cupo restante del período; `null` = no se pudo resolver. */
  budgetRemainingUsd: number | null
  /** Conteos reales de los MISMOS resolvers del encolado; `null` = no se pudo preguntar. */
  seedSourceAvailability: SeoDiscoverySeedSourceAvailability | null
  onSubmit?: (input: {
    seedSource: SeoDiscoverySourceKind
    seeds: string[]
    methods: SeoDiscoveryMethod[]
    resultsPerCall: number
  }) => Promise<void>
}

/**
 * Las cuatro fuentes que el operador puede elegir (TASK-1693).
 *
 * `mixed` NO se ofrece: combina manual con una medida y en V1 duplicaría el árbol de decisión
 * (¿cuál medida?, ¿qué pasa si esa no tiene insumo?) sin resolver ningún caso que las cuatro
 * simples no cubran. El primitive lo soporta y la ruta lo acepta; la superficie lo deja para
 * cuando exista la pregunta que lo pide.
 */
type DiscoveryCopy = typeof GH_GROWTH_SEO_KEYWORDS.discovery

/** Label y ayuda por fuente, desde el copy ya escrito y hasta hoy sin consumidor. */
const SOURCE_LABEL: Record<SeoDiscoverySourceKind, (copy: DiscoveryCopy) => string> = {
  gsc_queries: copy => copy.builder.sourceGsc,
  tracked_keywords: copy => copy.builder.sourceTracked,
  manual: copy => copy.builder.sourceManual,
  target_domain: copy => copy.builder.sourceDomain,
  mixed: copy => copy.builder.sourceManual
}

const SOURCE_HELPER: Record<SeoDiscoverySourceKind, (copy: DiscoveryCopy) => string> = {
  gsc_queries: copy => copy.builder.sourceGscHelper,
  tracked_keywords: copy => copy.builder.sourceTrackedHelper,
  manual: copy => copy.builder.sourceManualHelper,
  target_domain: copy => copy.builder.sourceDomainHelper,
  mixed: copy => copy.builder.sourceManualHelper
}

const SEED_SOURCE_OPTIONS: readonly SeoDiscoverySourceKind[] = [
  'gsc_queries',
  'tracked_keywords',
  'manual',
  'target_domain'
]

/** ¿La fuente saca sus seeds del textarea? Sólo `manual`. */
const usesManualSeeds = (source: SeoDiscoverySourceKind) => source === 'manual' || source === 'mixed'

/**
 * Costos de proveedor: hasta 4 decimales, sin ceros de relleno.
 *
 * Una llamada Labs cuesta USD 0.012 y una fila USD 0.00012 — redondear a centavos convertiría el
 * estimado en `US$0.01` o directamente en `US$0`, que es justo la cifra que la banda existe para
 * no esconder.
 */
const formatUsd = (value: number) => value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')

/**
 * El presupuesto es dinero a escala humana, no una fracción de centavo: se lee en centavos.
 *
 * Con `formatUsd` el cupo salía `US$48.3602` — cuatro decimales en una cifra de decenas de dólares
 * se leen como error de formato y le restan autoridad justo a la línea que responde «¿me cabe?».
 * Lo cazó el frame de la captura del 2026-08-15, con el cupo real del gate en pantalla.
 */
const formatBudgetUsd = (value: number) =>
  formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Anillo de foco explícito para los grupos de selección.
 *
 * `ToggleButton` de MUI comunica el foco cambiando el fondo, y eso no basta: sobre un botón ya
 * seleccionado el cambio es casi imperceptible y no existe para quien no distingue ese matiz.
 * El gate de teclado del GVC lo exige como `outline`/`box-shadow` real, y tiene razón — es la
 * única pista de dónde está parado alguien que navega sin mouse.
 */
const selectionGroupSx: SxProps<Theme> = {
  marginBlockStart: 2,
  // `display: flex` y no el `inline-flex` por defecto: como inline, el grupo se acomodaba en la
  // misma línea que su label y "Alcance" terminaba pegado a sus botones.
  display: 'flex',
  flexWrap: 'wrap',
  '& .MuiToggleButton-root': {
    textTransform: 'none',
    // El estado seleccionado tiene que leerse a un metro de distancia: es la declaración de qué
    // se va a enviar y cuánto se va a gastar. El tinte por defecto de MUI apenas se distingue
    // del no seleccionado, y el color NO puede ser la única señal — por eso además pesa la
    // tipografía.
    '&.Mui-selected': {
      backgroundColor: (theme: Theme) => theme.palette.primary.main,
      color: (theme: Theme) => theme.palette.primary.contrastText,
      fontWeight: 500,
      '&:hover': { backgroundColor: (theme: Theme) => theme.palette.primary.dark }
    },
    '&.Mui-focusVisible': {
      outline: (theme: Theme) => `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px'
    }
  }
}

const KeywordDiscoveryBuilder = ({
  marketLabel,
  canExecute,
  disabledReason,
  budgetRemainingUsd,
  seedSourceAvailability,
  onSubmit
}: KeywordDiscoveryBuilderProps) => {
  const copy = GH_GROWTH_SEO_KEYWORDS.discovery
  const [seedSource, setSeedSource] = useState<SeoDiscoverySourceKind>('manual')
  const [seedsText, setSeedsText] = useState('')
  const [methods, setMethods] = useState<SeoDiscoveryMethod[]>(['keyword_suggestions', 'related_keywords'])
  const [resultsPerCall, setResultsPerCall] = useState<number>(SCOPE_QUICK)
  const [submitState, setSubmitState] = useState<GreenhouseAsyncActionState>('idle')

  // ── Normalización de seeds ────────────────────────────────────────────────────────────
  //
  // Se dedupe pero NO se corrige el texto: no se tocan tildes, singular/plural ni idioma. Una
  // "corrección" cambiaría la pregunta que el operador quiso hacer, y el proveedor devuelve
  // resultados distintos para variantes que a nosotros nos parecen la misma palabra.
  const parsed = useMemo(() => {
    const lines = seedsText.split('\n').map(line => line.trim())
    const seen = new Set<string>()
    const seeds: string[] = []
    const invalid: Array<{ seed: string; reason: string }> = []
    let duplicates = 0

    for (const line of lines) {
      if (!line) continue

      const key = line.toLowerCase()

      if (seen.has(key)) {
        duplicates += 1
        continue
      }

      seen.add(key)

      const validation = validateSeedKeyword(line)

      if (validation.ok) seeds.push(line)
      else invalid.push({ seed: line, reason: validation.reason })
    }

    return { seeds, invalid, duplicates }
  }, [seedsText])

  const overSeedLimit = parsed.seeds.length > MAX_DISCOVERY_SEEDS

  /**
   * Disponibilidad y conteo de seeds POR FUENTE.
   *
   * `null` en `seedCount` = no se pudo preguntar (sin permiso de encolar, o la page no resolvió).
   * `target_domain` no tiene seeds por diseño: el «seed» es el dominio y el único método válido
   * es `keywords_for_site`.
   */
  const sourceSeedCount = useMemo<number | null>(() => {
    switch (seedSource) {
      case 'manual':
      case 'mixed':
        return Math.min(parsed.seeds.length, MAX_DISCOVERY_SEEDS)
      case 'gsc_queries':
        return seedSourceAvailability?.gscQueries ?? null
      case 'tracked_keywords':
        return seedSourceAvailability?.trackedKeywords ?? null
      case 'target_domain':
        return 0
      default:
        return null
    }
  }, [seedSource, parsed.seeds.length, seedSourceAvailability])

  const sourceUnavailableReason = useMemo(() => {
    if (seedSource === 'gsc_queries' && seedSourceAvailability && seedSourceAvailability.gscQueries === 0) {
      return copy.builder.sourceGscUnavailable
    }

    if (seedSource === 'tracked_keywords' && seedSourceAvailability && seedSourceAvailability.trackedKeywords === 0) {
      return copy.builder.sourceTrackedUnavailable
    }

    return null
  }, [seedSource, seedSourceAvailability, copy.builder])

  /**
   * 🔴 `target_domain` fuerza `keywords_for_site` y excluye la expansión.
   *
   * Sin keywords seed los métodos por-seed no tienen insumo, y el primitive lo rechaza con
   * `target_domain_requires_keywords_for_site`. Se restringe ANTES del envío: dejar armar una
   * combinación que el command va a rebotar convierte un error de diseño de la UI en un rebote
   * que el operador lee como falla del sistema.
   */
  const effectiveMethods = useMemo<SeoDiscoveryMethod[]>(
    () => (seedSource === 'target_domain' ? ['keywords_for_site'] : methods),
    [seedSource, methods]
  )

  /*
   * ⚠️ El estimador ya NO exige seeds escritas.
   *
   * Devolvía `null` con el textarea vacío, así que en `gsc_queries`, `tracked_keywords` y
   * `target_domain` la banda de costo habría quedado muda — justo en los modos donde el operador
   * no escribe nada y más necesita saber qué va a pagar antes de confirmar.
   */
  const estimate = useMemo(() => {
    if (sourceSeedCount === null || effectiveMethods.length === 0) return null
    if (sourceSeedCount === 0 && seedSource !== 'target_domain') return null

    return estimateDiscoveryCost({
      seedCount: sourceSeedCount,
      methods: effectiveMethods.map(method => ({ method, resultsPerCall }))
    })
  }, [sourceSeedCount, effectiveMethods, resultsPerCall, seedSource])

  // El costo se anuncia por `role='status'` sólo cuando el operador cambió algo, y con debounce:
  // anunciar por cada tecla convertiría al lector de pantalla en ruido continuo.
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    if (!estimate) {
      setAnnouncement('')

      return
    }

    const timer = setTimeout(() => {
      setAnnouncement(
        copy.cost.announce
          .replace('{calls}', String(estimate.providerCalls))
          .replace('{amount}', formatUsd(estimate.estimatedCostUsd))
      )
    }, 600)

    return () => clearTimeout(timer)
  }, [estimate, copy.cost.announce])

  /**
   * El techo de métodos se aplica sobre la selección ENTRANTE, no sobre la anterior: el grupo
   * entrega el arreglo completo, así que sumar un cuarto método simplemente no se persiste.
   * Recortar en silencio sería peor —el operador vería su click ignorado sin saber por qué—,
   * pero el límite ya está dicho en el helper del control.
   */
  const applyMethodSelection = (next: SeoDiscoveryMethod[]) => {
    if (next.length > MAX_DISCOVERY_EXPANSION_METHODS) return

    setMethods(next)
  }

  const blockingReason = useMemo(() => {
    if (!canExecute) return disabledReason

    // Una fuente sin insumo NO degrada a `manual` en silencio: se bloquea con su razón. Degradar
    // dejaría al operador leyendo resultados de otra pregunta creyendo que corrió la suya.
    if (sourceUnavailableReason) return sourceUnavailableReason

    if (usesManualSeeds(seedSource) && parsed.seeds.length === 0) return copy.builder.seedsErrorEmpty
    if (effectiveMethods.length === 0) return copy.disabledReason.noMethods

    return null
  }, [
    canExecute,
    disabledReason,
    sourceUnavailableReason,
    seedSource,
    parsed.seeds.length,
    effectiveMethods.length,
    copy.disabledReason,
    copy.builder.seedsErrorEmpty
  ])

  const handleSubmit = async () => {
    if (!onSubmit || blockingReason) return

    setSubmitState('loading')

    try {
      await onSubmit({
        seedSource,
        // Las seeds del textarea viajan SÓLO cuando la fuente las usa: mandarlas en `gsc_queries`
        // haría creer al lector del payload que la corrida partió de ellas.
        seeds: usesManualSeeds(seedSource) ? parsed.seeds.slice(0, MAX_DISCOVERY_SEEDS) : [],
        methods: effectiveMethods,
        resultsPerCall
      })
      setSubmitState('idle')
    } catch {
      /*
       * El PORQUÉ del rebote lo anuncia el workbench en su live region, con la prosa es-CL del
       * servidor y un hint que depende de `actionable`. Acá sólo queda el estado del botón.
       *
       * ⚠️ No delegar esto "a la banda de estado de la corrida": cuando el command rechaza, NO se
       * inserta ninguna corrida — la banda sigue mostrando la anterior o nada. Un botón en rojo
       * sin explicación deja al operador sin saber si reintentar.
       */
      setSubmitState('error')
    }
  }

  return (
    <Box data-capture='seo-keyword-discovery-builder' data-ui-surface='discovery-builder'>
      <Stack spacing={5}>
        <Stack
          spacing={5}
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'flex-start' }}
        >
          {/* ── Seeds ── */}
          <Box sx={{ flex: { md: 3 }, minInlineSize: 0 }}>
            <CustomTextField
              id={SEEDS_FIELD_ID}
              fullWidth
              multiline
              minRows={3}
              maxRows={8}
              label={copy.builder.seedsLabel}
              placeholder={copy.builder.seedsPlaceholder}
              value={seedsText}
              onChange={event => setSeedsText(event.target.value)}
              error={overSeedLimit || parsed.invalid.length > 0}
              helperText={copy.builder.seedsHelper}
              aria-describedby={`${SEEDS_FIELD_ID}-counter`}
            />

            <Stack
              direction='row'
              spacing={2}
              alignItems='center'
              flexWrap='wrap'
              useFlexGap
              sx={{ marginBlockStart: 2 }}
              id={`${SEEDS_FIELD_ID}-counter`}
            >
              <Typography variant='caption' color={overSeedLimit ? 'error.main' : 'text.secondary'}>
                {copy.builder.seedsCounter
                  .replace('{count}', String(parsed.seeds.length))
                  .replace('{max}', String(MAX_DISCOVERY_SEEDS))}
              </Typography>

              {parsed.duplicates > 0 ? (
                <Typography variant='caption' color='text.secondary'>
                  {(parsed.duplicates === 1
                    ? copy.builder.seedsDuplicateRemoved
                    : copy.builder.seedsDuplicatesRemoved
                  ).replace('{count}', String(parsed.duplicates))}
                </Typography>
              ) : null}
            </Stack>

            {/* El error va junto al control y nombra la seed exacta: un banner arriba obligaría
                a buscar cuál de diez líneas está mal. El texto válido nunca se borra. */}
            {overSeedLimit ? (
              <Typography variant='caption' color='error.main' sx={{ display: 'block', marginBlockStart: 1 }}>
                {copy.builder.seedsErrorTooMany.replace('{max}', String(MAX_DISCOVERY_SEEDS))}
              </Typography>
            ) : null}

            {parsed.invalid.map(item => (
              <Typography
                key={item.seed}
                variant='caption'
                color='error.main'
                sx={{ display: 'block', marginBlockStart: 1 }}
              >
                {(item.reason === 'too_many_words'
                  ? copy.builder.seedsErrorTooManyWords.replace('{max}', String(MAX_SEED_WORDS))
                  : copy.builder.seedsErrorTooLong.replace('{max}', String(MAX_SEED_CHARS))
                ).replace('{seed}', item.seed)}
              </Typography>
            ))}
          </Box>

          {/* ── Fuentes + métodos + alcance + mercado ── */}
          <Stack spacing={4} sx={{ flex: { md: 2 }, minInlineSize: 0 }}>
            {/* ── Fuente de seed (TASK-1693) ──────────────────────────────────────────────
                Las cuatro caben como toggles y cada una necesita su ayuda VISIBLE: la
                diferencia entre ellas es de costo y de calidad de dato, no de preferencia.
                Un `Select` escondería justo eso detrás de un click. */}
            <Box>
              <Typography variant='body2' component='label' id={SOURCES_GROUP_ID} sx={{ fontWeight: 500 }}>
                {copy.builder.sourcesLabel}
              </Typography>

              <ToggleButtonGroup
                exclusive
                value={seedSource}
                onChange={(_, next: SeoDiscoverySourceKind | null) => {
                  if (next) setSeedSource(next)
                }}
                aria-labelledby={SOURCES_GROUP_ID}
                size='small'
                sx={selectionGroupSx}
              >
                {SEED_SOURCE_OPTIONS.map(option => (
                  <ToggleButton key={option} value={option} title={SOURCE_HELPER[option](copy)}>
                    {SOURCE_LABEL[option](copy)}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              {/* La ayuda de la fuente ELEGIDA, siempre visible: es donde se dice si resolver
                  cuesta y de dónde sale el dato. En el `title` sola no la lee nadie en móvil. */}
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', marginBlockStart: 1 }}>
                {SOURCE_HELPER[seedSource](copy)}
              </Typography>

              {/* Una fuente sin insumo se dice con su razón y bloquea el envío. NUNCA se degrada
                  a `manual` en silencio ni se esconde la opción: esconderla impide entender por
                  qué no está disponible. */}
              {sourceUnavailableReason ? (
                <Typography variant='caption' color='error.main' sx={{ display: 'block', marginBlockStart: 1 }}>
                  {sourceUnavailableReason}
                </Typography>
              ) : null}
            </Box>

            <Box>
              <Typography variant='body2' component='label' id={METHODS_GROUP_ID} sx={{ fontWeight: 500 }}>
                {copy.builder.methodsLabel}
              </Typography>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                {copy.builder.methodsHelper.replace('{max}', String(MAX_DISCOVERY_EXPANSION_METHODS))}
              </Typography>

              {/* `ToggleButtonGroup` y NO chips: esto es una SELECCIÓN, no una etiqueta de estado.
                  Con `Chip` clickable, el chip seleccionado al recibir foco de teclado quedaba en
                  blanco sobre el gris de `Mui-focusVisible` (1.4:1, axe serious) — ilegible justo
                  para quien navega sin mouse. El toggle además trae `aria-pressed` y el recorrido
                  por flechas sin escribirlos a mano. */}
              <ToggleButtonGroup
                value={methods}
                onChange={(_, next: SeoDiscoveryMethod[]) => applyMethodSelection(next)}
                aria-labelledby={METHODS_GROUP_ID}
                size='small'
                sx={selectionGroupSx}
              >
                {EXPANSION_METHODS.map(item => (
                  <ToggleButton key={item.method} value={item.method} title={item.helper}>
                    {item.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              {methods.length === 0 ? (
                <Typography variant='caption' color='error.main' sx={{ display: 'block', marginBlockStart: 1 }}>
                  {copy.builder.methodsErrorEmpty}
                </Typography>
              ) : null}
            </Box>

            <Box>
              <Typography variant='body2' component='label' id={SCOPE_GROUP_ID} sx={{ fontWeight: 500 }}>
                {copy.builder.scopeLabel}
              </Typography>

              <ToggleButtonGroup
                exclusive
                value={resultsPerCall}
                // `next === null` = el operador pulsó la opción activa. El alcance no puede
                // quedar sin valor, así que se conserva el vigente en vez de deseleccionar.
                onChange={(_, next: number | null) => (next === null ? undefined : setResultsPerCall(next))}
                aria-labelledby={SCOPE_GROUP_ID}
                size='small'
                sx={selectionGroupSx}
              >
                {[
                  { value: SCOPE_QUICK, label: copy.builder.scopeQuick },
                  { value: SCOPE_FULL, label: copy.builder.scopeFull }
                ].map(option => (
                  <ToggleButton key={option.value} value={option.value}>
                    {option.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', marginBlockStart: 1 }}>
                {copy.builder.scopeHelper}
              </Typography>
            </Box>

            {marketLabel ? (
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  {copy.builder.marketLabel}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {marketLabel}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {copy.builder.marketHelper}
                </Typography>
              </Box>
            ) : null}
          </Stack>
        </Stack>

        {/* ── Banda de costo ──────────────────────────────────────────────────────────────
            Región dentro de la MISMA superficie del builder, separada por un divider — no una
            card anidada. Card-on-card acá convertiría la decisión de gasto en un widget más. */}
        <Box>
          <Divider sx={{ marginBlockEnd: 4 }} />

          <Box
            data-capture='seo-keyword-discovery-cost'
            role='status'
            sx={{
              backgroundColor: 'action.hover',
              borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
              padding: 4,
              // El alto se reserva para que recalcular el costo no desplace el CTA: un botón
              // que salta bajo el cursor es cómo se confirma un gasto sin querer.
              minBlockSize: theme => theme.spacing(24)
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={4}
              alignItems={{ xs: 'stretch', md: 'center' }}
              justifyContent='space-between'
            >
              <Stack spacing={1} sx={{ minInlineSize: 0 }}>
                {/* `color='text.primary'` explícito: el `subtitle2` del theme viene atenuado y
                    sobre el tinte de la banda cae a 3.25:1 (axe, serious). El titular de la
                    banda que autoriza un gasto no puede ser el texto menos legible del fold. */}
                <Typography variant='subtitle2' color='text.primary'>
                  {copy.cost.heading}
                </Typography>

                {estimate ? (
                  <>
                    <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {copy.cost.calls.replace('{count}', String(estimate.providerCalls))} ·{' '}
                      {copy.cost.rows.replace('{count}', String(estimate.requestedRows))}
                    </Typography>
                    <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                      {estimate.estimatedCostUsd > 0
                        ? copy.cost.estimate.replace('{amount}', formatUsd(estimate.estimatedCostUsd))
                        : copy.cost.estimateFree}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {copy.cost.formula.replace('{formula}', estimate.formula)}
                    </Typography>
                  </>
                ) : (
                  <Typography variant='body2' color='text.secondary'>
                    {blockingReason ?? copy.cost.calculating}
                  </Typography>
                )}

                {/*
                  🔴 El cupo se dice SIEMPRE que se conozca, dentro y fuera de la rama del estimado.
                  Es un hecho del PERÍODO, no una propiedad de esta consulta: "¿cuánto me queda?" es
                  justamente lo que el operador quiere saber ANTES de escribir la primera seed. Vivía
                  adentro del `estimate ?`, así que la cifra que más pesa en la decisión de gasto sólo
                  aparecía una vez que ya habías armado la pregunta — lo cazó el frame de la captura,
                  no el lint. Cuando no se pudo resolver sólo se dice en el momento que importa: con
                  un estimado en pantalla, es decir a un click de gastar.
                */}
                {budgetRemainingUsd !== null ? (
                  <Typography variant='caption' color='text.secondary'>
                    {copy.cost.budget.replace('{amount}', formatBudgetUsd(budgetRemainingUsd))}
                  </Typography>
                ) : estimate ? (
                  <Typography variant='caption' color='text.secondary'>
                    {copy.cost.budgetUnavailable}
                  </Typography>
                ) : null}
              </Stack>

              {/* El CTA no se deshabilita cuando falta permiso o flag: NO SE RENDERIZA. Un botón
                  apagado invita a buscar cómo encenderlo; la explicación ya está a la izquierda. */}
              {canExecute ? (
                <GreenhouseAsyncActionButton
                  state={submitState}
                  disabled={Boolean(blockingReason)}
                  onClick={handleSubmit}
                  reserveWidth
                  loadingLabel={copy.builder.submitPending}
                  aria-label={copy.builder.submitAriaLabel}
                  sx={{ alignSelf: { xs: 'stretch', md: 'center' }, flexShrink: 0 }}
                >
                  {copy.builder.submit}
                </GreenhouseAsyncActionButton>
              ) : null}
            </Stack>

            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', marginBlockStart: 3 }}>
              {copy.cost.disclaimer}
            </Typography>
          </Box>

          {/* Live region separada del bloque visual: anuncia el costo tras el debounce, sin
              re-leer toda la banda en cada render. */}
          <Box component='span' role='status' aria-live='polite' className='sr-only'>
            {announcement}
          </Box>
        </Box>

        {!canExecute && disabledReason ? (
          <Alert severity='info' variant='outlined'>
            {disabledReason}
          </Alert>
        ) : null}
      </Stack>
    </Box>
  )
}

export default KeywordDiscoveryBuilder
