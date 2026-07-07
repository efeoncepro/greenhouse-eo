/**
 * Muestra el conteo de eventos EN TIEMPO REAL de una propiedad GA4 (últimos ~30 min).
 * La herramienta canónica para verificar que un evento disparado en el sitio
 * (`gh_form_*`, `gh_cta_*`, page_view, etc.) está efectivamente llegando a GA4.
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/ga4/realtime-events.ts <propertyId>
 *   # efeoncepro.com → propertyId 486264460
 */

import { GoogleAuth, Impersonated } from 'google-auth-library'

import { Ga4ApiError, Ga4DataClient } from '@/lib/growth/ga4/api-client'
import { GA4_SCOPES, type GoogleApiTokenProvider } from '@/lib/growth/ga4/contracts'

const TARGET_SERVICE_ACCOUNT = 'greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com'
const DEFAULT_PROPERTY_ID = '486264460' // efeoncepro.com

const impersonatedTokenProvider = (scopes: string[]): GoogleApiTokenProvider => ({
  async getAccessToken() {
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
    const sourceClient = await auth.getClient()

    const impersonated = new Impersonated({
      sourceClient,
      targetPrincipal: TARGET_SERVICE_ACCOUNT,
      targetScopes: scopes,
      lifetime: 300
    })

    const { token } = await impersonated.getAccessToken()

    if (!token) {
      throw new Ga4ApiError('No se pudo mintear un token impersonando el SA', 401)
    }

    return token
  }
})

const main = async () => {
  const propertyId = process.argv[2] ?? DEFAULT_PROPERTY_ID
  const data = new Ga4DataClient(impersonatedTokenProvider([GA4_SCOPES.readonly]))

  const rows = await data.runRealtimeEventCounts(propertyId)

  console.log(`GA4 realtime — propiedad ${propertyId} (usuarios activos últimos ~30 min):\n`)

  if (rows.length === 0) {
    console.log('   (sin eventos en tiempo real ahora mismo — nadie navegando o sin tráfico reciente)')

    return
  }

  const sorted = [...rows].sort((a, b) => b.eventCount - a.eventCount)

  for (const row of sorted) {
    console.log(`   ${String(row.eventCount).padStart(5)}  ${row.eventName}`)
  }
}

main().catch((err: unknown) => {
  console.error('❌ Falló el reporte realtime:', err instanceof Error ? err.message : err)
  process.exit(1)
})
