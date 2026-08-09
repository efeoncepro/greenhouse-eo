'use client'

import { useTransition } from 'react'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Button from '@mui/material/Button'

import MenuItem from '@mui/material/MenuItem'

import CustomAutocomplete from '@core/components/mui/Autocomplete'
import CustomTextField from '@core/components/mui/TextField'

import EmptyState from '@/components/greenhouse/EmptyState'
import { GreenhouseBreadcrumbs, GreenhouseChip } from '@/components/greenhouse/primitives'
import SurfaceRecipe from '@/components/greenhouse/primitives/surface-system/SurfaceRecipe'
import WorkbenchHeader from '@/components/greenhouse/primitives/surface-system/WorkbenchHeader'
import { GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'
import { GH_GROWTH_SEO_OVERVIEW } from '@/lib/copy/growth'
import type { SeoSpaceOption } from '@/lib/growth/seo/overview/list-seo-spaces'
import type { SeoOverviewKpis } from '@/lib/growth/seo/overview/read-overview-kpis'
import type { SeoOverviewSidebar as SeoOverviewSidebarData } from '@/lib/growth/seo/overview/read-overview-sidebar'

import SeoKpiRow from './SeoKpiRow'
import SeoOverviewSidebar from './SeoOverviewSidebar'
import SeoSearchVisibilityTabs from './SeoSearchVisibilityTabs'
import SeoVisibilityEvolutionChart from './SeoVisibilityEvolutionChart'

/**
 * TASK-1306 — Cockpit Overview del módulo SEO.
 *
 * Cliente PURO: no calcula métricas ni decide acceso. El servidor ya resolvió las tres
 * puertas del guard y la lista de Spaces elegibles; acá sólo se pinta y se navega.
 *
 * El Space vive en `?space=` (no en estado local): así el enlace es compartible, el
 * back/forward del browser funciona y el servidor vuelve a validar el
 * `module_assignment` en cada cambio. Un `useState` local se saltaría esa revalidación.
 */

export type SeoConnectionState = 'connected' | 'not_connected' | 'no_snapshots'

interface Props {
  spaces: SeoSpaceOption[]
  selectedSpaceId: string | null
  /** Estado de la fuente medida (Search Console) del Space vigente. */
  connectionState?: SeoConnectionState
  /** Fecha de corte de los datos medidos, ISO. `null` si todavía no hay. */
  dataAsOf?: string | null
  /**
   * ¿El operador tiene `growth.search_console.connect`? Sin ella el CTA de conectar
   * llevaría a un 403: se oculta y el empty explica el estado sin ofrecer una acción
   * que la persona no puede ejecutar.
   */
  canConnectSearchConsole?: boolean
  /** KPIs + serie del Space vigente. `null` cuando no hay nada medido todavía. */
  kpis?: SeoOverviewKpis | null
  /** Salud + movers + cruce AEO. Cada región degrada por separado. */
  sidebar?: SeoOverviewSidebarData | null
  /** Ventana en días vigente (viaja en `?range=`, compartible). */
  rangeDays?: number
}

const SeoOverviewView = ({
  spaces,
  selectedSpaceId,
  connectionState = 'not_connected',
  dataAsOf = null,
  canConnectSearchConsole = false,
  kpis = null,
  sidebar = null,
  rangeDays = 28
}: Props) => {
  const router = useRouter()

  // `useTransition` en vez de un `useState` de "cargando": el re-fetch lo hace el SERVER
  // (la navegación revalida el module_assignment), así que el pending real es el de la
  // transición de router — un flag local mentiría sobre cuándo terminó.
  const [isPending, startTransition] = useTransition()

  const selectedSpace = spaces.find(space => space.organizationId === selectedSpaceId) ?? null

  // El período se nombra con el rango REAL leído, no con un literal: si la serie cubre
  // menos días que la ventana pedida, decirlo evita prometer una comparación que no hay.
  const periodLabel = kpis
    ? GH_GROWTH_SEO_OVERVIEW.toolbar.periodLabel.replace('{days}', String(kpis.rangeDays))
    : GH_GROWTH_SEO_OVERVIEW.toolbar.periodLabel.replace('{days}', String(rangeDays))

  // Toda la selección vive en la URL: Space y período son compartibles y sobreviven al
  // back/forward. Un `useState` local rompería ambas cosas y saltearía la revalidación
  // server-side del `module_assignment`.
  const pushQuery = (next: { space?: string; range?: number }) => {
    const params = new URLSearchParams()
    const space = next.space ?? selectedSpaceId

    if (space) {
      params.set('space', space)
    }

    params.set('range', String(next.range ?? rangeDays))

    startTransition(() => {
      router.push(`/admin/growth/seo?${params.toString()}`)
    })
  }

  const handleSpaceChange = (next: SeoSpaceOption | null) => {
    if (!next) {
      return
    }

    pushQuery({ space: next.organizationId })
  }

  /**
   * Chrome de la pantalla, en el patrón CANÓNICO del módulo (TASK-1307, coherencia entre las
   * tres pestañas de Search Visibility): `WorkbenchHeader kind='report'` dentro de la región
   * `header` de la recipe.
   *
   * ⚠️ Antes el título, los dos controles, el botón de recarga, el chip de frescura, los tabs
   * y la leyenda flotaban sueltos sobre el lienzo gris — seis bloques sin superficie que los
   * contuviera, que en 390px era el primer scroll entero sin un solo dato. El plano contenido
   * declara el ALCANCE ("qué Space, qué ventana, hasta qué fecha") y el contenido queda abajo,
   * sobre el lienzo, donde se lee como contenido.
   */
  const header = (
    <Stack spacing={4}>
      {/* "Growth" es un grupo de menú, no una ruta: va sin href para no prometer
          una página que no existe. */}
      <GreenhouseBreadcrumbs
        items={[
          { label: GH_INTERNAL_NAV.growth.label },
          { label: GH_GROWTH_SEO_OVERVIEW.breadcrumbSection },
          { label: GH_INTERNAL_NAV.growthSeo.label }
        ]}
      />

      <WorkbenchHeader
        kind='report'
        titleComponent='h1'
        dataCapture='seo-overview-toolbar'
        title={GH_GROWTH_SEO_OVERVIEW.pageTitle}
        description={GH_GROWTH_SEO_OVERVIEW.pageSubtitle}
        meta={
          <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
            {/* Freshness explícito: el operador tiene que poder distinguir "no pasó nada"
                de "el dato es viejo". Sin fecha se dice que no hay, no se inventa "hoy". */}
            <GreenhouseChip
              kind='metric'
              variant='label'
              size='small'
              label={
                dataAsOf
                  ? GH_GROWTH_SEO_OVERVIEW.toolbar.freshness.replace('{date}', dataAsOf)
                  : GH_GROWTH_SEO_OVERVIEW.toolbar.freshnessUnknown
              }
            />

            {/* Leyenda persistente: medido y estimado NO se promedian ni se pintan igual. */}
            <Stack direction='row' spacing={2} aria-label={GH_GROWTH_SEO_OVERVIEW.legend.ariaLabel}>
              <Tooltip title={GH_GROWTH_SEO_OVERVIEW.legend.measuredHint}>
                <span>
                  <GreenhouseChip
                    kind='metric'
                    variant='label'
                    size='small'
                    label={`● ${GH_GROWTH_SEO_OVERVIEW.legend.measured}`}
                  />
                </span>
              </Tooltip>
              <Tooltip title={GH_GROWTH_SEO_OVERVIEW.legend.estimatedHint}>
                <span>
                  <GreenhouseChip
                    kind='metric'
                    variant='label'
                    size='small'
                    label={`◑ ${GH_GROWTH_SEO_OVERVIEW.legend.estimated}`}
                  />
                </span>
              </Tooltip>
            </Stack>
          </Stack>
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
              onChange={(_, value) => handleSpaceChange((value as SeoSpaceOption | null) ?? null)}
              // En móvil cada control ocupa su fila completa: 2-up truncaba el valor
              // vigente, y un control cuyo valor no se puede leer deja de ser un control.
              sx={{ flex: { xs: '1 1 100%', md: '0 0 auto' }, minInlineSize: { md: 240 } }}
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
              label={GH_GROWTH_SEO_OVERVIEW.toolbar.rangeLabel}
              value={String(rangeDays)}
              onChange={event => pushQuery({ range: Number(event.target.value) })}
              sx={{ flex: { xs: '1 1 100%', md: '0 0 auto' }, minInlineSize: { md: 170 } }}
            >
              {Object.entries(GH_GROWTH_SEO_OVERVIEW.toolbar.rangeOptions).map(([days, label]) => (
                <MenuItem key={days} value={days}>
                  {label}
                </MenuItem>
              ))}
            </CustomTextField>

            {/* Relee los snapshots ya materializados: NO dispara un crawl ni gasta
                presupuesto de proveedor. El tooltip lo dice para que nadie lo suponga. */}
            <Tooltip title={GH_GROWTH_SEO_OVERVIEW.toolbar.refreshHint}>
              <span>
                <Button
                  variant='outlined'
                  size='small'
                  startIcon={<i className='tabler-refresh' />}
                  disabled={isPending}
                  onClick={() => startTransition(() => router.refresh())}
                >
                  {isPending ? GH_GROWTH_SEO_OVERVIEW.toolbar.refreshPending : GH_GROWTH_SEO_OVERVIEW.toolbar.refresh}
                </Button>
              </span>
            </Tooltip>
          </>
        }
        supporting={
          <Box data-capture='seo-overview-tabs'>
            <SeoSearchVisibilityTabs activeTab='overview' spaceId={selectedSpaceId} />
          </Box>
        }
      />

      {/* El cambio de Space navega (no re-renderiza en sitio), así que el lector de
          pantalla necesita que el nuevo contexto se anuncie al llegar. */}
      <Box
        aria-live='polite'
        sx={{
          position: 'absolute',
          inlineSize: 1,
          blockSize: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap'
        }}
      >
        {selectedSpace
          ? GH_GROWTH_SEO_OVERVIEW.states.spaceUpdated.replace('{space}', selectedSpace.organizationName)
          : ''}
      </Box>
    </Stack>
  )

  const renderBody = () => {
    // Sin ningún Space con el módulo contratado: NO es un error ni un panel vacío con
    // ceros — es una condición de negocio, y se nombra como tal.
    if (spaces.length === 0 || !selectedSpace) {
      return (
        <Box data-capture='seo-overview-denied'>
          <EmptyState
            icon='tabler-lock'
            title={GH_GROWTH_SEO_OVERVIEW.states.denied.title}
            description={GH_GROWTH_SEO_OVERVIEW.states.denied.description}
          />
        </Box>
      )
    }

    // Sin Search Console no hay verdad medida: mostrar 0 clics sería mentir
    // ("medimos y dio cero" ≠ "no medimos"). El CTA es conectar.
    if (connectionState === 'not_connected') {
      return (
        <Box data-capture='seo-overview-empty'>
          <EmptyState
            icon='tabler-plug-connected-x'
            title={GH_GROWTH_SEO_OVERVIEW.states.emptyNoGsc.title}
            description={GH_GROWTH_SEO_OVERVIEW.states.emptyNoGsc.description}
            action={
              canConnectSearchConsole ? (
                // OAuth canónico de TASK-1282. Sin `returnTo`: su allowlist hoy sólo
                // admite `/agency/clients/*/lifecycle`, así que pasarle esta ruta se
                // descartaría en silencio. Ampliarla es un delta de TASK-1282.
                <Button
                  variant='contained'
                  href={`/api/admin/growth/search-console/oauth/start?organizationId=${encodeURIComponent(
                    selectedSpace.organizationId
                  )}`}
                >
                  {GH_GROWTH_SEO_OVERVIEW.states.emptyNoGsc.cta}
                </Button>
              ) : undefined
            }
          />
        </Box>
      )
    }

    // Conexión viva pero sin días capturados todavía: distinto de "sin conexión".
    if (connectionState === 'no_snapshots') {
      return (
        <Box data-capture='seo-overview-empty'>
          <EmptyState
            icon='tabler-clock-pause'
            title={GH_GROWTH_SEO_OVERVIEW.states.emptyNoSnapshots.title}
            description={GH_GROWTH_SEO_OVERVIEW.states.emptyNoSnapshots.description}
          />
        </Box>
      )
    }

    // La conexión dice "connected" pero los KPIs no llegaron: es un fallo del reader,
    // no un Space vacío. Se degrada honestamente en vez de renderizar ceros o reventar.
    if (!kpis) {
      return (
        <Box data-capture='seo-overview-degraded'>
          <EmptyState
            icon='tabler-alert-triangle'
            title={GH_GROWTH_SEO_OVERVIEW.states.error.title}
            description={GH_GROWTH_SEO_OVERVIEW.states.error.description}
          />
        </Box>
      )
    }

    return (
      <Stack spacing={6}>
        <SeoKpiRow kpis={kpis} periodLabel={periodLabel} />

        {/* main + sidebar que APILA bajo lg — el sidebar nunca se comprime hasta
            volverse ilegible; pasa abajo a ancho completo. */}
        <Grid container spacing={6} alignItems='flex-start'>
          <Grid size={{ xs: 12, lg: 8 }}>
            <SeoVisibilityEvolutionChart series={kpis.series} />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            {sidebar ? <SeoOverviewSidebar sidebar={sidebar} spaceId={selectedSpaceId} /> : null}
          </Grid>
        </Grid>
      </Stack>
    )
  }

  return (
    // Recipe canónica `analyticsReport` (composición `single`), igual que Rendimiento y
    // Keywords. `plane='none'`: el contenido primario ES una composición de cards, y el
    // plane contenido de la recipe fabricaría card-on-card. El chrome va en `header`.
    <SurfaceRecipe
      kind='analyticsReport'
      instanceId='seo-overview'
      plane='none'
      header={header}
      regions={{ primary: renderBody() }}
    />
  )
}

export default SeoOverviewView
