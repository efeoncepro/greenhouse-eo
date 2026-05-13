import 'server-only'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { composeNavItemsFromModules } from '@/lib/client-portal/composition/menu-builder'
import ClientPortalNavigationList from '@/views/greenhouse/client-portal/navigation/ClientPortalNavigationList'
import ClientPortalDegradedBanner from '@/views/greenhouse/client-portal/empty-states/ClientPortalDegradedBanner'
import ClientPortalZeroStateEmpty from '@/views/greenhouse/client-portal/empty-states/ClientPortalZeroStateEmpty'
import ModuleNotAssignedEmpty from '@/views/greenhouse/client-portal/empty-states/ModuleNotAssignedEmpty'

import type { ResolvedClientPortalModule } from '@/lib/client-portal/dto/module'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Mockup Client Portal Composition | Greenhouse'
}

/**
 * TASK-827 Slice 2 — Mockup builder canonical del Client Portal Composition Layer.
 *
 * Ruta real `/cliente-portal-mockup` (per CLAUDE.md "Mockups Greenhouse":
 * mockups por defecto deben ser rutas reales del portal con mock data tipada).
 *
 * Renderiza los 5 estados canónicos del 5-state contract (§13 spec V1) lado a
 * lado para validación visual + smoke test sin tocar PG. Cada fixture es un
 * `ResolvedClientPortalModule[]` tipado (mismo DTO que TASK-825 resolver),
 * que pasa por el menu-builder pure function (Slice 3) y se renderiza con
 * los componentes reales de empty states (Slice 5).
 *
 * Fixtures:
 *   A. Globe full bundle — 5 modules canonical (Creative Hub, Pulse, Equipo,
 *      Brand Intelligence addon, etc.)
 *   B. Wave standard — 2 modules (Pulse + Web Delivery)
 *   C. Globe + addon enabled — Globe estándar + Brand Intelligence opt-in
 *   D. Zero state — cliente activo con 0 assignments
 *   E. Degraded — banner + nav parcial (3 modules ok, 2 simulados como missing)
 *
 * Plus: <ModuleNotAssignedEmpty> con slug 'brand-intelligence' (state denied).
 *
 * Aprobado el 2026-05-13 via implementación end-to-end (D1-D7 cerradas previo;
 * audit 4-lens + skill validation skill aplicados durante Slices 0+1+5+3+4).
 *
 * Skills invocadas: greenhouse-mockup-builder (esta ruta), greenhouse-ux,
 * greenhouse-ux-writing (microcopy validado), greenhouse-dev (components).
 */

// ─────────────────────────────────────────────────────────────────────────
// Fixtures tipados — mock data para 5 estados
// ─────────────────────────────────────────────────────────────────────────

const buildFixtureModule = (
  overrides: Partial<ResolvedClientPortalModule>
): ResolvedClientPortalModule => ({
  assignmentId: 'cpma-mockup',
  moduleKey: 'mock',
  status: 'active',
  source: 'manual_admin',
  expiresAt: null,
  displayLabel: 'Mock Module',
  displayLabelClient: 'Tu Mock',
  applicabilityScope: 'globe',
  tier: 'standard',
  viewCodes: [],
  capabilities: [],
  dataSources: [],
  ...overrides
})

const FIXTURE_GLOBE_FULL: ResolvedClientPortalModule[] = [
  buildFixtureModule({
    moduleKey: 'creative_hub_globe_v1',
    displayLabel: 'Creative Hub Globe (Bundle)',
    displayLabelClient: 'Tu Creative Hub',
    viewCodes: [
      'cliente.pulse',
      'cliente.proyectos',
      'cliente.campanas',
      'cliente.creative_hub',
      'cliente.equipo',
      'cliente.revisiones'
    ],
    tier: 'standard'
  }),
  buildFixtureModule({
    moduleKey: 'pulse',
    displayLabel: 'Pulse',
    displayLabelClient: 'Pulse',
    viewCodes: ['cliente.pulse', 'cliente.home'],
    tier: 'standard',
    applicabilityScope: 'cross'
  }),
  buildFixtureModule({
    moduleKey: 'equipo_asignado',
    displayLabel: 'Equipo Asignado',
    displayLabelClient: 'Tu equipo',
    viewCodes: ['cliente.equipo'],
    tier: 'standard',
    applicabilityScope: 'cross'
  })
]

const FIXTURE_WAVE_STANDARD: ResolvedClientPortalModule[] = [
  buildFixtureModule({
    moduleKey: 'pulse',
    displayLabel: 'Pulse',
    displayLabelClient: 'Pulse',
    viewCodes: ['cliente.pulse', 'cliente.home'],
    tier: 'standard',
    applicabilityScope: 'cross'
  }),
  buildFixtureModule({
    moduleKey: 'web_delivery',
    displayLabel: 'Web Delivery (Wave)',
    displayLabelClient: 'Tu Web Delivery',
    viewCodes: ['cliente.web_delivery'],
    tier: 'standard',
    applicabilityScope: 'wave'
  })
]

const FIXTURE_GLOBE_WITH_ADDON: ResolvedClientPortalModule[] = [
  ...FIXTURE_GLOBE_FULL,
  buildFixtureModule({
    moduleKey: 'brand_intelligence',
    displayLabel: 'Brand Intelligence',
    displayLabelClient: 'Tu Brand Intelligence',
    viewCodes: ['cliente.brand_intelligence'],
    tier: 'addon',
    applicabilityScope: 'globe'
  })
]

const FIXTURE_ZERO_STATE: ResolvedClientPortalModule[] = []

// ─────────────────────────────────────────────────────────────────────────
// Mockup page
// ─────────────────────────────────────────────────────────────────────────

const renderNavFixture = (label: string, description: string, fixture: ResolvedClientPortalModule[]) => {
  const items = composeNavItemsFromModules(fixture)

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, height: '100%' }}>
      <CardHeader
        title={<Typography variant='h6'>{label}</Typography>}
        subheader={
          <Typography variant='caption' color='text.secondary'>
            {description}
          </Typography>
        }
      />
      <Divider />
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ minHeight: 320, py: 1 }}>
          <ClientPortalNavigationList items={items} />
        </Box>
      </CardContent>
    </Card>
  )
}

const MOCKUP_AM_EMAIL = 'support@efeoncepro.com'

const ClientPortalMockupPage = () => {
  return (
    <Box sx={{ p: { xs: 4, md: 6 }, maxWidth: 1440, mx: 'auto' }}>
      <Stack spacing={2} sx={{ mb: 6 }}>
        <Typography variant='h4'>Mockup — Client Portal Composition Layer</Typography>
        <Typography variant='body1' color='text.secondary'>
          TASK-827 — Validación visual de los 5 estados canónicos del 5-state contract (loading | empty |
          not_assigned | degraded | error). Las superficies aquí consumen los componentes reales de Slices 3 + 5
          con mock data tipada (sin tocar PG).
        </Typography>
      </Stack>

      {/* Section: Menu builder fixtures (Slice 3 output) */}
      <Typography variant='h5' sx={{ mb: 3 }}>
        Menú dinámico — 4 fixtures
      </Typography>
      <Grid container spacing={6} sx={{ mb: 8 }}>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          {renderNavFixture(
            'Globe full bundle',
            'Cliente Globe con Creative Hub + Pulse + Equipo asignado (3 modules, 8 view_codes)',
            FIXTURE_GLOBE_FULL
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          {renderNavFixture(
            'Wave standard',
            'Cliente Wave básico (Pulse + Web Delivery, 2 modules)',
            FIXTURE_WAVE_STANDARD
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          {renderNavFixture(
            'Globe + addon Brand Intelligence',
            'Cliente Globe con addon habilitado (Brand Intelligence aparece en grupo Módulos con badge Addon)',
            FIXTURE_GLOBE_WITH_ADDON
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          {renderNavFixture(
            'Zero state — cliente recién activado',
            'modules.length === 0 (cliente activo, account manager configurando accesos)',
            FIXTURE_ZERO_STATE
          )}
        </Grid>
      </Grid>

      {/* Section: Empty state components (Slice 5) */}
      <Typography variant='h5' sx={{ mb: 3 }}>
        Empty states — anatomía 5-elementos
      </Typography>
      <Grid container spacing={6} sx={{ mb: 8 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <CardHeader
              title={<Typography variant='h6'>State: not_assigned</Typography>}
              subheader={
                <Typography variant='caption' color='text.secondary'>
                  ?denied=brand-intelligence → ModuleNotAssignedEmpty con nombre comercial + bundleHint
                </Typography>
              }
            />
            <Divider />
            <CardContent>
              <ModuleNotAssignedEmpty publicSlug='brand-intelligence' accountManagerEmail={MOCKUP_AM_EMAIL} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <CardHeader
              title={<Typography variant='h6'>State: empty (zero-state)</Typography>}
              subheader={
                <Typography variant='caption' color='text.secondary'>
                  Cliente activo con modules.length === 0 — bienvenida + CTA contacto AM
                </Typography>
              }
            />
            <Divider />
            <CardContent>
              <ClientPortalZeroStateEmpty accountManagerEmail={MOCKUP_AM_EMAIL} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Section: Degraded + Error banners */}
      <Typography variant='h5' sx={{ mb: 3 }}>
        Degraded + error states — banner sticky
      </Typography>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <CardHeader
              title={<Typography variant='h6'>State: degraded (mode=partial)</Typography>}
              subheader={
                <Typography variant='caption' color='text.secondary'>
                  Banner sticky encima del contenido parcial — algunos modules failed silently
                </Typography>
              }
            />
            <Divider />
            <CardContent>
              <ClientPortalDegradedBanner mode='partial' />
              <Box sx={{ mt: 4, p: 4, borderRadius: 1, backgroundColor: 'action.hover' }}>
                <Typography variant='body2' color='text.secondary'>
                  Contenido parcial — solo los modules que sí resolvieron se renderizan aquí.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <CardHeader
              title={<Typography variant='h6'>State: error (mode=fallback)</Typography>}
              subheader={
                <Typography variant='caption' color='text.secondary'>
                  ?error=resolver_unavailable → banner es el único content (resolver fail completo)
                </Typography>
              }
            />
            <Divider />
            <CardContent>
              <ClientPortalDegradedBanner mode='fallback' />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ClientPortalMockupPage
