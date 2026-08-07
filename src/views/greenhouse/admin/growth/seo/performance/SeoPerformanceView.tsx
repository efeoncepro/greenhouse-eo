'use client'

import { useTransition } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomAutocomplete from '@core/components/mui/Autocomplete'
import CustomTextField from '@core/components/mui/TextField'

import EmptyState from '@/components/greenhouse/EmptyState'
import { GreenhouseBreadcrumbs, GreenhouseChip } from '@/components/greenhouse/primitives'
import CompositionShell from '@/components/greenhouse/primitives/composition-shell/CompositionShell'
import { GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'
import { GH_GROWTH_SEO_PERFORMANCE, GH_GROWTH_SEO_OVERVIEW } from '@/lib/copy/growth'
import type {
  SeoPerformanceCatalogItem,
  SeoPerformanceMetric,
  SeoPerformanceMode,
  SeoPerformanceResult,
  SeoRankDevice
} from '@/lib/growth/seo/contracts'
import type { SeoSpaceOption } from '@/lib/growth/seo/overview/list-seo-spaces'
import type { SeoConnectionState } from '@/views/greenhouse/admin/growth/seo/overview/SeoOverviewView'

import SeoSearchVisibilityTabs from '../overview/SeoSearchVisibilityTabs'
import SeoPerformanceKpiBand from './SeoPerformanceKpiBand'
import SeoPerformanceTable from './SeoPerformanceTable'
import SeoRankEvolutionChart from './SeoRankEvolutionChart'
import SeoSetSelector from './SeoSetSelector'

/**
 * TASK-1307 — la pantalla ancla del módulo SEO (§10.3).
 *
 * Cliente PURO: no calcula métricas ni decide acceso. El servidor ya resolvió el guard de
 * tres puertas, los Spaces elegibles y la lectura; acá se pinta y se navega.
 *
 * ⚠️ TODO el estado de la vista vive en la URL (`?space=`, `?urls=`/`?keywords=`,
 * `?metric=`, `?device=`, `?range=`). No es preferencia de estilo: es lo que hace que el
 * enlace sea compartible (el caso de uso comercial de esta pantalla es MANDARLE el gráfico
 * a alguien), que el back/forward del browser funcione, y que cada cambio vuelva a pasar
 * por la revalidación server-side del `module_assignment`.
 *
 * Composición vertical del concepto aprobado: toolbar → tabs → selector → banda KPI →
 * chart hero → tabla de detalle.
 */

/** Espejo del techo del server: el chart deja de ser legible más allá de 8 series. */
const MAX_COMPARED_ITEMS = 8

export interface SeoPerformanceViewProps {
  spaces: SeoSpaceOption[]
  selectedSpaceId: string | null
  connectionState: SeoConnectionState
  dataAsOf: string | null
  canConnectSearchConsole: boolean
  mode: SeoPerformanceMode
  metric: SeoPerformanceMetric
  device: SeoRankDevice
  rangeDays: number
  items: string[]
  catalog: SeoPerformanceCatalogItem[]
  /** `null` = todavía no se pidió (sin set elegido o sin conexión). */
  performance: SeoPerformanceResult | null
}

const SeoPerformanceView = ({
  spaces,
  selectedSpaceId,
  connectionState,
  dataAsOf,
  canConnectSearchConsole,
  mode,
  metric,
  device,
  rangeDays,
  items,
  catalog,
  performance
}: SeoPerformanceViewProps) => {
  const router = useRouter()

  // El re-fetch lo hace el SERVER (la navegación revalida el module_assignment), así que el
  // pending real es el de la transición de router; un flag local mentiría sobre cuándo terminó.
  const [isPending, startTransition] = useTransition()

  const copy = GH_GROWTH_SEO_PERFORMANCE
  const selectedSpace = spaces.find(space => space.organizationId === selectedSpaceId) ?? null

  const pushQuery = (next: {
    space?: string
    mode?: SeoPerformanceMode
    items?: string[]
    metric?: SeoPerformanceMetric
    device?: SeoRankDevice
    range?: number
  }) => {
    const params = new URLSearchParams()
    const space = next.space ?? selectedSpaceId
    const nextMode = next.mode ?? mode
    const nextItems = next.items ?? items

    if (space) {
      params.set('space', space)
    }

    if (nextItems.length > 0) {
      // El modo NO viaja como parámetro propio: lo dice cuál de las dos claves está
      // presente. Un `?mode=` aparte podría contradecir al set y volver el enlace ambiguo.
      params.set(nextMode === 'url' ? 'urls' : 'keywords', nextItems.map(encodeURIComponent).join(','))
    }

    params.set('metric', next.metric ?? metric)
    params.set('device', next.device ?? device)
    params.set('range', String(next.range ?? rangeDays))

    startTransition(() => {
      router.push(`/admin/growth/seo/performance?${params.toString()}`)
    })
  }

  // Cambiar de eje LIMPIA el set: una URL no es una keyword, y arrastrar los ítems daría un
  // conjunto que no matchea nada — un vacío que se leería como bug.
  const handleModeChange = (nextMode: SeoPerformanceMode) => pushQuery({ mode: nextMode, items: [] })

  const header = (
    <Stack spacing={4}>
      {/* "Growth" es un grupo de menú, no una ruta: va sin href para no prometer una
          página que no existe. */}
      <GreenhouseBreadcrumbs
        items={[
          { label: GH_INTERNAL_NAV.growth.label },
          { label: GH_GROWTH_SEO_OVERVIEW.breadcrumbSection, href: '/admin/growth/seo' },
          { label: GH_INTERNAL_NAV.growthSeoPerformance.label }
        ]}
      />

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        justifyContent='space-between'
        alignItems={{ xs: 'flex-start', md: 'flex-end' }}
        data-capture='seo-performance-toolbar'
      >
        <Stack spacing={1}>
          <Typography variant='h4'>{copy.pageTitle}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {copy.pageSubtitle}
          </Typography>
        </Stack>

        {/* `wrap` + useFlexGap: con 4 controles la fila se queda sin ancho en 1440 y el
            chip de frescura terminaba truncado ("Datos hasta 2026-08…" cortado, hallazgo
            del GVC) — envolver es honesto, apretar recorta información. */}
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
            // Cambiar de Space limpia el set: las URLs y keywords de un Space no existen
            // en otro, así que conservarlas daría un vacío inexplicable.
            onChange={(_, value) =>
              value ? pushQuery({ space: (value as SeoSpaceOption).organizationId, items: [] }) : undefined
            }
            sx={{ minInlineSize: 220 }}
            renderInput={params => (
              <CustomTextField
                {...params}
                label={GH_GROWTH_SEO_OVERVIEW.toolbar.spaceLabel}
                placeholder={GH_GROWTH_SEO_OVERVIEW.toolbar.spacePlaceholder}
              />
            )}
          />

          <CustomTextField
            select
            label={copy.toolbar.rangeLabel}
            value={String(rangeDays)}
            onChange={event => pushQuery({ range: Number(event.target.value) })}
            sx={{ minInlineSize: 160 }}
          >
            {Object.entries(copy.toolbar.rangeOptions).map(([days, label]) => (
              <MenuItem key={days} value={days}>
                {label}
              </MenuItem>
            ))}
          </CustomTextField>

          {/* El motivo del selector va como `helperText` y NO como tooltip: un tooltip
              sobre un control de formulario se esconde justo cuando el usuario lo abre, y
              acá el dato importa (móvil y escritorio devuelven SERPs distintas). */}
          <CustomTextField
            select
            label={copy.toolbar.deviceLabel}
            value={device}
            helperText={copy.toolbar.deviceHint}
            onChange={event => pushQuery({ device: event.target.value as SeoRankDevice })}
            sx={{ minInlineSize: 160 }}
          >
            {Object.entries(copy.toolbar.deviceOptions).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </CustomTextField>

          {/* Frescura explícita: hay que poder distinguir "no pasó nada" de "el dato es
              viejo". Sin fecha se dice que no hay, no se inventa "hoy". */}
          <GreenhouseChip
            kind='metric'
            variant='label'
            size='small'
            label={
              dataAsOf
                ? copy.toolbar.freshness.replace('{date}', dataAsOf)
                : copy.toolbar.freshnessUnknown
            }
          />
        </Stack>
      </Stack>

      <Box data-capture='seo-performance-tabs'>
        <SeoSearchVisibilityTabs activeTab='performance' spaceId={selectedSpaceId} />
      </Box>

      {/* Leyenda de origen: la fuente vigente se marca, para que el operador no confunda
          la posición exacta del proveedor con la posición promedio medida por Google. */}
      <Stack direction='row' spacing={2} alignItems='center' aria-label={copy.source.ariaLabel} flexWrap='wrap' useFlexGap>
        <Tooltip title={copy.source.measuredHint}>
          <span>
            <GreenhouseChip
              kind='metric'
              variant={performance?.ok && performance.source === 'gsc_measured' ? 'solid' : 'label'}
              size='small'
              label={`● ${copy.source.measured}`}
            />
          </span>
        </Tooltip>
        <Tooltip title={copy.source.estimatedHint}>
          <span>
            <GreenhouseChip
              kind='metric'
              variant={performance?.ok && performance.source === 'dataforseo_estimated' ? 'solid' : 'label'}
              size='small'
              label={`◑ ${copy.source.estimated}`}
            />
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
        <Box data-capture='seo-performance-denied'>
          <EmptyState
            icon='tabler-lock'
            title={copy.states.denied.title}
            description={copy.states.denied.description}
          />
        </Box>
      )
    }

    // Sin Search Console no hay verdad medida: mostrar ceros sería mentir.
    if (connectionState === 'not_connected') {
      return (
        <Box data-capture='seo-performance-empty-nogsc'>
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
        <Box data-capture='seo-performance-empty-nogsc'>
          <EmptyState
            icon='tabler-clock-pause'
            title={copy.states.emptyNoSnapshots.title}
            description={copy.states.emptyNoSnapshots.description}
          />
        </Box>
      )
    }

    const selector = (
      <SeoSetSelector
        mode={mode}
        items={items}
        catalog={catalog}
        maxItems={MAX_COMPARED_ITEMS}
        onModeChange={handleModeChange}
        onItemsChange={next => pushQuery({ items: next })}
      />
    )

    // Estado inicial legítimo del flujo — el selector queda visible y el empty apunta a él.
    if (items.length === 0) {
      return (
        <Stack spacing={6}>
          {selector}
          <Box data-capture='seo-performance-empty-noset'>
            <EmptyState
              icon='tabler-chart-line'
              title={copy.states.emptyNoSet.title}
              description={copy.states.emptyNoSet.description.replace('{max}', String(MAX_COMPARED_ITEMS))}
            />
          </Box>
        </Stack>
      )
    }

    if (!performance || !performance.ok) {
      const errorCode = performance && !performance.ok ? performance.errorCode : 'query_failed'
      // `no_data`/`no_items` son estados del filtro (accionables cambiando la selección);
      // el resto es una falla de lectura, y sólo ésa ofrece "Reintentar".
      const isFilteredEmpty = errorCode === 'no_data' || errorCode === 'no_items'

      return (
        <Stack spacing={6}>
          {selector}
          <Box data-capture={isFilteredEmpty ? 'seo-performance-empty-nodata' : 'seo-performance-error'}>
            <EmptyState
              icon={isFilteredEmpty ? 'tabler-filter-off' : 'tabler-alert-triangle'}
              title={
                isFilteredEmpty
                  ? copy.states.emptyNoData.title.replace(
                      '{range}',
                      copy.toolbar.rangeOptions[String(rangeDays) as keyof typeof copy.toolbar.rangeOptions] ?? ''
                    )
                  : copy.states.error.title
              }
              description={isFilteredEmpty ? copy.states.emptyNoData.description : copy.states.error.description}
              action={
                isFilteredEmpty ? undefined : (
                  // Sólo se ofrece reintentar cuando reintentar puede resolverlo.
                  <Button variant='outlined' disabled={isPending} onClick={() => startTransition(() => router.refresh())}>
                    {copy.states.error.cta}
                  </Button>
                )
              }
            />
          </Box>
        </Stack>
      )
    }

    const sparseItems = performance.series.filter(serie => serie.sparse).map(serie => serie.item)

    return (
      <Stack spacing={6}>
        {selector}

        <SeoPerformanceKpiBand
          summary={performance.summary}
          periodLabel={copy.toolbar.rangeOptions[String(rangeDays) as keyof typeof copy.toolbar.rangeOptions] ?? ''}
        />

        {/* Degradación honesta: lo que falta se NOMBRA, en vez de dibujarse en cero. */}
        {performance.itemsWithoutData.length > 0 ? (
          <Alert severity='info' data-capture='seo-performance-degraded'>
            <AlertTitle>{copy.states.partialMissing.title}</AlertTitle>
            {copy.states.partialMissing.description.replace('{items}', performance.itemsWithoutData.join(', '))}
          </Alert>
        ) : null}

        {sparseItems.length > 0 ? (
          <Alert severity='info' data-capture='seo-performance-degraded'>
            <AlertTitle>{copy.states.sparseSeries.title}</AlertTitle>
            {copy.states.sparseSeries.description.replace('{items}', sparseItems.join(', '))}
          </Alert>
        ) : null}

        <Box data-capture='seo-performance-metric'>
          <CustomTextField
            select
            label={copy.metric.label}
            value={metric}
            onChange={event => pushQuery({ metric: event.target.value as SeoPerformanceMetric })}
            sx={{ minInlineSize: 180 }}
          >
            {(['position', 'clicks', 'impressions', 'ctr'] as const).map(option => (
              <MenuItem key={option} value={option}>
                {copy.metric[option]}
              </MenuItem>
            ))}
          </CustomTextField>
        </Box>

        <SeoRankEvolutionChart series={performance.series} metric={metric} range={performance.range} />

        <SeoPerformanceTable
          standings={performance.standings}
          mode={mode}
          // Drill: la misma superficie con la serie aislada. La vista dedicada por-URL es
          // follow-up; filtrar acá mantiene el contexto (rango, device, métrica).
          onDrill={item => pushQuery({ items: [item] })}
        />
      </Stack>
    )
  }

  return (
    <CompositionShell
      composition='single'
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

export default SeoPerformanceView
