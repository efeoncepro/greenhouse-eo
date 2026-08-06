'use client'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

import CustomAutocomplete from '@core/components/mui/Autocomplete'
import CustomTextField from '@core/components/mui/TextField'

import EmptyState from '@/components/greenhouse/EmptyState'
import { GreenhouseBreadcrumbs, GreenhouseChip } from '@/components/greenhouse/primitives'
import CompositionShell from '@/components/greenhouse/primitives/composition-shell/CompositionShell'
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
}

const SeoOverviewView = ({
  spaces,
  selectedSpaceId,
  connectionState = 'not_connected',
  dataAsOf = null,
  canConnectSearchConsole = false,
  kpis = null,
  sidebar = null
}: Props) => {
  const router = useRouter()

  const selectedSpace = spaces.find(space => space.organizationId === selectedSpaceId) ?? null

  // El período se nombra con el rango REAL leído, no con un literal: si la serie cubre
  // menos días que la ventana pedida, decirlo evita prometer una comparación que no hay.
  const periodLabel = kpis
    ? GH_GROWTH_SEO_OVERVIEW.toolbar.periodLabel.replace('{days}', String(kpis.rangeDays))
    : GH_GROWTH_SEO_OVERVIEW.states.pending

  const handleSpaceChange = (next: SeoSpaceOption | null) => {
    if (!next) {
      return
    }

    // Navegación real (no estado local): el servidor revalida el module_assignment.
    router.push(`/admin/growth/seo?space=${encodeURIComponent(next.organizationId)}`)
  }

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

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        justifyContent='space-between'
        alignItems={{ xs: 'flex-start', md: 'flex-end' }}
        data-capture='seo-overview-toolbar'
      >
        <Stack spacing={1}>
          <Typography variant='h4'>{GH_GROWTH_SEO_OVERVIEW.pageTitle}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {GH_GROWTH_SEO_OVERVIEW.pageSubtitle}
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
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
            sx={{ minInlineSize: 240 }}
            renderInput={params => (
              <CustomTextField
                {...params}
                label={GH_GROWTH_SEO_OVERVIEW.toolbar.spaceLabel}
                placeholder={GH_GROWTH_SEO_OVERVIEW.toolbar.spacePlaceholder}
              />
            )}
          />

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
        </Stack>
      </Stack>

      <Box data-capture='seo-overview-tabs'>
        <SeoSearchVisibilityTabs activeTab='overview' spaceId={selectedSpaceId} />
      </Box>

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

export default SeoOverviewView
