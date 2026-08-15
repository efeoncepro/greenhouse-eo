'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'

import EmptyState from '@/components/greenhouse/EmptyState'
import { AdaptiveSidecarLayout } from '@/components/greenhouse/primitives'
import type { GreenhouseAsyncActionState } from '@/components/greenhouse/primitives'
import SurfaceRecipe from '@/components/greenhouse/primitives/surface-system/SurfaceRecipe'
import { isCanonicalApiError, throwIfNotOk } from '@/lib/api/parse-error-response'
import { GH_GROWTH_SEO_KEYWORDS } from '@/lib/copy/growth'
import { isDiscoveryRunStale } from '@/lib/growth/seo/keyword-discovery/contracts'
import type { SeoDiscoveryMethod } from '@/lib/growth/seo/keyword-discovery/contracts'
import type { SeoDiscoveryCandidateView, SeoDiscoveryRunView } from '@/lib/growth/seo/keyword-discovery/reader'

import KeywordsSurfaceHeader from '../KeywordsSurfaceHeader'
import KeywordDiscoveryBuilder from './KeywordDiscoveryBuilder'
import KeywordDiscoveryCandidateDrawer from './KeywordDiscoveryCandidateDrawer'
import KeywordDiscoveryResults, { DISCOVERY_DRAWER_ID, resolveState } from './KeywordDiscoveryResults'
import KeywordDiscoveryRunStatus from './KeywordDiscoveryRunStatus'
import {
  DISCOVERY_ENDPOINT,
  buildKeywordDiscoveryActionRequest,
  resolveActionErrorFeedback,
  resolveDismissFeedback,
  resolveGroundedFeedback,
  resolveTrackFeedback,
  type KeywordDiscoveryActionFeedback,
  type KeywordDiscoveryActionKind
} from './keyword-discovery-action'

/**
 * TASK-1665 — Raíz de la lente `Descubrir`.
 *
 * Cliente PURO, igual que la lente hermana: el servidor ya resolvió guard, Space, sitio,
 * mercado, flag y capabilities. Acá se compone, se recoge el input y se llama al command
 * gobernado — **nunca** al proveedor. El browser no conoce credenciales de DataForSEO ni sabe
 * que existe.
 *
 * Composición: `analyticsReport` con `plane='none'`. El plano contenido de la recipe haría
 * card-on-card sobre las superficies que el cuerpo ya define (builder, estado, resultados),
 * que es exactamente lo que el estándar premium bloquea.
 *
 * 🔴 **Slice 4 — cero optimistic update.** Ninguna acción mueve el estado visual por su cuenta:
 * se lee el outcome POR keyword y, cuando el command confirmó algo durable, se pide al servidor
 * que vuelva a proyectar (`router.refresh()`). Pintar "Siguiendo" antes de la confirmación
 * mentiría sobre una factura que crece todos los días.
 */

export interface KeywordDiscoveryWorkbenchProps {
  organizationId: string | null
  seoTargetId: string | null
  selectedSpaceId: string | null
  marketLabel: string | null
  canExecute: boolean
  disabledReason: string | null
  budgetRemainingUsd: number | null
  /** Perfil AEO del Space (TASK-1666). `null` ⇒ la acción grounded no se ofrece. */
  graderProfileId: string | null
  /** Motivo por el que grounded no está disponible; `null` cuando sí lo está. */
  groundedDisabledReason: string | null
  run: SeoDiscoveryRunView | null
  candidates: SeoDiscoveryCandidateView[]
  totalCandidates: number
}

const KeywordDiscoveryWorkbench = ({
  organizationId,
  seoTargetId,
  selectedSpaceId,
  marketLabel,
  canExecute,
  disabledReason,
  budgetRemainingUsd,
  graderProfileId,
  groundedDisabledReason,
  run,
  candidates,
  totalCandidates
}: KeywordDiscoveryWorkbenchProps) => {
  const copy = GH_GROWTH_SEO_KEYWORDS.discovery
  const router = useRouter()

  /**
   * 🔴 Se guarda el **id**, no el objeto candidato.
   *
   * Guardar el objeto lo congela en el instante de abrir: tras un track exitoso `router.refresh()`
   * reproyecta la tabla con `alreadyTracked: true`, pero el drawer seguiría mostrando el candidato
   * viejo —chip «Nuevo» y los dos CTAs de gasto habilitados sobre algo que YA se confirmó—. Dos
   * proyecciones de la misma verdad divergiendo en pantalla es exactamente el segundo almacén que
   * esta lente evita en todos lados; el id deriva siempre de las props frescas.
   */
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [actionState, setActionState] = useState<Partial<Record<KeywordDiscoveryActionKind, GreenhouseAsyncActionState>>>({})
  const [feedback, setFeedback] = useState<KeywordDiscoveryActionFeedback | null>(null)

  /**
   * Acción en vuelo, a nivel workbench y no por-kind.
   *
   * Con estado por-kind cada botón sólo se apagaba a sí mismo: con «Declarar objetivo» en vuelo,
   * «Seguir oportunidad» seguía clickeable. Dos `trackKeywords` concurrentes con intents distintos
   * sobre la misma keyword cierran y reabren la membresía en orden no determinista (flip-flop de
   * `intent_changed`), y el feedback es last-wins: el operador puede leer el resultado de la otra
   * acción. No hay doble gasto —el techo y el `FOR UPDATE` del command lo impiden—, pero sí estado
   * confuso en un camino de dinero, que es igual de inaceptable.
   */
  const [pendingAction, setPendingAction] = useState<KeywordDiscoveryActionKind | null>(null)

  const selectedCandidate = useMemo(
    () => candidates.find(candidate => candidate.candidateId === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId]
  )

  // El trigger que abrió el drawer: `AdaptiveSidecarLayout` le devuelve el foco al cerrar, para
  // que quien navega por teclado no vuelva al inicio de la tabla en cada candidato revisado.
  const triggerRef = useRef<HTMLElement | null>(null)

  const header = (
    <KeywordsSurfaceHeader
      activeLens='discovery'
      spaceId={selectedSpaceId}
      title={copy.title}
      description={copy.subtitle}
    />
  )

  const handleSubmit = async ({
    seeds,
    methods,
    resultsPerCall
  }: {
    seeds: string[]
    methods: SeoDiscoveryMethod[]
    resultsPerCall: number
  }) => {
    if (!organizationId) return

    setFeedback(null)

    try {
      const response = await fetch(DISCOVERY_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: 'queue',
          organizationId,
          seoTargetId,
          seedSource: 'manual',
          manualSeeds: seeds,
          methods: methods.map(method => ({ method, resultsPerCall }))
        })
      })

      await throwIfNotOk(response, copy.cost.submitErrorFallback)

      const payload = (await response.json()) as { ok?: boolean; runId?: string }

      // El `runId` sólo entra al estado/URL cuando el command CONFIRMÓ persistencia. Guardarlo
      // antes dejaría un enlace compartible apuntando a una corrida que nunca existió.
      if (payload.ok && payload.runId) {
        /*
         * 🔴 La URL se reescribe ANTES de refrescar.
         *
         * `router.refresh()` re-ejecuta el server con los MISMOS `searchParams`. Si el operador
         * llegó por un enlace con `?discoveryRun=<viejo>`, el refresh vuelve a proyectar la
         * corrida vieja y la recién encolada queda invisible: acaba de confirmar un gasto y la
         * pantalla le muestra otra corrida, así que puede reintentar creyendo que no pasó nada.
         * `replace` y no `push`: encolar no es un paso de navegación que el botón «atrás» deba
         * deshacer.
         */
        const url = new URL(window.location.href)

        url.searchParams.set('discoveryRun', payload.runId)
        window.history.replaceState(null, '', `${url.pathname}${url.search}`)

        router.refresh()
      }
    } catch (error) {
      /*
       * 🔴 El error del camino de gasto se MUESTRA, no se traga.
       *
       * Cuando el queue rebota (`seo_budget_exhausted`, `limit_exceeded`, `provider_error`) NO se
       * inserta ninguna corrida: la banda de estado sigue mostrando la anterior o nada. Sin este
       * anuncio el operador ve un botón en rojo sin razón y no distingue «cupo agotado» (no
       * reintentar) de «proveedor caído» (reintentar después). El servidor ya fabricó la prosa
       * es-CL; `actionable` decide si tiene sentido ofrecer reintento.
       */
      const canonical = isCanonicalApiError(error) ? error : null

      const hint = canonical
        ? canonical.actionable
          ? copy.cost.submitErrorRetryHint
          : copy.cost.submitErrorStructuralHint
        : copy.cost.submitErrorRetryHint

      setFeedback({
        severity: 'error',
        message: `${canonical?.message ?? copy.cost.submitErrorFallback} ${hint}`,
        tracked: false
      })

      // Se relanza para que el CTA del builder muestre su estado de error: el anuncio explica el
      // porqué, el botón dice que ese intento terminó.
      throw error
    }
  }

  const handleOpenCandidate = (candidate: SeoDiscoveryCandidateView, trigger: HTMLButtonElement | null) => {
    triggerRef.current = trigger
    setActionState({})
    setSelectedCandidateId(candidate.candidateId)
  }

  const handleCloseCandidate = () => {
    setSelectedCandidateId(null)
    // Con `preferredMode='temporary'` el cierre por `Escape`/backdrop ya restaura el foco vía el
    // primitive; este camino cubre el botón de cerrar del propio sidecar.
    window.setTimeout(() => triggerRef.current?.focus(), 0)
  }

  /**
   * Ejecuta UNA acción sobre UN candidato. El mapeo acción → ruta → cuerpo vive en
   * `keyword-discovery-action.ts`; acá sólo queda el ciclo pending → outcome → anuncio.
   *
   * ⚠️ El botón queda `loading` durante todo el vuelo: es la primera línea contra el doble
   * click. La segunda —la que de verdad protege— es la idempotencia del command, que ya existe
   * en los tres primitives (`trackKeywords`, `recordKeywordDiscoveryAction`,
   * `createGroundedQueryDraft`).
   */
  const handleAction = async (kind: KeywordDiscoveryActionKind) => {
    const candidate = selectedCandidate

    if (!candidate || !organizationId || !seoTargetId || !run) return

    // Exclusión mutua: una sola acción en vuelo por vez. El guard va acá y no sólo en el
    // `disabled` de los botones porque el teclado y un doble evento pueden ganarle al render.
    if (pendingAction) return

    const request = buildKeywordDiscoveryActionRequest(kind, {
      organizationId,
      seoTargetId,
      runId: run.runId,
      candidateId: candidate.candidateId,
      keyword: candidate.keyword,
      graderProfileId
    })

    if (!request) return

    setPendingAction(kind)
    setActionState(current => ({ ...current, [kind]: 'loading' }))
    setFeedback(null)

    try {
      const response = await fetch(request.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request.body)
      })

      // El fallback es-CL sólo aplica si el cuerpo no vino en el contrato canónico; cuando sí
      // viene, `throwIfNotOk` propaga el `error` es-CL del servidor tal cual.
      await throwIfNotOk(response, copy.actions.feedbackError.replace('{keyword}', candidate.keyword))

      const payload = (await response.json()) as Record<string, unknown>

      const resolved =
        kind === 'declareTarget' || kind === 'followOpportunity'
          ? resolveTrackFeedback(payload as { outcomes?: Array<{ keyword?: string; status?: string }> }, candidate.keyword, kind)
          : kind === 'prepareGrounded'
            ? resolveGroundedFeedback(
                payload as { mode?: string; coverageNotice?: string | null; deduped?: boolean },
                candidate.keyword
              )
            : resolveDismissFeedback(candidate.keyword)

      setFeedback(resolved)
      setActionState(current => ({ ...current, [kind]: resolved.severity === 'error' ? 'error' : 'success' }))

      // Sólo se re-proyecta si el command confirmó algo durable. Un `capacity_exceeded` no
      // cambió nada en la base: refrescar ahí gastaría un render para pintar lo mismo.
      if (resolved.severity !== 'error') {
        router.refresh()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined

      setFeedback(resolveActionErrorFeedback(candidate.keyword, message))
      setActionState(current => ({ ...current, [kind]: 'error' }))
    } finally {
      setPendingAction(null)
    }
  }

  /**
   * Una corrida `pending`/`running` converge sola.
   *
   * La barra indeterminada del estado se justifica como «lo único que distingue *sigue corriendo*
   * de *quedó congelada*», y sin refresco esa distinción no era observable: el worker terminaba y
   * la pantalla seguía diciendo «corriendo» hasta que alguien recargara a mano. El drain corre
   * cada 10 min, así que 20 s es holgado y no golpea nada — `router.refresh()` re-ejecuta el
   * server component, no dispara ninguna corrida ni gasta con el proveedor.
   */
  const runStatus = run?.status ?? null

  useEffect(() => {
    if (runStatus !== 'pending' && runStatus !== 'running') return

    const timer = window.setInterval(() => router.refresh(), 20_000)

    return () => window.clearInterval(timer)
  }, [runStatus, router])

  const body = (
    <Stack spacing={6}>
      <Card>
        <CardContent>
          <KeywordDiscoveryBuilder
            marketLabel={marketLabel}
            canExecute={canExecute}
            disabledReason={disabledReason}
            budgetRemainingUsd={budgetRemainingUsd}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>

      {run ? (
        <Card>
          <CardContent>
            {/* La frescura la decide la política del dominio (`DISCOVERY_RUN_STALE_AFTER_DAYS`),
                no un umbral inventado en la vista. */}
            <KeywordDiscoveryRunStatus run={run} stale={isDiscoveryRunStale(run.completedAt)} />
          </CardContent>
        </Card>
      ) : null}

      {/* Sin corrida se dice la verdad —todavía no hay ninguna— en vez de mostrar una tabla
          vacía, que se leería como "buscamos y no encontramos nada". */}
      <Card data-capture={candidates.length > 0 ? undefined : 'seo-keyword-discovery-results'}>
        <CardContent>
          {candidates.length > 0 ? (
            <KeywordDiscoveryResults
              candidates={candidates}
              totalCandidates={totalCandidates}
              openCandidateId={selectedCandidate?.candidateId ?? null}
              onOpenCandidate={handleOpenCandidate}
            />
          ) : (
            <EmptyState
              icon='tabler-radar-2'
              title={seoTargetId ? copy.empty.title : copy.empty.noTargetTitle}
              description={seoTargetId ? copy.empty.description : copy.empty.noTargetDescription}
            />
          )}
        </CardContent>
      </Card>

      {/*
        🔴 El contenedor del anuncio se monta SIEMPRE, aunque no haya mensaje.
        Si apareciera junto con el texto, el lector de pantalla no anunciaría nada: una live
        region tiene que existir antes de que llegue su contenido.
      */}
      <Box role='status' aria-live='polite'>
        {feedback ? <Alert severity={feedback.severity}>{feedback.message}</Alert> : null}
      </Box>
    </Stack>
  )

  return (
    <AdaptiveSidecarLayout
      open={selectedCandidate !== null}
      onOpenChange={open => {
        if (!open) setSelectedCandidateId(null)
      }}
      kind='inspector'
      /*
       * `temporary` y no `push`/`overlay`, a propósito: el `Drawer` de MUI aporta focus trap,
       * `Escape`, click-away y —lo que de verdad importa acá— el apilado de modales que hace que
       * `Escape` cierre PRIMERO la confirmación y sólo después el drawer. Con `overlay` habría
       * que reimplementar a mano un focus trap que el primitive ya resuelve, y `push` encogería
       * una tabla de nueve columnas justo cuando el operador la está comparando.
       */
      preferredMode='temporary'
      sidecarWidth={460}
      restoreFocusRef={triggerRef}
      dataCapture='seo-keyword-discovery-candidate'
      sidecar={
        selectedCandidate ? (
          <Box id={DISCOVERY_DRAWER_ID} sx={{ height: '100%', overflow: 'auto' }}>
            <KeywordDiscoveryCandidateDrawer
              candidate={selectedCandidate}
              stateLabel={resolveState(selectedCandidate).label}
              organizationId={organizationId}
              marketLabel={marketLabel}
              runRequestedAt={run?.requestedAt ?? null}
              canExecute={canExecute}
              groundedDisabledReason={groundedDisabledReason}
              actionState={actionState}
              busy={pendingAction !== null}
              onAction={handleAction}
              onClose={handleCloseCandidate}
            />
          </Box>
        ) : null
      }
    >
      <SurfaceRecipe
        kind='analyticsReport'
        instanceId='seo-keywords-discovery'
        plane='none'
        header={header}
        regions={{ primary: body }}
      />
    </AdaptiveSidecarLayout>
  )
}

export default KeywordDiscoveryWorkbench
