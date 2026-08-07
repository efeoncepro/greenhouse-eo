'use client'

import { useTransition } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'

import CustomAutocomplete from '@core/components/mui/Autocomplete'
import CustomTextField from '@core/components/mui/TextField'

import EmptyState from '@/components/greenhouse/EmptyState'
import { GreenhouseBreadcrumbs, GreenhouseChip } from '@/components/greenhouse/primitives'
import SurfaceRecipe from '@/components/greenhouse/primitives/surface-system/SurfaceRecipe'
import WorkbenchHeader from '@/components/greenhouse/primitives/surface-system/WorkbenchHeader'
import { GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'
import { GH_GROWTH_SEO_PERFORMANCE, GH_GROWTH_SEO_OVERVIEW } from '@/lib/copy/growth'
import { algorithmUpdatesInRange } from '@/lib/growth/seo/algorithm-updates'
import type {
  SeoPerformanceCatalogItem,
  SeoPerformanceCatalogSet,
  SeoPerformanceMetric,
  SeoPerformanceMode,
  SeoPerformanceResult,
  SeoRankDevice
} from '@/lib/growth/seo/contracts'
import { deriveSeoPerformanceInsight } from '@/lib/growth/seo/performance/derive-insight'
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
  /** Sets nombrados del target (presets de comparación data-driven). */
  sets?: SeoPerformanceCatalogSet[]
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
  sets = [],
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

  /**
   * Chrome de la pantalla: va en la región `header` de la recipe, NO dentro de `primary`.
   *
   * ⚠️ La versión anterior apilaba título + 3 selects + chip + tabs + leyenda sueltos sobre
   * el lienzo gris: seis elementos sin superficie que los contuviera. En móvil eso era el
   * primer scroll COMPLETO sin un solo dato — el control (secundario) ocupando más área que
   * el contenido (primario). `WorkbenchHeader kind='report'` es la primitive canónica del
   * surface system para esto: un plano contenido (paper + borde + elevación) que declara el
   * ALCANCE de la lectura, con el contenido real abajo, sobre el lienzo.
   *
   * Reparto deliberado dentro del plano:
   * - `secondaryActions` = los tres selects (lo que el operador CAMBIA);
   * - `meta` = frescura + leyenda de origen (hechos SOBRE el dato, no controles);
   * - `supporting` = los tabs hermanos, bajo su divisor: cabecera con pestañas clásica.
   */
  /**
   * ⚠️ En móvil cada control ocupa la fila COMPLETA. El intento de ponerlos 2-up ahorraba
   * una fila pero truncaba el valor vigente ("Últimos 90 …"), y un control cuyo valor
   * actual no se puede leer deja de ser un control: cuesta más que la fila que ahorra.
   */
  const scopeControlSx = { flex: { xs: '1 1 100%', md: '0 0 auto' }, minInlineSize: { md: 200 } }
  const spaceControlSx = scopeControlSx

  const header = (
    <Stack spacing={4}>
      {/* Sin hrefs (misma convención del Overview): "Growth" es un grupo de menú, y la
          navegación a las hermanas ES la barra de tabs del propio header — un link acá
          duplicaría el camino y el azul primario no alcanza AA sobre el fondo del body. */}
      <GreenhouseBreadcrumbs
        items={[
          { label: GH_INTERNAL_NAV.growth.label },
          { label: GH_GROWTH_SEO_OVERVIEW.breadcrumbSection },
          { label: GH_INTERNAL_NAV.growthSeoPerformance.label }
        ]}
      />

      <WorkbenchHeader
        kind='report'
        titleComponent='h1'
        dataCapture='seo-performance-toolbar'
        title={copy.pageTitle}
        description={copy.pageSubtitle}
        meta={
          // Sólo la frescura vive en la cabecera: es lo único que aplica a TODA la pantalla.
          // La leyenda de origen (● / ◑) se mudó a la card del gráfico, junto a las series
          // que describe — ahí el recordatorio de que nunca se promedian está donde importa.
          <GreenhouseChip
            kind='metric'
            variant='label'
            size='small'
            label={dataAsOf ? copy.toolbar.freshness.replace('{date}', dataAsOf) : copy.toolbar.freshnessUnknown}
          />
        }
        secondaryActions={
          <>
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
              sx={spaceControlSx}
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
              sx={scopeControlSx}
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
              sx={scopeControlSx}
            >
              {Object.entries(copy.toolbar.deviceOptions).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </CustomTextField>
          </>
        }
        supporting={
          <Box data-capture='seo-performance-tabs'>
            <SeoSearchVisibilityTabs activeTab='performance' spaceId={selectedSpaceId} />
          </Box>
        }
      />
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
        sets={sets}
        maxItems={MAX_COMPARED_ITEMS}
        metric={metric}
        onMetricChange={next => pushQuery({ metric: next })}
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

    /**
     * Lectura cruzada de los 4 KPIs: la relación entre ellos ES el diagnóstico (¿cayeron
     * los clics por posición, por demanda o porque el SERP captura el clic?). Derivada
     * pura del mismo summary — sólo habla cuando el patrón es inequívoco.
     */
    const insight = deriveSeoPerformanceInsight(performance.summary)

    const signed = (value: number, decimals: number, unit = ''): string =>
      `${value > 0 ? '+' : ''}${value.toFixed(decimals)}${unit}`

    const insightText = insight
      ? copy.insight[insight.kind]
          .replace('{clicks}', insight.clicksDeltaPercent === null ? '—' : signed(insight.clicksDeltaPercent, 0, '%'))
          .replace(
            '{impressions}',
            insight.impressionsDeltaPercent === null ? '—' : signed(insight.impressionsDeltaPercent, 0, '%')
          )
          .replace('{position}', insight.positionDelta === null ? '—' : signed(insight.positionDelta, 1))
          .replace('{ctr}', insight.ctrDeltaPoints === null ? '—' : Math.abs(insight.ctrDeltaPoints).toFixed(1))
      : null

    return (
      <Stack spacing={6}>
        {selector}

        <SeoPerformanceKpiBand
          summary={performance.summary}
          periodLabel={copy.toolbar.rangeOptions[String(rangeDays) as keyof typeof copy.toolbar.rangeOptions] ?? ''}
        />

        {/* Degradación honesta: lo que falta se NOMBRA, en vez de dibujarse en cero.
            El cuerpo va en `text.primary`: el azul tonal default del Alert queda en
            3.71:1 sobre su fondo (falla AA) y este texto es información, no decoración. */}
        {performance.itemsWithoutData.length > 0 ? (
          <Alert
            severity='info'
            data-capture='seo-performance-degraded'
            sx={{ '& .MuiAlert-message': { color: 'text.primary' } }}
          >
            <AlertTitle>{copy.states.partialMissing.title}</AlertTitle>
            {copy.states.partialMissing.description.replace('{items}', performance.itemsWithoutData.join(', '))}
          </Alert>
        ) : null}

        {insightText ? (
          <Alert
            severity={insight?.kind === 'rank_gain' ? 'success' : 'warning'}
            icon={false}
            data-capture='seo-performance-insight'
            sx={{ '& .MuiAlert-message': { color: 'text.primary' } }}
          >
            <AlertTitle>{copy.insight.title}</AlertTitle>
            {insightText}
          </Alert>
        ) : null}

        {sparseItems.length > 0 ? (
          <Alert
            severity='info'
            data-capture='seo-performance-degraded'
            sx={{ '& .MuiAlert-message': { color: 'text.primary' } }}
          >
            <AlertTitle>{copy.states.sparseSeries.title}</AlertTitle>
            {copy.states.sparseSeries.description.replace('{items}', sparseItems.join(', '))}
          </Alert>
        ) : null}

        <SeoRankEvolutionChart
          series={performance.series}
          metric={metric}
          source={performance.source}
          range={performance.range}
          // Updates confirmados de Google dentro del rango (registro curado): contexto
          // para distinguir una caída colectiva de una caída propia del sitio.
          events={algorithmUpdatesInRange(performance.range.from, performance.range.to)}
        />

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
    // Recipe canónica `analyticsReport` (composición `single`). `plane='none'`: el
    // contenido primario ES una composición de cards (banda KPI + chart hero + tabla);
    // el plane contenido de la recipe fabricaría card-on-card.
    <SurfaceRecipe
      kind='analyticsReport'
      instanceId='seo-performance'
      plane='none'
      // El chrome va en `header` (fuera del shell), el contenido en `primary`: es la
      // división que la recipe declara. Meter ambos en `primary` era la causa de que los
      // controles quedaran flotando desnudos sobre el lienzo.
      header={header}
      regions={{ primary: renderBody() }}
    />
  )
}

export default SeoPerformanceView
