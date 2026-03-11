import type { Metadata } from 'next'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export const metadata: Metadata = {
  title: 'Greenhouse Integrations API',
  description: 'Public reference for the Greenhouse integrations API.'
}

const productionBaseUrl = 'https://greenhouse.efeoncepro.com'
const stagingBaseUrl = 'https://dev-greenhouse.efeoncepro.com'

const routes = [
  {
    method: 'GET',
    path: '/api/integrations/v1/catalog/capabilities',
    summary: 'Exporta el catalogo canonico de business lines y service modules.'
  },
  {
    method: 'GET',
    path: '/api/integrations/v1/tenants',
    summary: 'Exporta snapshots de tenants para reconciliacion y sync saliente.'
  },
  {
    method: 'POST',
    path: '/api/integrations/v1/tenants/capabilities/sync',
    summary: 'Sincroniza capabilities normalizadas desde un sistema externo.'
  }
]

export default function GreenhouseIntegrationsApiPage() {
  return (
    <Container maxWidth='lg' sx={{ py: 12 }}>
      <Stack spacing={6}>
        <Box>
          <Typography variant='overline' sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.08em' }}>
            Greenhouse Developers
          </Typography>
          <Typography variant='h2' sx={{ mt: 1 }}>
            Integrations API
          </Typography>
          <Typography variant='h6' color='text.secondary' sx={{ mt: 2, maxWidth: 860 }}>
            Referencia publica para conectores HubSpot, Notion, BigQuery-backed workers y futuros sistemas externos.
          </Typography>
        </Box>

        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Typography variant='h5'>Base URLs</Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
                <Chip color='success' variant='tonal' label={`Production: ${productionBaseUrl}`} />
                <Chip color='info' variant='tonal' label={`Staging: ${stagingBaseUrl}`} />
              </Stack>
              <Typography color='text.secondary'>
                Todas las rutas requieren `GREENHOUSE_INTEGRATION_API_TOKEN` via `Authorization: Bearer &lt;token&gt;`
                o `x-greenhouse-integration-key`.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                <Button href='/docs/greenhouse-integrations-api-v1.openapi.yaml' variant='contained'>
                  Descargar OpenAPI YAML
                </Button>
                <Button href='/docs/greenhouse-integrations-api-v1.md' variant='outlined'>
                  Descargar Reference MD
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='h5'>Available Routes</Typography>
              {routes.map(route => (
                <Box
                  key={route.path}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Stack spacing={1.25}>
                    <Stack direction='row' gap={1} alignItems='center' flexWrap='wrap'>
                      <Chip
                        size='small'
                        color={route.method === 'POST' ? 'warning' : 'primary'}
                        variant='tonal'
                        label={route.method}
                      />
                      <Typography variant='subtitle1'>{route.path}</Typography>
                    </Stack>
                    <Typography color='text.secondary'>{route.summary}</Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Typography variant='h5'>Connector Flow</Typography>
              <Typography color='text.secondary'>
                1. Lee el catalogo de capabilities. 2. Resuelve el tenant. 3. Empuja `businessLines` y
                `serviceModules` explicitos. 4. Usa `updatedSince` para reconciliacion bidireccional.
              </Typography>
              <Typography color='text.secondary'>
                Greenhouse no deriva capabilities desde deals ni `closedwon`. La fuente debe ser company-level o un
                payload normalizado equivalente.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  )
}
