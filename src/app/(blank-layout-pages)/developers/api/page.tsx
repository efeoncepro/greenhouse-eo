import type { Metadata } from 'next'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export const metadata: Metadata = {
  title: 'Greenhouse API Platform',
  description: 'Developer entrypoint for Greenhouse API Platform, app APIs, webhooks, and legacy integrations.'
}

const productionBaseUrl = 'https://greenhouse.efeoncepro.com'
const stagingBaseUrl = 'https://dev-greenhouse.efeoncepro.com'
const currentVersion = '2026-04-25'

const laneSummaries = [
  {
    title: 'Ecosystem API',
    status: 'Canonica',
    statusColor: 'success' as const,
    basePath: '/api/platform/ecosystem',
    audience: 'Consumers server-to-server con credential propia y binding activo.',
    auth: 'Authorization: Bearer <consumer-token> o x-greenhouse-sister-platform-key, mas externalScopeType y externalScopeId.',
    routes: [
      'GET /context',
      'GET /organizations',
      'GET /organizations/:id',
      'GET /capabilities',
      'GET /integration-readiness'
    ]
  },
  {
    title: 'First-party App API',
    status: 'Foundation',
    statusColor: 'info' as const,
    basePath: '/api/platform/app',
    audience: 'Futura app React Native y otros clients first-party de Greenhouse.',
    auth: 'POST /sessions crea access token corto y refresh token durable; cada request rehidrata Identity Access vigente.',
    routes: [
      'POST /sessions',
      'PATCH /sessions',
      'DELETE /sessions/current',
      'GET /context',
      'GET /home',
      'GET /notifications',
      'POST /notifications/:id/read',
      'POST /notifications/mark-all-read'
    ]
  },
  {
    title: 'Event Control Plane',
    status: 'Canonica',
    statusColor: 'success' as const,
    basePath: '/api/platform/ecosystem',
    audience: 'Consumers ecosystem que administran subscriptions y observan deliveries propios.',
    auth: 'Misma autenticacion y binding de Ecosystem API. El retry reprograma delivery; no entrega inline.',
    routes: [
      'GET /event-types',
      'GET /webhook-subscriptions',
      'POST /webhook-subscriptions',
      'GET /webhook-subscriptions/:id',
      'PATCH /webhook-subscriptions/:id',
      'GET /webhook-deliveries',
      'GET /webhook-deliveries/:id',
      'POST /webhook-deliveries/:id/retry'
    ]
  },
  {
    title: 'Legacy Integrations API',
    status: 'Transicional',
    statusColor: 'warning' as const,
    basePath: '/api/integrations/v1',
    audience: 'Connectors existentes que sincronizan contexto comercial y capabilities.',
    auth: 'GREENHOUSE_INTEGRATION_API_TOKEN para generic lane; sister-platform lane usa consumer token dedicado.',
    routes: [
      'GET /catalog/capabilities',
      'GET /tenants',
      'POST /tenants/capabilities/sync',
      'GET /sister-platforms/context',
      'GET /sister-platforms/catalog/capabilities',
      'GET /sister-platforms/readiness'
    ]
  }
]

const platformRules = [
  'Todas las respuestas nuevas usan envelope con requestId, servedAt, version, data y meta.',
  `La version default actual es ${currentVersion}; se negocia con x-greenhouse-api-version.`,
  'Las colecciones endurecidas exponen meta.pagination y headers Link cuando aplica.',
  'Los headers de rate limit incluyen limite, remaining y reset.',
  'ETag y Last-Modified existen solo en resources donde la frescura es segura.',
  'Los writes amplios ecosystem-facing siguen fuera de V1 hasta tener idempotencia transversal.'
]

const exampleRequest = `curl "${productionBaseUrl}/api/platform/ecosystem/organizations?externalScopeType=organization&externalScopeId=org_123&page=1&pageSize=25" \\
  -H "Authorization: Bearer $GREENHOUSE_ECOSYSTEM_TOKEN" \\
  -H "x-greenhouse-api-version: ${currentVersion}"`

export default function GreenhouseApiPlatformPage() {
  return (
    <Container maxWidth='lg' sx={{ py: { xs: 8, md: 12 } }}>
      <Stack spacing={6}>
        <Box>
          <Typography variant='overline' sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.08em' }}>
            Greenhouse Developers
          </Typography>
          <Typography variant='h2' sx={{ mt: 1, maxWidth: 920 }}>
            API Platform
          </Typography>
          <Typography variant='h6' color='text.secondary' sx={{ mt: 2, maxWidth: 920 }}>
            Entry point publico para consumers ecosystem, first-party app, webhooks y el carril legacy de integraciones.
            La historia canonica vive en <code>api/platform/*</code>; <code>integrations/v1</code> sigue disponible como
            contrato transicional.
          </Typography>
        </Box>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
                <Chip color='success' variant='tonal' label={`Production: ${productionBaseUrl}`} />
                <Chip color='info' variant='tonal' label={`Staging: ${stagingBaseUrl}`} />
                <Chip color='primary' variant='tonal' label={`API version: ${currentVersion}`} />
              </Stack>
              <Alert severity='info' variant='outlined'>
                La plataforma no es una API abierta anonima. Cada lane exige autenticacion, scope y tenancy explicitos.
              </Alert>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                <Button href='/docs/greenhouse-api-platform-v1.md' variant='contained'>
                  Descargar platform guide
                </Button>
                <Button href='/docs/greenhouse-api-platform-v1.openapi.yaml' variant='outlined'>
                  Descargar OpenAPI platform preview
                </Button>
                <Button href='/docs/greenhouse-integrations-api-v1.openapi.yaml' variant='text'>
                  OpenAPI legacy
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, minmax(0, 1fr))'
            }
          }}
        >
          {laneSummaries.map(lane => (
            <Card key={lane.title}>
              <CardContent>
                <Stack spacing={2.5}>
                  <Stack direction='row' gap={1.5} alignItems='center' justifyContent='space-between'>
                    <Typography variant='h5'>{lane.title}</Typography>
                    <Chip size='small' color={lane.statusColor} variant='tonal' label={lane.status} />
                  </Stack>
                  <Typography variant='body2' color='text.secondary'>
                    <code>{lane.basePath}</code>
                  </Typography>
                  <Typography color='text.secondary'>{lane.audience}</Typography>
                  <Box>
                    <Typography variant='subtitle2' sx={{ mb: 1 }}>
                      Autenticacion
                    </Typography>
                    <Typography color='text.secondary'>{lane.auth}</Typography>
                  </Box>
                  <Divider />
                  <Stack spacing={1}>
                    {lane.routes.map(route => (
                      <Typography key={route} variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {route}
                      </Typography>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='h5'>Contrato transversal</Typography>
              <Box
                component='ul'
                sx={{
                  m: 0,
                  pl: 5,
                  color: 'text.secondary',
                  '& li': { mb: 1 }
                }}
              >
                {platformRules.map(rule => (
                  <li key={rule}>
                    <Typography color='text.secondary'>{rule}</Typography>
                  </li>
                ))}
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Typography variant='h5'>Request base</Typography>
              <Typography color='text.secondary'>
                Ecosystem requests siempre resuelven el consumer y el binding antes de servir datos. No se infiere
                tenancy por nombre visible, label comercial ni heuristica de proveedor.
              </Typography>
              <Box
                component='pre'
                sx={{
                  m: 0,
                  p: 3,
                  overflowX: 'auto',
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  fontSize: 13
                }}
              >
                <code>{exampleRequest}</code>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Typography variant='h5'>Estado de OpenAPI</Typography>
              <Typography color='text.secondary'>
                El YAML legacy sigue siendo el contrato machine-readable estable para <code>integrations/v1</code>. El
                YAML de platform publicado aqui cubre el primer corte de <code>api/platform/*</code> para onboarding y
                tooling, y debe tratarse como preview hasta que la generacion automatica de schemas quede cerrada.
              </Typography>
              <Alert severity='warning' variant='outlined'>
                No uses esta pagina para descubrir tablas internas ni rutas web del portal. Los contratos publicables se
                documentan por lane y no exponen mirrors raw de PostgreSQL, BigQuery ni webhooks transport.
              </Alert>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  )
}
