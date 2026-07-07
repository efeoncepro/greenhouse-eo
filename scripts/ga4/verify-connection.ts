/**
 * Verifica la conexión a Google Analytics 4 (Admin API) impersonando el service
 * account `greenhouse-gtm-publisher@` con tu ADC local (rol Token Creator sobre el SA).
 *
 * Lista las cuentas + propiedades GA4 que el SA puede ver → confirma el acceso y te da
 * el propertyId (necesario para la Data API / verificar eventos). Los scopes Analytics
 * son sensibles: por eso vamos por impersonación del SA, no por login de usuario.
 *
 * Si lista 0 cuentas: el SA no está agregado en GA4 (Admin → Account/Property Access
 * Management, rol Viewer). GA4 access ≠ IAM de GCP.
 *
 * Uso:
 *   gcloud auth application-default login
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/ga4/verify-connection.ts
 */

import { GoogleAuth, Impersonated } from 'google-auth-library'

import { Ga4AdminClient, Ga4ApiError } from '@/lib/growth/ga4/api-client'
import { GA4_SCOPES, type GoogleApiTokenProvider } from '@/lib/growth/ga4/contracts'

const TARGET_SERVICE_ACCOUNT = 'greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com'

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
  const admin = new Ga4AdminClient(impersonatedTokenProvider([GA4_SCOPES.readonly]))

  const accounts = await admin.listAccountSummaries()

  if (accounts.length === 0) {
    console.log('⚠️  Impersonación OK (token minteado), pero el SA NO ve ninguna cuenta GA4.')
    console.log(`    → Agregá ${TARGET_SERVICE_ACCOUNT} en GA4 (Admin → Account/Property Access Management, rol Viewer).`)

    return
  }

  console.log(`✅ Conexión GA4 OK — ${accounts.length} cuenta(s) visible(s):\n`)

  for (const account of accounts) {
    console.log(`📁 Cuenta: ${account.displayName} (accountId=${account.accountId})`)

    for (const property of account.properties) {
      console.log(`   📊 ${property.displayName}  (propertyId=${property.propertyId})`)
    }

    if (account.properties.length === 0) {
      console.log('   (sin propiedades visibles)')
    }
  }

  console.log('\n👉 Copiá el propertyId de la propiedad de efeoncepro.com para verificar eventos vía Data API.')
}

main().catch((err: unknown) => {
  if (err instanceof Ga4ApiError && err.status === 403) {
    console.error('❌ 403 PERMISSION_DENIED — el SA no tiene acceso a la propiedad GA4.')
    console.error(`   → Agregá ${TARGET_SERVICE_ACCOUNT} en GA4 (Admin → Property Access Management) con rol Viewer.`)
    process.exit(1)
  }

  console.error('❌ Falló la verificación:', err instanceof Error ? err.message : err)
  process.exit(1)
})
