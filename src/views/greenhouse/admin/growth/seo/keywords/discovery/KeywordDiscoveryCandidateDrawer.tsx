'use client'

import { useState } from 'react'

import Link from 'next/link'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import {
  ContextualSidecar,
  ContextualSidecarMetricStrip,
  ContextualSidecarSection,
  ContextualSidecarSignal,
  GreenhouseAsyncActionButton,
  GreenhouseChip
} from '@/components/greenhouse/primitives'
import type { ContextualSidecarMetric, GreenhouseAsyncActionState } from '@/components/greenhouse/primitives'
import { GH_GROWTH_SEO_KEYWORDS } from '@/lib/copy/growth'
import { formatDate, formatNumber } from '@/lib/format'
import type { SeoDiscoveryMethod } from '@/lib/growth/seo/keyword-discovery/contracts'
import type { SeoDiscoveryCandidateView } from '@/lib/growth/seo/keyword-discovery/reader'

import {
  KEYWORD_DISCOVERY_ACTION_CONFIRM,
  KEYWORD_DISCOVERY_ACTION_HINT,
  KEYWORD_DISCOVERY_ACTION_LABEL,
  buildTrajectoryHref,
  type KeywordDiscoveryActionKind
} from './keyword-discovery-action'

/**
 * TASK-1665 Slice 4 — detalle de un candidato y sus decisiones gobernadas.
 *
 * 🔴 **Este drawer no deriva nada.** Recibe el `SeoDiscoveryCandidateView` que ya proyectó el
 * reader y lo pinta; si falta un dato dice el estado semántico entregado ("Sin dato de mercado",
 * "Sin medición propia", "Sin agrupador") y JAMÁS consulta otro proveedor para rellenarlo. No
 * calcula scores, no fusiona `◑` con `●` en una cifra híbrida y no muestra `competition` como si
 * fuera dificultad.
 *
 * 🔴 **El orden del contenido es el del wireframe R4 y es de producto, no estético:** primero
 * "¿cómo llegó acá?", después el mercado estimado, después la medición propia, después la
 * advertencia de que sugerencia ≠ seguimiento, y RECIÉN AHÍ las acciones. Subir las acciones
 * invitaría a comprometer gasto antes de leer en qué se basa la decisión.
 *
 * 🔴 **La confirmación es un `Dialog`, no una sección del sidecar** — el sidecar preserva
 * contexto; el modal se reserva para la decisión gobernada final. Y entra **sin animación**:
 * animar una decisión de dinero la vuelve más liviana de lo que es. El `Escape` en cascada sale
 * gratis del stacking de modales de MUI: el `Dialog` es el modal superior, así que se cierra
 * primero y sólo después el `Drawer` del sidecar.
 */

const COPY = GH_GROWTH_SEO_KEYWORDS.discovery
const RESULTS = COPY.results
const DRAWER = COPY.drawer
const ACTIONS = COPY.actions

const SOURCE_LABEL: Record<SeoDiscoveryMethod, string> = {
  keyword_suggestions: RESULTS.sourceSuggestions,
  related_keywords: RESULTS.sourceRelated,
  keyword_ideas: RESULTS.sourceIdeas,
  keywords_for_site: RESULTS.sourceDomain
}

const INTENT_LABEL: Record<string, string> = {
  informational: RESULTS.intentInformational,
  navigational: RESULTS.intentNavigational,
  commercial: RESULTS.intentCommercial,
  transactional: RESULTS.intentTransactional
}

const BARRIER_LABEL: Record<string, string> = {
  low: RESULTS.barrierLow,
  medium: RESULTS.barrierMedium,
  high: RESULTS.barrierHigh,
  unknown: RESULTS.barrierUnknown
}

export interface KeywordDiscoveryCandidateDrawerProps {
  candidate: SeoDiscoveryCandidateView
  /** Estado del candidato ya resuelto por la tabla: una sola verdad para chip y drawer. */
  stateLabel: string
  organizationId: string | null
  marketLabel: string | null
  runRequestedAt: string | null
  /** `growth.seo.target.configure`. Sin esto las acciones de gasto NO se renderizan. */
  canExecute: boolean
  /** Grounded exige capability AEO + perfil del Space + flag del grader. */
  groundedDisabledReason: string | null
  actionState: Partial<Record<KeywordDiscoveryActionKind, GreenhouseAsyncActionState>>
  onAction: (kind: KeywordDiscoveryActionKind) => void
  onClose: () => void
}

const formatMaybeDate = (iso: string | null) => (iso ? formatDate(iso) : null)

const KeywordDiscoveryCandidateDrawer = ({
  candidate,
  stateLabel,
  organizationId,
  marketLabel,
  runRequestedAt,
  canExecute,
  groundedDisabledReason,
  actionState,
  onAction,
  onClose
}: KeywordDiscoveryCandidateDrawerProps) => {
  const [pendingConfirm, setPendingConfirm] = useState<KeywordDiscoveryActionKind | null>(null)

  const capturedAt = formatMaybeDate(candidate.capturedAt)
  const providerUpdatedAt = formatMaybeDate(candidate.providerLastUpdatedAt)
  const runDate = formatMaybeDate(runRequestedAt)
  const barrier = candidate.linkBarrier ?? 'unknown'

  /**
   * ⚠️ `Ya seguido` NO ofrece seguir de nuevo (wireframe: "no duplicate CTA"). Reclasificar la
   * intención de una membresía vigente existe en el command (`intent_changed`), pero su dueña es
   * la lente `Objetivos` — ofrecerla acá sin saber la intención actual haría prometer un cambio
   * que puede ser un no-op.
   */
  const trackActionsAvailable = canExecute && !candidate.alreadyTracked
  const groundedAvailable = canExecute && groundedDisabledReason === null
  const dismissAvailable = canExecute

  const hasAnyAction = trackActionsAvailable || groundedAvailable || dismissAvailable

  const marketMetrics: ContextualSidecarMetric[] = [
    {
      label: DRAWER.volumeLabel,
      value:
        candidate.searchVolume === null
          ? RESULTS.noMarketData
          : `◑ ${RESULTS.volumeUnit.replace('{value}', formatNumber(candidate.searchVolume))}`
    },
    {
      label: DRAWER.barrierLabel,
      value: barrier === 'unknown' ? RESULTS.barrierUnknown : `◑ ${BARRIER_LABEL[barrier]}`,
      helper: barrier === 'low' ? RESULTS.barrierLowHint : DRAWER.barrierHint
    },
    {
      label: DRAWER.intentLabel,
      value: candidate.intent ? (INTENT_LABEL[candidate.intent] ?? candidate.intent) : RESULTS.noIntent
    },
    {
      label: DRAWER.clusterLabel,
      value: candidate.coreKeyword ?? RESULTS.noCluster
    }
  ]

  // El CPC sólo aparece si existe, y siempre con su desambiguación: es precio publicitario, no
  // el costo de posicionarse orgánicamente. Sin esa línea el número invita a leerlo al revés.
  if (candidate.cpcUsd !== null) {
    marketMetrics.push({
      label: DRAWER.cpcLabel,
      value: `◑ USD ${candidate.cpcUsd.toFixed(2)}`,
      helper: DRAWER.cpcHint
    })
  }

  const renderAction = (kind: KeywordDiscoveryActionKind) => (
    <Stack key={kind} spacing={1}>
      <GreenhouseAsyncActionButton
        kind='primaryAction'
        variant={kind === 'declareTarget' ? 'contained' : 'outlined'}
        size='small'
        state={actionState[kind] ?? 'idle'}
        loadingLabel={ACTIONS.pendingLabel}
        onClick={() => setPendingConfirm(kind)}
      >
        {KEYWORD_DISCOVERY_ACTION_LABEL[kind]}
      </GreenhouseAsyncActionButton>
      <Typography variant='caption' color='text.secondary'>
        {KEYWORD_DISCOVERY_ACTION_HINT[kind]}
      </Typography>
    </Stack>
  )

  return (
    <>
      <ContextualSidecar
        kind='inspector'
        eyebrow={DRAWER.eyebrow}
        title={candidate.keyword}
        subtitle={SOURCE_LABEL[candidate.sourceEndpoint]}
        icon='tabler-radar-2'
        onClose={onClose}
        closeLabel={DRAWER.closeLabel}
        dataCapture='seo-keyword-discovery-candidate-drawer'
        actions={<GreenhouseChip kind='status' variant='label' size='small' label={stateLabel} />}
      >
        <Stack spacing={5} data-ui-surface='discovery-candidate-drawer'>
          {/* 1–4 — procedencia: la primera pregunta del operador, antes que cualquier cifra. */}
          <ContextualSidecarSection title={DRAWER.provenanceTitle}>
            <Stack spacing={1}>
              <Typography variant='body2'>
                {DRAWER.provenanceChain
                  .replace('{seed}', candidate.seedKeywords[0] ?? DRAWER.provenanceNoSeed)
                  .replace('{method}', SOURCE_LABEL[candidate.sourceEndpoint])
                  .replace('{date}', runDate ?? '—')}
              </Typography>

              {candidate.sourceRank !== null ? (
                <Typography variant='caption' color='text.secondary'>
                  {DRAWER.provenanceRank.replace('{rank}', String(candidate.sourceRank))}
                </Typography>
              ) : null}

              {marketLabel ? (
                <Typography variant='caption' color='text.secondary'>
                  {DRAWER.marketTitle}: {marketLabel}
                </Typography>
              ) : null}

              {capturedAt ? (
                <Typography variant='caption' color='text.secondary'>
                  {DRAWER.capturedAtLabel.replace('{date}', capturedAt)}
                </Typography>
              ) : null}

              {/* Dos fechas distintas, no una: cuándo lo capturamos ≠ cuándo el proveedor
                  refrescó el hecho. Colapsarlas haría pasar por fresco un dato de hace un mes. */}
              {providerUpdatedAt ? (
                <Typography variant='caption' color='text.secondary'>
                  {DRAWER.providerUpdatedLabel.replace('{date}', providerUpdatedAt)}
                </Typography>
              ) : null}
            </Stack>
          </ContextualSidecarSection>

          {/* 5 — Labs `◑`, con la desambiguación pagado vs orgánico en el subtítulo. */}
          <ContextualSidecarSection title={DRAWER.marketDataTitle} subtitle={DRAWER.marketDataHint}>
            <ContextualSidecarMetricStrip items={marketMetrics} />
          </ContextualSidecarSection>

          {/* 6 — GSC `●`. Vive en su propia sección justamente para que nadie la promedie con
              la anterior: una es demanda estimada de terceros, la otra es medición propia. */}
          <ContextualSidecarSection title={DRAWER.measuredTitle} subtitle={DRAWER.measuredHint}>
            {candidate.measuredGsc ? (
              <ContextualSidecarMetricStrip
                items={[
                  {
                    label: DRAWER.positionLabel,
                    value:
                      candidate.measuredGsc.position === null
                        ? RESULTS.notInSeries
                        : `● ${RESULTS.position.replace('{value}', String(Math.round(candidate.measuredGsc.position)))}`
                  },
                  {
                    label: DRAWER.impressionsLabel,
                    value: `● ${formatNumber(candidate.measuredGsc.impressions)}`
                  }
                ]}
              />
            ) : (
              <Typography variant='body2' color='text.secondary'>
                {RESULTS.noPresence}
              </Typography>
            )}
          </ContextualSidecarSection>

          {/* 7 — la advertencia va ANTES de las acciones, no como letra chica debajo. */}
          <ContextualSidecarSignal
            icon='tabler-alert-triangle'
            color='warning'
            title={DRAWER.warningTitle}
            description={DRAWER.warningBody}
          />

          {/* 8 — acciones. Read-only NO renderiza CTA de gasto: un botón apagado invita a
              buscar cómo encenderlo; la explicación es más útil y más honesta. */}
          <ContextualSidecarSection title={DRAWER.actionsTitle}>
            {candidate.alreadyTracked ? (
              <ContextualSidecarSignal
                icon='tabler-circle-check'
                color='info'
                title={DRAWER.trackedTitle}
                description={DRAWER.trackedBody}
              />
            ) : null}

            {hasAnyAction ? (
              <Stack spacing={4}>
                {trackActionsAvailable ? renderAction('declareTarget') : null}
                {trackActionsAvailable ? renderAction('followOpportunity') : null}
                {groundedAvailable ? renderAction('prepareGrounded') : null}
                {!groundedAvailable && canExecute && groundedDisabledReason ? (
                  <Typography variant='caption' color='text.secondary'>
                    {groundedDisabledReason}
                  </Typography>
                ) : null}
                {dismissAvailable ? renderAction('dismiss') : null}
              </Stack>
            ) : (
              <ContextualSidecarSignal
                icon='tabler-lock'
                title={DRAWER.noActionsTitle}
                description={DRAWER.noActionsBody}
              />
            )}
          </ContextualSidecarSection>

          {/* 9 — navegación read-only. No inicia corrida y no gasta. */}
          {organizationId ? (
            <Stack spacing={1}>
              <Button
                component={Link}
                href={buildTrajectoryHref(organizationId, candidate.keyword)}
                variant='text'
                size='small'
                startIcon={<i className='tabler-chart-line' />}
                sx={{ alignSelf: 'flex-start' }}
              >
                {ACTIONS.viewTrajectory}
              </Button>
              <Typography variant='caption' color='text.secondary'>
                {ACTIONS.viewTrajectoryHint}
              </Typography>
            </Stack>
          ) : null}
        </Stack>
      </ContextualSidecar>

      {/* Confirmación gobernada. `transitionDuration={0}`: el contrato de motion prohíbe animar
          una decisión de dinero — aparece sin escala ni desplazamiento. */}
      <Dialog
        open={pendingConfirm !== null}
        onClose={() => setPendingConfirm(null)}
        transitionDuration={0}
        maxWidth='xs'
        fullWidth
        aria-labelledby='discovery-action-confirm-title'
      >
        <DialogTitle id='discovery-action-confirm-title'>{ACTIONS.confirmTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{pendingConfirm ? KEYWORD_DISCOVERY_ACTION_CONFIRM[pendingConfirm] : ''}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingConfirm(null)} color='secondary'>
            {ACTIONS.cancelCta}
          </Button>
          <Button
            variant='contained'
            onClick={() => {
              if (!pendingConfirm) return

              const kind = pendingConfirm

              setPendingConfirm(null)
              onAction(kind)
            }}
          >
            {pendingConfirm ? KEYWORD_DISCOVERY_ACTION_LABEL[pendingConfirm] : ACTIONS.confirmCta}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default KeywordDiscoveryCandidateDrawer
