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
import {
  DEFAULT_DISCOVERY_RESULTS_PER_CALL,
  estimateDiscoveryCost,
  MAX_DISCOVERY_EXPANSION_METHODS,
  MAX_DISCOVERY_SEEDS,
  MAX_SEED_CHARS,
  MAX_SEED_WORDS,
  validateSeedKeyword
} from '@/lib/growth/seo/keyword-discovery/contracts'
import type { SeoDiscoveryMethod } from '@/lib/growth/seo/keyword-discovery/contracts'

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
  onSubmit?: (input: { seeds: string[]; methods: SeoDiscoveryMethod[]; resultsPerCall: number }) => Promise<void>
}

const formatUsd = (value: number) => value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')

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
  onSubmit
}: KeywordDiscoveryBuilderProps) => {
  const copy = GH_GROWTH_SEO_KEYWORDS.discovery
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

  const estimate = useMemo(() => {
    if (parsed.seeds.length === 0 || methods.length === 0) return null

    return estimateDiscoveryCost({
      seedCount: Math.min(parsed.seeds.length, MAX_DISCOVERY_SEEDS),
      methods: methods.map(method => ({ method, resultsPerCall }))
    })
  }, [parsed.seeds.length, methods, resultsPerCall])

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
    if (parsed.seeds.length === 0) return copy.disabledReason.noSeeds
    if (methods.length === 0) return copy.disabledReason.noMethods

    return null
  }, [canExecute, disabledReason, parsed.seeds.length, methods.length, copy.disabledReason])

  const handleSubmit = async () => {
    if (!onSubmit || blockingReason) return

    setSubmitState('loading')

    try {
      await onSubmit({ seeds: parsed.seeds.slice(0, MAX_DISCOVERY_SEEDS), methods, resultsPerCall })
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

          {/* ── Métodos + alcance + mercado ── */}
          <Stack spacing={4} sx={{ flex: { md: 2 }, minInlineSize: 0 }}>
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
                      {budgetRemainingUsd === null
                        ? copy.cost.budgetUnavailable
                        : copy.cost.budget.replace('{amount}', formatUsd(budgetRemainingUsd))}
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
