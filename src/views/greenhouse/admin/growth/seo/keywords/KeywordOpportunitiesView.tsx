'use client'

import { useMemo, useState, useTransition } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomAutocomplete from '@core/components/mui/Autocomplete'
import CustomTextField from '@core/components/mui/TextField'

import DebouncedInput from '@/components/DebouncedInput'
import EmptyState from '@/components/greenhouse/EmptyState'
import { GreenhouseBreadcrumbs, GreenhouseChip } from '@/components/greenhouse/primitives'
import type { GreenhouseAsyncActionState } from '@/components/greenhouse/primitives/GreenhouseAsyncActionButton'
import SurfaceRecipe from '@/components/greenhouse/primitives/surface-system/SurfaceRecipe'
import { GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'
import { throwIfNotOk } from '@/lib/api/parse-error-response'
import { GH_GROWTH_SEO_KEYWORDS, GH_GROWTH_SEO_OVERVIEW } from '@/lib/copy/growth'
import type { KeywordOpportunitiesResult, SeoKeywordTrackOutcome } from '@/lib/growth/seo/contracts'
import type { SeoSpaceOption } from '@/lib/growth/seo/overview/list-seo-spaces'
import type { SeoConnectionState } from '@/views/greenhouse/admin/growth/seo/overview/SeoOverviewView'

import SeoSearchVisibilityTabs from '../overview/SeoSearchVisibilityTabs'
import KeywordOpportunityMap from './KeywordOpportunityMap'
import KeywordOpportunityTable from './KeywordOpportunityTable'
import { KEYWORD_ACTION_ORDER, resolveKeywordAction, type KeywordAction } from './keyword-opportunity-action'

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

type PositionFilter = 'all' | 'firstPage' | 'secondPage'

export interface KeywordOpportunitiesViewProps {
  spaces: SeoSpaceOption[]
  selectedSpaceId: string | null
  seoTargetId?: string
  rootDomain: string | null
  connectionState: SeoConnectionState
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
  seoTargetId,
  rootDomain,
  connectionState,
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

  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<KeywordAction | 'all'>('all')
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all')

  const [tracked, setTracked] = useState<Set<string>>(() => new Set(trackedKeywords))
  const [trackingState, setTrackingState] = useState<Record<string, GreenhouseAsyncActionState>>({})
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'info' | 'error'; message: string } | null>(null)

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

  const header = (
    <Stack spacing={4}>
      {/* Sin hrefs (misma convención del Overview y Rendimiento): "Growth" es un grupo de
          menú, y la navegación a las hermanas ES la barra de tabs de abajo. */}
      <GreenhouseBreadcrumbs
        items={[
          { label: GH_INTERNAL_NAV.growth.label },
          { label: GH_GROWTH_SEO_OVERVIEW.breadcrumbSection },
          { label: GH_INTERNAL_NAV.growthSeoKeywords.label }
        ]}
      />

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        justifyContent='space-between'
        alignItems={{ xs: 'flex-start', md: 'flex-end' }}
        data-capture='seo-keywords-toolbar'
      >
        <Stack spacing={1}>
          {/* `surfaceHeroTitle` (SoT tipográfico): el token del titular primario de una
              surface full-page. `component='h1'`: el único h1 (mapa y tabla son h2). */}
          <Typography variant='surfaceHeroTitle' component='h1'>
            {copy.pageTitle}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {copy.pageSubtitle}
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }} flexWrap='wrap' useFlexGap>
          <CustomAutocomplete
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
            sx={{ minInlineSize: 220 }}
            renderInput={params => (
              <CustomTextField
                {...params}
                label={GH_GROWTH_SEO_OVERVIEW.toolbar.spaceLabel}
                placeholder={GH_GROWTH_SEO_OVERVIEW.toolbar.spacePlaceholder}
              />
            )}
          />

          {/* El motivo va como `helperText` y no como tooltip: la ventana define sobre qué
              se ponderó la posición, y un tooltip se esconde justo al abrirlo. */}
          <CustomTextField
            select
            label={copy.toolbar.windowLabel}
            value={String(windowDays)}
            helperText={copy.toolbar.windowHint}
            onChange={event => pushQuery({ window: Number(event.target.value) })}
            sx={{ minInlineSize: 180 }}
          >
            {Object.entries(copy.toolbar.windowOptions).map(([days, label]) => (
              <MenuItem key={days} value={days}>
                {label}
              </MenuItem>
            ))}
          </CustomTextField>
        </Stack>
      </Stack>

      <Box data-capture='seo-keywords-tabs'>
        <SeoSearchVisibilityTabs activeTab='keywords' spaceId={selectedSpaceId} />
      </Box>

      {/* Leyenda de origen. Acá el contraste es el punto: TODO lo de esta pantalla está
          medido, y el chip de "estimado" queda apagado porque ese dato no existe todavía —
          decirlo es más honesto que ocultar la dimensión entera. */}
      <Stack direction='row' spacing={2} alignItems='center' aria-label={copy.source.ariaLabel} flexWrap='wrap' useFlexGap>
        <Tooltip title={copy.source.measuredHint}>
          <span>
            <GreenhouseChip kind='metric' variant='solid' size='small' label={`● ${copy.source.measured}`} />
          </span>
        </Tooltip>
        <Tooltip title={copy.source.estimatedHint}>
          <span>
            <GreenhouseChip kind='metric' variant='label' size='small' label={`◑ ${copy.source.estimated}`} />
          </span>
        </Tooltip>
        <Typography variant='caption' color='text.secondary'>
          {copy.source.mixHint}
        </Typography>
      </Stack>
    </Stack>
  )

  const renderBody = () => {
    // Sin ningún Space con el módulo contratado: condición de negocio, no error.
    if (spaces.length === 0 || !selectedSpace) {
      return (
        <Box data-capture='seo-keywords-denied'>
          <EmptyState icon='tabler-lock' title={copy.states.denied.title} description={copy.states.denied.description} />
        </Box>
      )
    }

    // Sin Search Console no hay demanda medida: mostrar ceros sería mentir.
    if (connectionState === 'not_connected') {
      return (
        <Box data-capture='seo-keywords-empty'>
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
        </Box>
      )
    }

    if (connectionState === 'no_snapshots') {
      return (
        <Box data-capture='seo-keywords-empty'>
          <EmptyState
            icon='tabler-clock-pause'
            title={copy.states.emptyNoSnapshots.title}
            description={copy.states.emptyNoSnapshots.description}
          />
        </Box>
      )
    }

    if (!opportunities || !opportunities.ok) {
      return (
        <Box data-capture='seo-keywords-error'>
          <EmptyState
            icon='tabler-alert-triangle'
            title={copy.states.error.title}
            description={copy.states.error.description}
            action={
              // Sólo se ofrece reintentar cuando reintentar puede resolverlo.
              <Button variant='outlined' disabled={isPending} onClick={() => startTransition(() => router.refresh())}>
                {copy.states.error.cta}
              </Button>
            }
          />
        </Box>
      )
    }

    if (rows.length === 0) {
      return (
        <Box data-capture='seo-keywords-empty'>
          <EmptyState
            icon='tabler-search'
            title={copy.states.emptyNoOpportunities.title}
            description={copy.states.emptyNoOpportunities.description.replace(
              '{domain}',
              rootDomain ?? selectedSpace.organizationName
            )}
          />
        </Box>
      )
    }

    return (
      <Stack spacing={6}>
        {/* Degradación honesta del enriquecimiento: se NOMBRA lo que falta y por qué la
            priorización no lo necesita, en vez de dejar dos columnas mudas. */}
        {opportunities.market === 'unavailable' ? (
          <Alert
            severity='info'
            data-capture='seo-keywords-degraded'
            sx={{ '& .MuiAlert-message': { color: 'text.primary' } }}
          >
            <AlertTitle>{copy.states.marketUnavailable.title}</AlertTitle>
            {copy.states.marketUnavailable.description}
          </Alert>
        ) : null}

        {feedback ? (
          // `role=status` + aria-live: el resultado de "Seguir" se anuncia, no sólo se pinta.
          <Alert
            severity={feedback.severity}
            role='status'
            data-capture='seo-keywords-feedback'
            onClose={() => setFeedback(null)}
            sx={{ '& .MuiAlert-message': { color: 'text.primary' } }}
          >
            {feedback.message}
          </Alert>
        ) : null}

        <KeywordOpportunityMap
          opportunities={filtered}
          impressionsThreshold={opportunities.impressionsThreshold}
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
              value={search}
              onChange={value => setSearch(String(value))}
              placeholder={copy.toolbar.searchPlaceholder}
              label={copy.toolbar.searchLabel}
              sx={{ minInlineSize: 220 }}
            />

            <CustomTextField
              select
              label={copy.action.label}
              value={actionFilter}
              onChange={event => setActionFilter(event.target.value as KeywordAction | 'all')}
              sx={{ minInlineSize: 200 }}
            >
              <MenuItem value='all'>{copy.filters.actionAll}</MenuItem>
              {KEYWORD_ACTION_ORDER.map(action => (
                <MenuItem key={action} value={action}>
                  {action === 'quickWin'
                    ? copy.action.quickWin
                    : action === 'striking'
                      ? copy.action.striking
                      : copy.action.cannibalized}
                </MenuItem>
              ))}
            </CustomTextField>

            <CustomTextField
              select
              label={copy.filters.positionLabel}
              value={positionFilter}
              onChange={event => setPositionFilter(event.target.value as PositionFilter)}
              sx={{ minInlineSize: 200 }}
            >
              <MenuItem value='all'>{copy.filters.positionAll}</MenuItem>
              <MenuItem value='firstPage'>{copy.filters.positionFirstPage}</MenuItem>
              <MenuItem value='secondPage'>{copy.filters.positionSecondPage}</MenuItem>
            </CustomTextField>

            <Stack direction='row' spacing={2} alignItems='center'>
              <Typography variant='caption' color='text.secondary'>
                {copy.filters.resultCount
                  .replace('{count}', String(filtered.length))
                  .replace('{total}', String(rows.length))}
              </Typography>
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
          />
        )}
      </Stack>
    )
  }

  return (
    // Recipe canónica `analyticsReport` (composición `single`). `plane='none'`: el contenido
    // primario ES una composición de cards (mapa + filtros + tabla); el plane contenido de
    // la recipe fabricaría card-on-card.
    <SurfaceRecipe
      kind='analyticsReport'
      instanceId='seo-keywords'
      plane='none'
      regions={{
        primary: (
          <Stack spacing={6}>
            {header}
            {renderBody()}
          </Stack>
        )
      }}
    />
  )
}

export default KeywordOpportunitiesView
