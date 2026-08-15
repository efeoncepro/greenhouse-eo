'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import DataTableShell from '@/components/greenhouse/data-table/DataTableShell'
import { GreenhouseButton, GreenhouseChip } from '@/components/greenhouse/primitives'
import { GH_GROWTH_SEO_KEYWORDS } from '@/lib/copy/growth'
import { formatDate, formatNumber } from '@/lib/format'
import type { SeoDiscoveryMethod } from '@/lib/growth/seo/keyword-discovery/contracts'
import type { SeoDiscoveryCandidateView } from '@/lib/growth/seo/keyword-discovery/reader'

/**
 * TASK-1665 — Canvas de decisión: los candidatos de una corrida.
 *
 * La tabla es el contrato primario, no un fallback del chart — de hecho **no hay chart**: la
 * dirección visual rechazó el scatter volumen × dificultad porque los candidatos requieren
 * procedencia, `as-of` y acción, y porque los datos pueden faltar. Un punto en un plano no puede
 * decir "sin dato de mercado", y convertir una estimación en una señal visual dominante es
 * exactamente lo que esta pantalla no debe hacer.
 *
 * 🔴 **Dos lentes que NUNCA se promedian ni se sustituyen.** `◑` es mercado estimado del
 * proveedor (mensual, de terceros) y `●` es demanda medida del propio Space (Search Console).
 * Viven en columnas distintas, cada cifra viaja con su marcador, y la ausencia se nombra
 * ("Sin dato de mercado", "Sin medición propia") en vez de rellenarse con `0` o un guion.
 *
 * 🔴 **La columna es "Barrera de enlaces", NUNCA "Dificultad"** (ISSUE-152). El
 * `keyword_difficulty` del proveedor tiene piso duro y colapsa a 0 en SERPs es-LATAM, donde se
 * leería como "trivial". Se muestra el nivel derivado server-side del perfil real del top-10, y
 * `unknown` es "Sin dato" — jamás "Baja", que afirmaría una oportunidad que nadie midió.
 */

interface Props {
  candidates: SeoDiscoveryCandidateView[]
  totalCandidates: number
  /** Id del candidato abierto en el drawer; alimenta `aria-expanded` del trigger. */
  openCandidateId: string | null
  /** El botón que abrió el drawer se registra para poder devolverle el foco al cerrar. */
  onOpenCandidate: (candidate: SeoDiscoveryCandidateView, trigger: HTMLButtonElement | null) => void
}

/** Id del panel del sidecar: el trigger lo apunta con `aria-controls`. */
export const DISCOVERY_DRAWER_ID = 'seo-keyword-discovery-candidate-panel'

const SOURCE_LABEL: Record<SeoDiscoveryMethod, string> = {
  keyword_suggestions: GH_GROWTH_SEO_KEYWORDS.discovery.results.sourceSuggestions,
  related_keywords: GH_GROWTH_SEO_KEYWORDS.discovery.results.sourceRelated,
  keyword_ideas: GH_GROWTH_SEO_KEYWORDS.discovery.results.sourceIdeas,
  keywords_for_site: GH_GROWTH_SEO_KEYWORDS.discovery.results.sourceDomain
}

const INTENT_LABEL: Record<string, string> = {
  informational: GH_GROWTH_SEO_KEYWORDS.discovery.results.intentInformational,
  navigational: GH_GROWTH_SEO_KEYWORDS.discovery.results.intentNavigational,
  commercial: GH_GROWTH_SEO_KEYWORDS.discovery.results.intentCommercial,
  transactional: GH_GROWTH_SEO_KEYWORDS.discovery.results.intentTransactional
}

const BARRIER_LABEL: Record<string, string> = {
  low: GH_GROWTH_SEO_KEYWORDS.discovery.results.barrierLow,
  medium: GH_GROWTH_SEO_KEYWORDS.discovery.results.barrierMedium,
  high: GH_GROWTH_SEO_KEYWORDS.discovery.results.barrierHigh,
  unknown: GH_GROWTH_SEO_KEYWORDS.discovery.results.barrierUnknown
}

/**
 * Texto en blanco declarado: la ausencia se nombra, no se pinta como `—`.
 *
 * `text.secondary` y no `text.disabled`: el gris deshabilitado rinde 2.29:1 sobre blanco (axe
 * serious). "Sin dato de mercado" es información que el operador necesita LEER para decidir —
 * atenuarla hasta el borde de lo ilegible la convierte en el guion ambiguo que se quiso evitar.
 */
const Missing = ({ children }: { children: string }) => (
  <Typography variant='body2' color='text.secondary'>
    {children}
  </Typography>
)

/**
 * Exportado a propósito: la tabla, la card y el drawer proyectan el MISMO estado. Recalcularlo en
 * el drawer abriría un segundo almacén de la misma verdad, y el día que uno cambie el otro
 * mentiría sin que nada falle.
 */
export const resolveState = (candidate: SeoDiscoveryCandidateView) => {
  const copy = GH_GROWTH_SEO_KEYWORDS.discovery.results

  if (candidate.alreadyTracked) return { label: copy.stateTracked, tone: 'info' as const }

  switch (candidate.latestAction?.kind) {
    case 'dismissed':
    case 'rejected':
      return { label: copy.stateDismissed, tone: 'default' as const }
    case 'selected_for_grounded_query':
      return { label: copy.statePreparingAeo, tone: 'info' as const }
    case 'selected_for_target':
      return { label: copy.stateSelectedForTarget, tone: 'info' as const }
    case 'promoted_to_tracking':
      return { label: copy.stateTracked, tone: 'info' as const }
    default:
      return { label: copy.stateNew, tone: 'default' as const }
  }
}

const formatCapturedAt = (iso: string | null) => (iso ? formatDate(iso) : null)

/**
 * Las tres celdas de dato viven en helpers compartidos porque la tabla (md+) y la card (xs)
 * proyectan EXACTAMENTE la misma verdad. Duplicar el render sería la forma más rápida de que a
 * 390px falte un `as-of` o un marcador y nadie lo note.
 */
const VolumeValue = ({
  candidate,
  asOfDate,
  asOfIsProvider
}: {
  candidate: SeoDiscoveryCandidateView
  asOfDate: string | null
  /** `true` cuando la fecha es el as-of declarado por el proveedor; `false` = fecha de captura. */
  asOfIsProvider: boolean
}) => {
  const copy = GH_GROWTH_SEO_KEYWORDS.discovery.results

  if (candidate.searchVolume === null) return <Missing>{copy.noMarketData}</Missing>

  return (
    <Tooltip title={copy.estimatedMarker}>
      <Box>
        <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
          ◑ {copy.volumeUnit.replace('{value}', formatNumber(candidate.searchVolume))}
        </Typography>
        {asOfDate ? (
          <Typography variant='caption' color='text.secondary'>
            {/* Sin as-of del proveedor se dice «traído el …»: nuestra fecha de captura no es la
                fecha del dato, y presentarlas con el mismo label las hace pasar por lo mismo. */}
            {(asOfIsProvider ? copy.asOf : copy.asOfCaptured).replace('{date}', asOfDate)}
          </Typography>
        ) : null}
      </Box>
    </Tooltip>
  )
}

const BarrierValue = ({ barrier }: { barrier: string }) => {
  const copy = GH_GROWTH_SEO_KEYWORDS.discovery.results

  if (barrier === 'unknown') return <Missing>{copy.barrierUnknown}</Missing>

  return (
    <Tooltip title={barrier === 'low' ? copy.barrierLowHint : copy.estimatedMarker}>
      <Typography variant='body2'>◑ {BARRIER_LABEL[barrier]}</Typography>
    </Tooltip>
  )
}

const PresenceValue = ({ candidate }: { candidate: SeoDiscoveryCandidateView }) => {
  const copy = GH_GROWTH_SEO_KEYWORDS.discovery.results

  if (!candidate.measuredGsc) return <Missing>{copy.noPresence}</Missing>

  return (
    <Tooltip title={copy.measuredMarker}>
      <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
        ●{' '}
        {candidate.measuredGsc.position === null
          ? copy.notInSeries
          : copy.position.replace('{value}', String(Math.round(candidate.measuredGsc.position)))}
      </Typography>
    </Tooltip>
  )
}


/**
 * El detalle se abre con un BOTÓN, no con un click en la fila.
 *
 * ⚠️ Una fila entera clickeable no es alcanzable por teclado sin inventarle `role='button'` +
 * `tabIndex` + handler de tecla — una tercera vía que ninguna primitive del repo sostiene. El
 * botón trae foco, `Enter`/`Space` y semántica gratis, y cumple la regla dura del wireframe:
 * ninguna acción vive detrás de hover.
 */
const DetailTrigger = ({
  candidate,
  open,
  onOpenCandidate
}: {
  candidate: SeoDiscoveryCandidateView
  open: boolean
  onOpenCandidate: Props['onOpenCandidate']
}) => {
  const copy = GH_GROWTH_SEO_KEYWORDS.discovery.results

  return (
    <GreenhouseButton
      kind='inlineAction'
      variant='text'
      tone='primary'
      size='small'
      trailingIconClassName='tabler-chevron-right'
      aria-controls={DISCOVERY_DRAWER_ID}
      aria-expanded={open}
      aria-label={copy.openDetailAria.replace('{keyword}', candidate.keyword)}
      onClick={event => onOpenCandidate(candidate, event.currentTarget as HTMLButtonElement)}
      /*
       * 🔴 El color del label NO es el azul de acción, y eso está medido, no supuesto.
       *
       * La fila tiene tinte de hover, y sobre ese tinte el azul principal rinde **3.71:1** —
       * axe serious. Sobre blanco daba 4.59:1, así que el defecto sólo existía con el puntero
       * encima: invisible para lint, build y tipos. Lo cazó la captura del 2026-08-15 en el
       * frame de foco restaurado.
       *
       * Dos intentos descartados CON MEDICIÓN, no por gusto:
       * - `primary.dark` → 4.42:1. MUI lo **deriva** oscureciendo `main` en vez de tomar el
       *   navy de marca, así que se queda corto.
       * - variante tonal (`label`) → **3.69:1** y 10 violaciones por frame: el tonal pinta
       *   `primary.main` sobre un tinte primary, o sea el mismo hue contra sí mismo. Peor que
       *   el punto de partida.
       *
       * `text.primary` es el color que el theme garantiza contra sus superficies, en cualquier
       * modo y con cualquier primary que elija el tenant. La affordance la carga el chevron y
       * la columna `Detalle` — que además es lo que ya exige el contrato a11y de esta tabla:
       * nada se comunica sólo por color.
       */
      sx={{ color: 'text.primary' }}
    >
      {copy.openDetail}
    </GreenhouseButton>
  )
}

const KeywordDiscoveryResults = ({ candidates, totalCandidates, openCandidateId, onOpenCandidate }: Props) => {
  const copy = GH_GROWTH_SEO_KEYWORDS.discovery.results

  /*
   * 🔴 El conteo afirma el universo; la tabla sirve UNA página (el reader pagina en 50, techo
   * 200). Pintar «Candidatos (312)» sobre 50 filas sin decir nada es mentira por omisión, y en el
   * canvas donde se decide el gasto eso pesa: el operador cree que revisó todo.
   *
   * El orden gobernado del reader pone primero lo que más importa (● medido y no seguido), así
   * que los servidos son los buenos — pero no son todos, y se nombra. La paginación real
   * (consumir `nextCursor`) es de TASK-1693.
   */
  const truncated = totalCandidates > candidates.length

  return (
    <Box data-capture='seo-keyword-discovery-results' data-ui-surface='discovery-results'>
      <Stack spacing={3}>
        <Stack direction='row' spacing={3} alignItems='baseline' flexWrap='wrap' useFlexGap>
          <Typography variant='h6' component='h2'>
            {copy.title}
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {truncated
              ? copy.countTruncated
                  .replace('{shown}', String(candidates.length))
                  .replace('{count}', String(totalCandidates))
              : copy.count.replace('{count}', String(totalCandidates))}
          </Typography>
        </Stack>

        {truncated ? (
          <Typography variant='caption' color='text.secondary'>
            {copy.truncatedNotice
              .replace('{shown}', String(candidates.length))
              .replace('{count}', String(totalCandidates))}
          </Typography>
        ) : null}

        {/* Leyenda PERSISTENTE de las dos lentes: sin ella, `◑` y `●` son decoración. */}
        <Typography variant='caption' color='text.secondary'>
          {copy.legend}
        </Typography>

        {/* ── Tabla densa: md+ ────────────────────────────────────────────────────────────
            Se alterna con la card por CSS y NO por `useMediaQuery`: cambiar el árbol React
            según el ancho reintroduce el mismatch de hidratación que ya costó ids declarados
            en esta superficie. Lo oculto por `display:none` tampoco lo lee un lector de
            pantalla, así que no hay contenido duplicado para asistencia. */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <DataTableShell identifier='seo-keyword-discovery-candidates' ariaLabel={copy.ariaLabel} stickyFirstColumn>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{copy.colKeyword}</TableCell>
                <TableCell>{copy.colSource}</TableCell>
                <TableCell>{copy.colCluster}</TableCell>
                <TableCell>{copy.colIntent}</TableCell>
                <TableCell align='right'>{copy.colVolume}</TableCell>
                <TableCell>{copy.colBarrier}</TableCell>
                <TableCell>{copy.colPresence}</TableCell>
                <TableCell>{copy.colState}</TableCell>
                <TableCell>{copy.colActions}</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {candidates.map(candidate => {
                const state = resolveState(candidate)
                const asOfIsProvider = candidate.providerLastUpdatedAt !== null
                const asOfDate = formatCapturedAt(candidate.providerLastUpdatedAt ?? candidate.capturedAt)
                const barrier = candidate.linkBarrier ?? 'unknown'

                return (
                  <TableRow key={candidate.candidateId} hover>
                    <TableCell>
                      <Typography variant='body2'>{candidate.keyword}</Typography>
                      {/* Rastro de procedencia legible en la propia fila, no escondido en un
                          tooltip: "¿cómo llegó esto acá?" es la primera pregunta del operador. */}
                      {candidate.seedKeywords[0] ? (
                        <Typography variant='caption' color='text.secondary'>
                          {copy.seedTrace.replace('{seed}', candidate.seedKeywords[0])}
                        </Typography>
                      ) : null}
                    </TableCell>

                    <TableCell>
                      <Typography variant='body2'>{SOURCE_LABEL[candidate.sourceEndpoint]}</Typography>
                    </TableCell>

                    <TableCell>
                      {candidate.coreKeyword ? (
                        <Typography variant='body2'>{candidate.coreKeyword}</Typography>
                      ) : (
                        <Missing>{copy.noCluster}</Missing>
                      )}
                    </TableCell>

                    <TableCell>
                      {candidate.intent ? (
                        <Typography variant='body2'>{INTENT_LABEL[candidate.intent] ?? candidate.intent}</Typography>
                      ) : (
                        <Missing>{copy.noIntent}</Missing>
                      )}
                    </TableCell>

                    <TableCell align='right'>
                      <VolumeValue candidate={candidate} asOfDate={asOfDate} asOfIsProvider={asOfIsProvider} />
                    </TableCell>

                    <TableCell>
                      <BarrierValue barrier={barrier} />
                    </TableCell>

                    <TableCell>
                      <PresenceValue candidate={candidate} />
                    </TableCell>

                    <TableCell>
                      <GreenhouseChip kind='status' variant='label' size='small' tone={state.tone} label={state.label} />
                    </TableCell>

                    <TableCell>
                      <DetailTrigger
                        candidate={candidate}
                        open={openCandidateId === candidate.candidateId}
                        onOpenCandidate={onOpenCandidate}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </DataTableShell>
        </Box>

        {/* ── Card compacta: xs ───────────────────────────────────────────────────────────
            La dirección visual RECHAZA el scroll horizontal como solución a 390px, así que la
            tabla no se encoge: se recompone. El orden es fijo y conserva TODO lo decisorio —
            keyword → procedencia/seed → mercado estimado → medición propia → estado. Ninguna
            columna se pierde en el camino; si se perdiera, la card estaría mintiendo por
            omisión sobre en qué se basó una decisión de gasto. */}
        <Stack spacing={3} sx={{ display: { xs: 'flex', md: 'none' } }} aria-label={copy.ariaLabel}>
          {candidates.map(candidate => {
            const state = resolveState(candidate)
            const asOfIsProvider = candidate.providerLastUpdatedAt !== null
            const asOfDate = formatCapturedAt(candidate.providerLastUpdatedAt ?? candidate.capturedAt)
            const barrier = candidate.linkBarrier ?? 'unknown'

            return (
              <Box
                key={candidate.candidateId}
                sx={{
                  borderBlockEnd: theme => `1px solid ${theme.palette.divider}`,
                  paddingBlockEnd: 3
                }}
              >
                <Stack spacing={1}>
                  <Stack direction='row' spacing={2} justifyContent='space-between' alignItems='flex-start'>
                    <Typography variant='body2' sx={{ fontWeight: 500, minInlineSize: 0 }}>
                      {candidate.keyword}
                    </Typography>
                    <GreenhouseChip
                      kind='status'
                      variant='label'
                      size='small'
                      tone={state.tone}
                      label={state.label}
                    />
                  </Stack>

                  <Typography variant='caption' color='text.secondary'>
                    {SOURCE_LABEL[candidate.sourceEndpoint]}
                    {candidate.seedKeywords[0] ? ` · ${copy.seedTrace.replace('{seed}', candidate.seedKeywords[0])}` : ''}
                  </Typography>

                  <Stack direction='row' spacing={4} flexWrap='wrap' useFlexGap>
                    <VolumeValue candidate={candidate} asOfDate={asOfDate} asOfIsProvider={asOfIsProvider} />
                    <BarrierValue barrier={barrier} />
                  </Stack>

                  <PresenceValue candidate={candidate} />

                  {candidate.intent || candidate.coreKeyword ? (
                    <Typography variant='caption' color='text.secondary'>
                      {[
                        candidate.intent ? (INTENT_LABEL[candidate.intent] ?? candidate.intent) : null,
                        candidate.coreKeyword
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Typography>
                  ) : null}

                  {/* El trigger sobrevive a 390px: la disclosure puede mover el detalle, nunca
                      borrar la vía de acción. */}
                  <Box>
                    <DetailTrigger
                      candidate={candidate}
                      open={openCandidateId === candidate.candidateId}
                      onOpenCandidate={onOpenCandidate}
                    />
                  </Box>
                </Stack>
              </Box>
            )
          })}
        </Stack>

        {/* La divulgación del gasto viaja con los candidatos, no sólo en la confirmación: quien
            está eligiendo a cuáles seguir tiene que leerla ANTES de decidir. */}
        <Typography variant='caption' color='text.secondary'>
          {copy.trackingCostNotice}
        </Typography>
      </Stack>
    </Box>
  )
}

export default KeywordDiscoveryResults
