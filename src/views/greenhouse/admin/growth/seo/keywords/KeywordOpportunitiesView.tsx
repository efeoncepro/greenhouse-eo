'use client'

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Card from '@mui/material/Card'
import Tooltip from '@mui/material/Tooltip'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAutocomplete from '@core/components/mui/Autocomplete'
import CustomTextField from '@core/components/mui/TextField'

import DebouncedInput from '@/components/DebouncedInput'
import EmptyState from '@/components/greenhouse/EmptyState'
import { GreenhouseBreadcrumbs } from '@/components/greenhouse/primitives'
import type { GreenhouseAsyncActionState } from '@/components/greenhouse/primitives/GreenhouseAsyncActionButton'
import SurfaceRecipe from '@/components/greenhouse/primitives/surface-system/SurfaceRecipe'
import WorkbenchHeader from '@/components/greenhouse/primitives/surface-system/WorkbenchHeader'
import { GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'
import { throwIfNotOk } from '@/lib/api/parse-error-response'
import { GH_GROWTH_SEO_KEYWORDS, GH_GROWTH_SEO_OVERVIEW } from '@/lib/copy/growth'
import type { KeywordOpportunitiesResult, SeoKeywordTrackOutcome } from '@/lib/growth/seo/contracts'
import type { SeoSpaceOption } from '@/lib/growth/seo/overview/list-seo-spaces'
import type { SeoConnectionState } from '@/views/greenhouse/admin/growth/seo/overview/SeoOverviewView'

import SeoSearchVisibilityTabs from '../overview/SeoSearchVisibilityTabs'
import KeywordOpportunityMap from './KeywordOpportunityMap'
import KeywordOpportunityTable from './KeywordOpportunityTable'
import KeywordOpportunityVerdict from './KeywordOpportunityVerdict'
import { resolveKeywordAction, type KeywordAction } from './keyword-opportunity-action'

/**
 * TASK-1308 — Oportunidades de keywords (nodo S3 del master flow `EPIC-022`).
 *
 * Cliente PURO: no calcula el score ni decide acceso. El servidor ya resolvió el guard de
 * tres puertas, los Spaces elegibles, la lectura y el set vigente; acá se pinta, se filtra
 * y se ejecuta el command gobernado.
 *
 * ⚠️ EL FILTRO ES LOCAL, A DIFERENCIA DE `?space=`/`?window=`. Space y ventana viajan en la
 * URL porque cambian LO QUE SE LEE (y su cambio revalida el `module_assignment` server-side);
 * la acción y la posición sólo esconden filas ya cargadas. Mandarlas al servidor haría un
 * round-trip por cada click de chip para no traer un solo dato nuevo.
 *
 * ⚠️ "SEGUIR" NO MUTA ESTADO LOCAL Y YA. Llama al command gobernado `trackKeywords` (Full
 * API Parity — el mismo que operan Nexa y el lane MCP) y sólo entonces marca la fila. Un
 * optimistic update acá mentiría sobre un write que compromete gasto recurrente del
 * proveedor: si el techo lo rebota, la fila habría dicho "Siguiendo" para algo que no se
 * está midiendo.
 */

const TRACK_ENDPOINT = '/api/admin/growth/seo/keywords/track'
const UNTRACK_ENDPOINT = '/api/admin/growth/seo/keywords/untrack'

/**
 * Ids ESTABLES para los dos controles de contexto.
 *
 * 🔴 Sin esto MUI los deriva de `useId`, y el `htmlFor` del label salía distinto en servidor
 * y en cliente — un mismatch de hidratación REAL, reproducible sólo en 390px, que el gate de
 * runtime del GVC atrapó. La causa: los controles viven dentro del subárbol de la recipe,
 * que se adapta al ancho midiendo en cliente, así que la ruta del árbol con la que `useId`
 * calcula el identificador no es la misma en las dos pasadas. Un id declarado no depende de
 * la ruta — y de paso hace determinista el vínculo label↔control, que es lo que sostiene el
 * `htmlFor` para lectores de pantalla.
 */
const SPACE_FIELD_ID = 'seo-keywords-space'
const WINDOW_FIELD_ID = 'seo-keywords-window'
const SEARCH_FIELD_ID = 'seo-keywords-search'
const POSITION_FIELD_ID = 'seo-keywords-position'

type PositionFilter = 'all' | 'firstPage' | 'secondPage'

export interface KeywordOpportunitiesViewProps {
  spaces: SeoSpaceOption[]
  selectedSpaceId: string | null
  seoTargetId?: string
  rootDomain: string | null
  initialSearch: string
  initialAction: KeywordAction | 'all'
  initialPosition: PositionFilter
  connectionState: SeoConnectionState
  /** Hasta qué día llega la serie medida. `null` = no se pudo determinar, y se dice. */
  dataAsOf: string | null
  canConnectSearchConsole: boolean
  canTrackKeywords: boolean
  windowDays: number
  /** `null` = todavía no se pidió (sin Space, sin conexión o sin target). */
  opportunities: KeywordOpportunitiesResult | null
  trackedKeywords: string[]
  capacity: number
}

const KeywordOpportunitiesView = ({
  spaces,
  selectedSpaceId,
  initialSearch,
  initialAction,
  initialPosition,
  seoTargetId,
  rootDomain,
  connectionState,
  dataAsOf,
  canConnectSearchConsole,
  canTrackKeywords,
  windowDays,
  opportunities,
  trackedKeywords,
  capacity
}: KeywordOpportunitiesViewProps) => {
  const router = useRouter()
  const copy = GH_GROWTH_SEO_KEYWORDS

  // El re-fetch lo hace el SERVER (la navegación revalida el module_assignment), así que el
  // pending real es el de la transición de router; un flag local mentiría sobre cuándo terminó.
  const [isPending, startTransition] = useTransition()

  // Los filtros nacen de la URL: es lo que hace compartible "mira estas 42 de consolidación".
  const [search, setSearch] = useState(initialSearch)
  const [actionFilter, setActionFilter] = useState<KeywordAction | 'all'>(initialAction)
  const [positionFilter, setPositionFilter] = useState<PositionFilter>(initialPosition)

  const [tracked, setTracked] = useState<Set<string>>(() => new Set(trackedKeywords))
  const [trackingState, setTrackingState] = useState<Record<string, GreenhouseAsyncActionState>>({})

  /**
   * El feedback vive en un snackbar, no en un Alert arriba del mapa.
   *
   * Con el Alert, seguir la keyword de la fila 20 pintaba el mensaje FUERA DE PANTALLA: la
   * acción ocurría abajo y la confirmación aparecía arriba. `undo` lleva la reversa del
   * write para "dejar de seguir" — no un modal de confirmación (frena a quien sabe lo que
   * hace), sino la salida para quien se equivocó.
   */
  const [feedback, setFeedback] = useState<{
    severity: 'success' | 'info' | 'error'
    message: string
    undo?: () => void
  } | null>(null)

  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bulkState, setBulkState] = useState<GreenhouseAsyncActionState>('idle')
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null)

  const selectedSpace = spaces.find(space => space.organizationId === selectedSpaceId) ?? null

  // Memoizada: sin esto el arreglo se recrea en cada render y el `useMemo` del filtrado se
  // invalidaría siempre, volviéndolo decorativo.
  const rows = useMemo(() => (opportunities?.ok ? opportunities.opportunities : []), [opportunities])

  const pushQuery = (next: { space?: string; window?: number }) => {
    const params = new URLSearchParams()
    const space = next.space ?? selectedSpaceId

    if (space) params.set('space', space)
    params.set('window', String(next.window ?? windowDays))

    startTransition(() => {
      router.push(`/admin/growth/seo/keywords?${params.toString()}`)
    })
  }

  /**
   * Los filtros viajan a la URL con `history.replaceState`, NO con `router.push`.
   *
   * ⚠️ La distinción es el punto: `router.push` dispararía un render de servidor por cada
   * tecla del buscador para no traer un solo dato nuevo — el filtrado es local sobre filas
   * ya cargadas. `replaceState` deja la barra de direcciones compartible sin round-trip, y
   * el servidor los lee al entrar por un enlace pegado.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)

    const sync = (key: string, value: string, fallback: string) => {
      if (value === fallback) params.delete(key)
      else params.set(key, value)
    }

    sync('q', search.trim(), '')
    sync('action', actionFilter, 'all')
    sync('position', positionFilter, 'all')

    const query = params.toString()

    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }, [search, actionFilter, positionFilter])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()

    return rows.filter(row => {
      if (needle && !row.keyword.toLowerCase().includes(needle)) return false
      if (actionFilter !== 'all' && resolveKeywordAction(row) !== actionFilter) return false
      if (positionFilter === 'firstPage' && row.position > 10) return false
      if (positionFilter === 'secondPage' && row.position <= 10) return false

      return true
    })
  }, [rows, search, actionFilter, positionFilter])

  const hasActiveFilters = search.trim().length > 0 || actionFilter !== 'all' || positionFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setActionFilter('all')
    setPositionFilter('all')
  }

  const atCapacity = tracked.size >= capacity

  const handleTrack = async (keyword: string) => {
    if (!seoTargetId) return

    setTrackingState(current => ({ ...current, [keyword]: 'loading' }))
    setFeedback(null)

    try {
      const response = await fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ seoTargetId, keywords: [keyword] })
      })

      await throwIfNotOk(response, copy.follow.feedbackError.replace('{keyword}', keyword))

      const payload = (await response.json()) as {
        outcomes?: SeoKeywordTrackOutcome[]
        activeKeywordCount?: number
      }

      // ⚠️ Se lee el outcome POR keyword, nunca el 200 pelado: el command devuelve 200 con
      // la keyword RECHAZADA por techo, y tratar eso como éxito pintaría "Siguiendo" sobre
      // algo que nadie está midiendo.
      const outcome = payload.outcomes?.find(item => item.keyword === keyword) ?? payload.outcomes?.[0]

      if (outcome?.status === 'tracked' || outcome?.status === 'already_tracked') {
        setTracked(current => new Set(current).add(keyword))
        setTrackingState(current => ({ ...current, [keyword]: 'success' }))
        setFeedback({
          severity: outcome.status === 'tracked' ? 'success' : 'info',
          message: (outcome.status === 'tracked' ? copy.follow.feedbackTracked : copy.follow.feedbackAlready).replace(
            '{keyword}',
            keyword
          )
        })

        return
      }

      setTrackingState(current => ({ ...current, [keyword]: 'error' }))
      setFeedback({
        severity: 'error',
        message:
          outcome?.status === 'capacity_exceeded'
            ? copy.follow.feedbackCapacity.replace('{keyword}', keyword).replace('{capacity}', String(capacity))
            : copy.follow.feedbackError.replace('{keyword}', keyword)
      })
    } catch (error) {
      setTrackingState(current => ({ ...current, [keyword]: 'error' }))
      setFeedback({
        severity: 'error',
        message: error instanceof Error ? error.message : copy.follow.feedbackError.replace('{keyword}', keyword)
      })
    }
  }

  /**
   * Space + ventana: el SUJETO de lo que la pantalla afirma.
   *
   * ⚠️ No se renderizan sueltos arriba. Sobre el fondo gris de la página eran dos cajas con
   * relleno propio flotando sin superficie — se veían sin colocar (hallazgo del operador
   * sobre el frame de 390px). Y darles una card propia habría dejado cinco cards apiladas,
   * que es card wallpaper. Viajan a la superficie principal, que es donde dicen la verdad
   * compositiva: el veredicto afirma "42 de 50 keywords compiten contra tu propio sitio", y
   * estos controles son el sujeto de esa frase.
   */
  const contextControls = (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={3}
      sx={{ inlineSize: { xs: '100%', md: 'auto' } }}
    >
      <CustomAutocomplete
        // El `id` va acá y no en el `renderInput`: Autocomplete deriva el id de su propio
        // input (y el `htmlFor` del label) de este prop, cayendo a `useId` si falta.
        id={SPACE_FIELD_ID}
        options={spaces}
        value={selectedSpace}
        disableClearable={false}
        getOptionLabel={(option: SeoSpaceOption | string) =>
          typeof option === 'string' ? option : option.organizationName
        }
        isOptionEqualToValue={(option: SeoSpaceOption, value: SeoSpaceOption) =>
          option.organizationId === value.organizationId
        }
        onChange={(_, value) => (value ? pushQuery({ space: (value as SeoSpaceOption).organizationId }) : undefined)}
        sx={{ minInlineSize: 200 }}
        renderInput={params => (
          <CustomTextField
            {...params}
            label={GH_GROWTH_SEO_OVERVIEW.toolbar.spaceLabel}
            placeholder={GH_GROWTH_SEO_OVERVIEW.toolbar.spacePlaceholder}
          />
        )}
      />

      {/* El motivo va en `title` y no en `helperText`: la línea de ayuda medía casi lo mismo
          que el propio control y era la que forzaba el wrap del header. */}
      <CustomTextField
        select
        id={WINDOW_FIELD_ID}
        label={copy.toolbar.windowLabel}
        value={String(windowDays)}
        title={copy.toolbar.windowHint}
        onChange={event => pushQuery({ window: Number(event.target.value) })}
        sx={{ minInlineSize: 170 }}
      >
        {Object.entries(copy.toolbar.windowOptions).map(([days, label]) => (
          <MenuItem key={days} value={days}>
            {label}
          </MenuItem>
        ))}
      </CustomTextField>
    </Stack>
  )

  /**
   * Frescura de la serie.
   *
   * 🔴 NO ES DECORACIÓN EN ESTE DOMINIO. Search Console no publica el día anterior y ajusta
   * sus métricas durante ~48h, así que una pantalla que muestra 28 días sin decir hasta
   * cuándo llegan los datos se lee como "hasta hoy". Sin fecha se dice que no hay; jamás se
   * infiere una.
   *
   * Comparte fila con el indicador de recarga: cuando el operador cambia de Space o de
   * ventana el servidor vuelve a leer, y sin señal la pantalla se queda con los datos
   * viejos como si nada estuviera pasando.
   */
  const contextMeta = (
    <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
      <Tooltip title={copy.toolbar.freshnessHint}>
        <Typography variant='caption' color='text.secondary'>
          {dataAsOf ? copy.toolbar.freshness.replace('{date}', dataAsOf) : copy.toolbar.freshnessUnknown}
        </Typography>
      </Tooltip>
      {isPending ? (
        <Stack direction='row' spacing={1} alignItems='center' role='status'>
          <CircularProgress size={12} thickness={6} />
          <Typography variant='caption' color='text.secondary'>
            {copy.toolbar.refreshing}
          </Typography>
        </Stack>
      ) : null}
    </Stack>
  )

  /**
   * Superficie de estado. Ya NO repite los controles: desde que el alcance vive en el plano
   * de cabecera, está presente en todos los estados por construcción — incluido un Space sin
   * Search Console, donde antes había que duplicarlos acá para no dejar al operador sin
   * forma de cambiar de Space.
   */
  const stateSurface = (marker: string, node: ReactNode) => (
    <Card data-capture={marker}>
      <CardContent>{node}</CardContent>
    </Card>
  )

  /**
   * Deja de seguir: el reverso del compromiso de gasto.
   *
   * Actualiza el set local sólo cuando el command confirma, igual que el alta. Un optimista
   * acá diría "ya no se sigue" sobre algo que el próximo ciclo va a seguir midiendo.
   */
  const handleUntrack = async (keyword: string) => {
    if (!seoTargetId) return

    setTrackingState(current => ({ ...current, [keyword]: 'loading' }))
    setFeedback(null)

    try {
      const response = await fetch(UNTRACK_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ seoTargetId, keywords: [keyword] })
      })

      await throwIfNotOk(response, copy.follow.feedbackUntrackError.replace('{keyword}', keyword))
      await response.json()

      setTracked(current => {
        const next = new Set(current)

        next.delete(keyword)

        return next
      })
      setTrackingState(current => ({ ...current, [keyword]: 'success' }))
      setFeedback({
        severity: 'success',
        message: copy.follow.feedbackUntracked.replace('{keyword}', keyword),
        // Dejar de seguir corta la serie y volver a seguirla NO recupera los días perdidos:
        // el histórico queda con un hueco permanente. Por eso hay reversa inmediata.
        undo: () => handleTrack(keyword)
      })
    } catch (error) {
      setTrackingState(current => ({ ...current, [keyword]: 'error' }))
      setFeedback({
        severity: 'error',
        message: error instanceof Error ? error.message : copy.follow.feedbackUntrackError.replace('{keyword}', keyword)
      })
    }
  }

  /**
   * Lote: un solo command con todas las seleccionadas.
   *
   * El command ya resuelve el techo por keyword y devuelve outcome por cada una, así que el
   * lote no necesita lógica propia — sólo contar lo que efectivamente entró y decirlo. Un
   * lote que reporte "listo" cuando la mitad rebotó contra el techo sería la misma mentira
   * que el 200 pelado, a mayor escala.
   */
  const handleTrackSelected = async (inScope: string[]) => {
    if (!seoTargetId || inScope.length === 0) return

    const keywords = inScope

    setBulkState('loading')
    setFeedback(null)

    try {
      const response = await fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ seoTargetId, keywords })
      })

      await throwIfNotOk(response, copy.follow.feedbackError.replace('{keyword}', keywords[0]))

      const payload = (await response.json()) as { outcomes?: SeoKeywordTrackOutcome[] }
      const outcomes = payload.outcomes ?? []
      const landed = outcomes.filter(o => o.status === 'tracked' || o.status === 'already_tracked')

      setTracked(current => {
        const next = new Set(current)

        for (const outcome of landed) next.add(outcome.keyword)

        return next
      })
      setSelected(new Set())
      setBulkState('success')
      setFeedback({
        severity: landed.length === keywords.length ? 'success' : 'info',
        message: copy.follow.feedbackBulk
          .replace('{tracked}', String(landed.length))
          .replace('{requested}', String(keywords.length))
      })
    } catch (error) {
      setBulkState('error')
      setFeedback({
        severity: 'error',
        message: error instanceof Error ? error.message : copy.follow.feedbackError.replace('{keyword}', keywords[0])
      })
    }
  }

  const toggleSelected = (keyword: string) =>
    setSelected(current => {
      const next = new Set(current)

      if (next.has(keyword)) next.delete(keyword)
      else next.add(keyword)

      return next
    })

  const selectPage = (keywords: string[], select: boolean) =>
    setSelected(current => {
      const next = new Set(current)

      for (const keyword of keywords) {
        if (select) next.add(keyword)
        else next.delete(keyword)
      }

      return next
    })

  /**
   * Export de lo que se está viendo, con los filtros aplicados.
   *
   * El trabajo de consolidar 42 URLs no ocurre en el portal: ocurre en un ticket, un SOW o
   * un mail al cliente. Sin salida del dato, la única opción era copiar a mano. Exporta el
   * SUBCONJUNTO filtrado y no el total — lo que ves es lo que te llevas.
   */
  const exportCsv = () => {
    const header = [
      copy.table.colKeyword,
      copy.table.page,
      copy.action.label,
      copy.table.colPosition,
      copy.table.colImpressions,
      copy.table.colClicks,
      copy.table.colCtr,
      copy.table.colGain,
      copy.table.colConflict,
      copy.follow.following
    ]

    const actionLabel: Record<KeywordAction, string> = {
      quickWin: copy.action.quickWinShort,
      striking: copy.action.strikingShort,
      cannibalized: copy.action.cannibalizedShort
    }

    // Comillas dobladas y campo entrecomillado: una keyword con coma o comilla rompería el
    // CSV en la hoja de cálculo del cliente, que es donde nadie lo vería hasta que importa.
    const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`

    const lines = [
      header.map(cell).join(','),
      ...filtered.map(row =>
        [
          row.keyword,
          row.page,
          actionLabel[resolveKeywordAction(row)],
          row.position.toFixed(1),
          row.impressions,
          row.clicks,
          (row.ctr * 100).toFixed(2),
          row.estimatedClickGain,
          row.competingPages,
          tracked.has(row.keyword) ? 'si' : 'no'
        ]
          .map(cell)
          .join(',')
      )
    ]

    // BOM: sin él Excel abre el CSV en latin-1 y rompe cada tilde y cada ñ.
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${copy.table.exportFilename}-${rootDomain ?? 'space'}-${windowDays}d.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  /** Puente al nodo S2: la misma keyword, su película en el tiempo. */
  const drillToPerformance = (keyword: string) => {
    const params = new URLSearchParams()

    if (selectedSpaceId) params.set('space', selectedSpaceId)
    params.set('keywords', encodeURIComponent(keyword))

    startTransition(() => {
      router.push(`/admin/growth/seo/performance?${params.toString()}`)
    })
  }

  /**
   * Chrome de la pantalla, en el patrón CANÓNICO del módulo (coherencia entre las tres
   * pestañas de Search Visibility): `WorkbenchHeader kind='report'` en la región `header`
   * de la recipe, con el ALCANCE (Space + ventana + frescura) dentro del mismo plano.
   *
   * ⚠️ Antes estos controles vivían DENTRO del veredicto. Resolvía bien el problema que los
   * originó (sueltos sobre el lienzo se veían sin colocar) pero dejaba dos consecuencias: el
   * alcance de la pantalla quedaba subordinado a una card de contenido, y las tres pestañas
   * hermanas —que comparten breadcrumb, título y tabs— presentaban su alcance en tres
   * lugares distintos. El plano de cabecera lo resuelve para las tres por igual, y además
   * los controles quedan disponibles SIEMPRE, también en los estados sin datos (que era la
   * razón por la que antes había que repetirlos dentro de cada superficie de estado).
   */
  const header = (
    <Stack spacing={4}>
      {/* Sin hrefs (misma convención del Overview y Rendimiento): "Growth" es un grupo de
          menú, y la navegación a las hermanas ES la barra de tabs del propio header. */}
      <GreenhouseBreadcrumbs
        items={[
          { label: GH_INTERNAL_NAV.growth.label },
          { label: GH_GROWTH_SEO_OVERVIEW.breadcrumbSection },
          { label: GH_INTERNAL_NAV.growthSeoKeywords.label }
        ]}
      />

      <WorkbenchHeader
        kind='report'
        titleComponent='h1'
        dataCapture='seo-keywords-toolbar'
        title={copy.pageTitle}
        description={copy.pageSubtitle}
        meta={contextMeta}
        secondaryActions={contextControls}
        supporting={
          <Box data-capture='seo-keywords-tabs'>
            <SeoSearchVisibilityTabs activeTab='keywords' spaceId={selectedSpaceId} />
          </Box>
        }
      />
    </Stack>
  )

  const renderBody = () => {
    // Sin ningún Space con el módulo contratado: condición de negocio, no error.
    if (spaces.length === 0 || !selectedSpace) {
      return (
        <Box data-capture='seo-keywords-denied'>
          <EmptyState
            icon='tabler-lock'
            title={copy.states.denied.title}
            description={copy.states.denied.description}
            // Un estado bloqueado lleva CAMINO, no una instrucción de texto.
            action={
              <Button variant='outlined' href='/admin/growth/seo'>
                {copy.states.denied.cta}
              </Button>
            }
          />
        </Box>
      )
    }

    // Sin Search Console no hay demanda medida: mostrar ceros sería mentir.
    if (connectionState === 'not_connected') {
      return stateSurface(
          'seo-keywords-empty',
          <EmptyState
            icon='tabler-plug-connected-x'
            title={copy.states.emptyNoGsc.title}
            description={copy.states.emptyNoGsc.description}
            action={
              canConnectSearchConsole ? (
                <Button
                  variant='contained'
                  href={`/api/admin/growth/search-console/oauth/start?organizationId=${encodeURIComponent(
                    selectedSpace.organizationId
                  )}`}
                >
                  {copy.states.emptyNoGsc.cta}
                </Button>
              ) : undefined
            }
          />
      )
    }

    if (connectionState === 'no_snapshots') {
      return stateSurface(
          'seo-keywords-empty',
          <EmptyState
            icon='tabler-clock-pause'
            title={copy.states.emptyNoSnapshots.title}
            description={copy.states.emptyNoSnapshots.description}
          />
      )
    }

    if (!opportunities || !opportunities.ok) {
      // ⚠️ REINTENTAR NO RESUELVE UN ERROR ESTRUCTURAL. `target_not_found` significa que el
      // Space no tiene sitio SEO configurado: ofrecer el botón mandaría al operador a
      // reintentar en vano y le escondería la acción real, que es pedir la configuración.
      // Es el mismo criterio `actionable` del contrato canónico de errores del repo.
      const isStructural = Boolean(opportunities && !opportunities.ok && opportunities.errorCode === 'target_not_found')

      return stateSurface(
        'seo-keywords-error',
        <EmptyState
          icon={isStructural ? 'tabler-settings-off' : 'tabler-alert-triangle'}
          title={isStructural ? copy.states.errorStructural.title : copy.states.error.title}
          description={isStructural ? copy.states.errorStructural.description : copy.states.error.description}
          action={
            isStructural ? undefined : (
              <Button variant='outlined' disabled={isPending} onClick={() => startTransition(() => router.refresh())}>
                {copy.states.error.cta}
              </Button>
            )
          }
        />
      )
    }

    if (rows.length === 0) {
      return stateSurface(
          'seo-keywords-empty',
          <EmptyState
            icon='tabler-search'
            title={copy.states.emptyNoOpportunities.title}
            description={copy.states.emptyNoOpportunities.description.replace(
              '{domain}',
              rootDomain ?? selectedSpace.organizationName
            )}
          />
      )
    }

    return (
      <Stack spacing={6}>
        <KeywordOpportunityVerdict
          // El veredicto describe el CONJUNTO, no el filtro: sus contadores son la leyenda
          // y el filtro a la vez, así que tienen que seguir contando el total aunque el
          // usuario esté viendo un subconjunto.
          opportunities={rows}
          filteredCount={filtered.length}
          activeAction={actionFilter}
          onActionChange={setActionFilter}
        />

        <KeywordOpportunityMap
          opportunities={filtered}
          impressionsThreshold={opportunities.impressionsThreshold}
          marketUnavailable={opportunities.market === 'unavailable'}
          positionRange={
            positionFilter === 'firstPage'
              ? { min: 8, max: 10 }
              : positionFilter === 'secondPage'
                ? { min: 10, max: 20 }
                : undefined
          }
          hoveredKeyword={hoveredKeyword}
          onHoverKeyword={setHoveredKeyword}
        />

        {/* Los filtros viven en su propia superficie, no sueltos sobre el fondo de la
            página. Dos razones, y la segunda la destapó el GVC: (a) composición — mapa,
            filtros y tabla son tres superficies hermanas y consistentes; (b) 🔴 el label
            ENFOCADO de un CustomTextField usa `primary.main`, que sobre el fondo del body
            (#f8f7fa) da 4.42:1 y FALLA AA — sobre el papel de una Card da 4.61:1 y pasa.
            El probe de teclado del GVC lo encontró; a simple vista era invisible. */}
        <Card
          data-capture='seo-keywords-filters'
          // Focus ring EXPLÍCITO para todo control del bloque de filtros: el theme no dibuja
          // outline en focus, y estos controles son el contrato de teclado de la pantalla
          // (mismo hallazgo y mismo remedio que el toggle del chart en TASK-1307). Se cubre
          // también `:focus` plano porque un foco programático — como el del probe del GVC —
          // no dispara la heurística `focus-visible` del navegador.
          sx={{
            '& :is(input, button, [role="combobox"], .MuiSelect-select)': {
              '&.Mui-focusVisible, &:focus-visible, &:focus': {
                outline: theme => `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2
              }
            }
          }}
        >
          <CardContent>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            alignItems={{ md: 'center' }}
            flexWrap='wrap'
            useFlexGap
          >
            <DebouncedInput
              id={SEARCH_FIELD_ID}
              value={search}
              onChange={value => setSearch(String(value))}
              placeholder={copy.toolbar.searchPlaceholder}
              label={copy.toolbar.searchLabel}
              sx={{ minInlineSize: 220 }}
            />

            <CustomTextField
              select
              id={POSITION_FIELD_ID}
              label={copy.filters.positionLabel}
              value={positionFilter}
              onChange={event => setPositionFilter(event.target.value as PositionFilter)}
              sx={{ minInlineSize: 200 }}
            >
              <MenuItem value='all'>{copy.filters.positionAll}</MenuItem>
              <MenuItem value='firstPage'>{copy.filters.positionFirstPage}</MenuItem>
              <MenuItem value='secondPage'>{copy.filters.positionSecondPage}</MenuItem>
            </CustomTextField>

            <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
              {/* `role=status`: el conteo cambiaba de 50 a 8 en silencio para un lector de
                  pantalla, que es justo la señal de que el filtro hizo algo. */}
              <Typography
                variant='caption'
                color='text.secondary'
                role='status'
                aria-label={copy.filters.resultAnnounce.replace('{count}', String(filtered.length))}
              >
                {copy.filters.resultCount
                  .replace('{count}', String(filtered.length))
                  .replace('{total}', String(rows.length))}
              </Typography>

              <Tooltip title={copy.table.exportHint}>
                <Button size='small' variant='text' startIcon={<i className='tabler-download' />} onClick={exportCsv}>
                  {copy.table.export}
                </Button>
              </Tooltip>
              {hasActiveFilters ? (
                <Button size='small' variant='text' onClick={clearFilters}>
                  {copy.filters.clear}
                </Button>
              ) : null}
            </Stack>
          </Stack>

          {/* El cupo se dice SIEMPRE, no sólo al chocar el techo: seguir una keyword la mete
              al ciclo de gasto diario, y quien decide tiene que ver cuánto le queda. */}
          {canTrackKeywords ? (
            <Typography variant='caption' color={atCapacity ? 'error.main' : 'text.secondary'}>
              {copy.follow.capacity
                .replace('{used}', String(tracked.size))
                .replace('{capacity}', String(capacity))}
              {atCapacity ? ` · ${copy.follow.capacityFullHint}` : ''}
            </Typography>
          ) : null}
        </Stack>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Box data-capture='seo-keywords-empty'>
            <EmptyState
              icon='tabler-filter-off'
              title={copy.states.emptyFiltered.title}
              description={copy.states.emptyFiltered.description}
              action={
                <Button variant='outlined' onClick={clearFilters}>
                  {copy.states.emptyFiltered.cta}
                </Button>
              }
            />
          </Box>
        ) : (
          <KeywordOpportunityTable
            opportunities={filtered}
            trackedKeywords={tracked}
            canTrack={canTrackKeywords && Boolean(seoTargetId)}
            atCapacity={atCapacity}
            trackingState={trackingState}
            onTrack={handleTrack}
            onUntrack={handleUntrack}
            onDrill={drillToPerformance}
            selected={selected}
            onToggleSelected={toggleSelected}
            onSelectPage={selectPage}
            marketUnavailable={opportunities.market === 'unavailable'}
            hoveredKeyword={hoveredKeyword}
            onHoverKeyword={setHoveredKeyword}
            onTrackSelected={handleTrackSelected}
            onClearSelection={() => setSelected(new Set())}
            bulkState={bulkState}
          />
        )}
      </Stack>
    )
  }

  return (
    // Recipe canónica `analyticsReport` (composición `single`). `plane='none'`: el contenido
    // primario ES una composición de cards (mapa + filtros + tabla); el plane contenido de
    // la recipe fabricaría card-on-card.
    <>
    <SurfaceRecipe
      kind='analyticsReport'
      instanceId='seo-keywords'
      plane='none'
      header={header}
      regions={{ primary: renderBody() }}
    />

    {/* `role=status` + aria-live: el resultado se anuncia, no sólo se pinta. Anclado abajo
        para que quede junto a la acción que lo produjo, no a 2.000px de scroll. */}
    <Snackbar
      open={Boolean(feedback)}
      autoHideDuration={feedback?.undo ? 8000 : 5000}
      onClose={() => setFeedback(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      data-capture='seo-keywords-feedback'
    >
      <Alert
        severity={feedback?.severity ?? 'info'}
        role='status'
        variant='filled'
        onClose={() => setFeedback(null)}
        action={
          feedback?.undo ? (
            <Button
              color='inherit'
              size='small'
              onClick={() => {
                feedback.undo?.()
                setFeedback(null)
              }}
            >
              {copy.follow.undo}
            </Button>
          ) : undefined
        }
      >
        {feedback?.message}
      </Alert>
    </Snackbar>
    </>
  )
}

export default KeywordOpportunitiesView
