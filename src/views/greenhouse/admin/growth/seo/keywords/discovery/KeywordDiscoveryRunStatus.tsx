'use client'

import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_GROWTH_SEO_KEYWORDS } from '@/lib/copy/growth'
import { formatDate } from '@/lib/format'
import type { SeoDiscoveryRunStatus as RunStatus } from '@/lib/growth/seo/keyword-discovery/contracts'
import type { SeoDiscoveryRunView } from '@/lib/growth/seo/keyword-discovery/reader'

/**
 * TASK-1665 — Banda de estado de la corrida.
 *
 * Es una banda PERSISTENTE entre el builder y los resultados, no un spinner global: la corrida
 * ocurre fuera de la pantalla (Vercel encola, el worker ejecuta), así que el operador tiene que
 * poder salir, volver y seguir sabiendo qué pasó.
 *
 * 🔴 **Nunca un porcentaje.** El worker no entrega progreso confiable, así que una barra
 * determinada afirmaría cuánto falta sin saberlo. `running` usa una barra INDETERMINADA — la
 * única animación que sobrevive a `prefers-reduced-motion` en esta pantalla, porque es lo único
 * que distingue "sigue corriendo" de "quedó congelada".
 *
 * 🔴 **Una corrida parcial no es un éxito ni un error.** Tiene estado propio, dice qué fuente no
 * terminó y conserva lo que sí se materializó. Pintarla verde mentiría sobre la cobertura;
 * pintarla roja descartaría candidatos que sí existen.
 *
 * El canal primario es el texto dentro de `role='status'`: el motion es refuerzo, no el mensaje.
 */

interface Props {
  run: SeoDiscoveryRunView | null
  /** `true` cuando la última corrida excede la política de frescura y no debe leerse como actual. */
  stale?: boolean
}

/**
 * El tono acompaña al texto, nunca lo reemplaza. `no_results` y `cancelled` van en `text` y no
 * en `error`: una respuesta válida sin filas no es una falla del sistema, y pintarla de rojo
 * mandaría al operador a buscar un problema que no existe.
 */
const TONE_BY_STATUS: Record<RunStatus, 'text' | 'info' | 'success' | 'warning' | 'error'> = {
  pending: 'info',
  running: 'info',
  succeeded: 'success',
  partial: 'warning',
  no_results: 'text',
  budget_blocked: 'warning',
  failed: 'error',
  cancelled: 'text'
}

const formatUsd = (value: number) => value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')

const formatRunDate = (iso: string | null) => (iso ? formatDate(iso) : null)

const KeywordDiscoveryRunStatus = ({ run, stale = false }: Props) => {
  const copy = GH_GROWTH_SEO_KEYWORDS.discovery.run

  if (!run) return null

  const resolve = (): { title: string; detail: string; announce: string } => {
    switch (run.status) {
      case 'pending':
        return { title: copy.queuedTitle, detail: copy.queuedDetail, announce: copy.queuedAnnounce }
      case 'running':
        return { title: copy.runningTitle, detail: copy.runningDetail, announce: copy.runningAnnounce }
      case 'succeeded':
        return {
          title: copy.succeededTitle,
          detail: copy.succeededDetail
            .replace('{count}', String(run.candidateCount))
            .replace('{amount}', formatUsd(run.actualCostUsd ?? run.estimatedCostUsd)),
          announce: copy.succeededAnnounce.replace('{count}', String(run.candidateCount))
        }
      case 'partial':
        return { title: copy.partialTitle, detail: copy.partialDetail, announce: copy.partialAnnounce }
      case 'no_results':
        return { title: copy.noResultsTitle, detail: copy.noResultsDetail, announce: copy.noResultsAnnounce }
      case 'budget_blocked':
        return {
          title: copy.budgetBlockedTitle,
          detail: copy.budgetBlockedDetail,
          announce: copy.budgetBlockedAnnounce
        }
      default:
        // `failed` y `cancelled` comparten superficie: para el operador la pregunta es la misma
        // —"¿qué hago ahora?"— y la respuesta también: una corrida nueva y explícita.
        return {
          title: copy.providerErrorTitle,
          detail: copy.providerErrorDetail,
          announce: copy.providerErrorAnnounce
        }
    }
  }

  const { title, detail, announce } = resolve()
  const isRunning = run.status === 'running' || run.status === 'pending'
  const capturedAt = formatRunDate(run.completedAt ?? run.requestedAt)

  return (
    <Box
      data-capture='seo-keyword-discovery-status'
      data-ui-surface='discovery-run-status'
      role='status'
      aria-live='polite'
    >
      <Stack spacing={2}>
        <Stack direction='row' spacing={3} alignItems='center' flexWrap='wrap' useFlexGap>
          {/* El título ES el estado, en palabras. Un chip al lado repitiendo la misma cadena
              era ruido: el color no agrega nada que el texto no diga ya, y duplicar la misma
              frase dos veces seguidas hace dudar de si son dos cosas distintas. */}
          <Typography variant='subtitle2' color={TONE_BY_STATUS[run.status] === 'text' ? 'text.primary' : `${TONE_BY_STATUS[run.status]}.main`}>
            {title}
          </Typography>

          {stale ? (
            <Typography variant='caption' color='warning.main'>
              {copy.staleDetail.replace('{date}', capturedAt ?? '—')}
            </Typography>
          ) : null}
        </Stack>

        <Typography variant='body2' color='text.secondary'>
          {detail}
        </Typography>

        {/* Indeterminada A PROPÓSITO. Ver el bloque de arriba. */}
        {isRunning ? <LinearProgress aria-label={copy.runningIndicatorAria} /> : null}

        {run.status === 'succeeded' || run.status === 'partial' ? (
          <Typography variant='caption' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {copy.runId.replace('{id}', run.runId.slice(-8))}
            {capturedAt ? ` · ${capturedAt}` : ''}
          </Typography>
        ) : null}

        {/* El texto anunciado no siempre coincide con el visible: el visible describe, el
            anunciado narra la transición. */}
        <Box component='span' className='sr-only'>
          {announce}
        </Box>
      </Stack>
    </Box>
  )
}

export default KeywordDiscoveryRunStatus
