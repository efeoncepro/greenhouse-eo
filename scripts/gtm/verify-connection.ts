/**
 * Verifica la conexión a Google Tag Manager end-to-end (contenedor de Efeonce).
 *
 * Lista cuentas → contenedores visibles impersonando el service account
 * `greenhouse-gtm-publisher@` con tu ADC local (requiere el rol Token Creator sobre
 * el SA). Los scopes GTM se piden vía impersonación server-side, así que NO topamos
 * con la pantalla de consentimiento que bloquea el OAuth client compartido de gcloud.
 *
 * Si la API responde 403 / lista 0 cuentas: el SA no está agregado como usuario DENTRO
 * de GTM (Admin → User Management). Recordá: GTM ≠ IAM de GCP.
 *
 * Uso:
 *   gcloud auth application-default login    # ADC con scopes por defecto (cloud-platform)
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/gtm/verify-connection.ts
 */

import { GoogleAuth, Impersonated } from 'google-auth-library'

import { GtmApiClient, GtmApiError } from '@/lib/growth/gtm/api-client'
import { GTM_SCOPES, type GtmTokenProvider } from '@/lib/growth/gtm/contracts'

const TARGET_SERVICE_ACCOUNT = 'greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com'

/** Token provider que impersona el SA vía IAM (tu ADC + rol Token Creator sobre el SA). */
const impersonatedGtmTokenProvider = (scopes: string[]): GtmTokenProvider => ({
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
      throw new GtmApiError('No se pudo mintear un token impersonando el SA', 401)
    }

    return token
  }
})

const main = async () => {
  const client = new GtmApiClient(impersonatedGtmTokenProvider([GTM_SCOPES.readonly]))

  const accounts = await client.listAccounts()

  if (accounts.length === 0) {
    console.log('⚠️  Impersonación OK (token minteado), pero el SA NO ve ninguna cuenta GTM.')
    console.log(`    → Agregá ${TARGET_SERVICE_ACCOUNT} como usuario dentro de GTM (Admin → User Management, permiso Publish).`)

    return
  }

  console.log(`✅ Conexión OK — ${accounts.length} cuenta(s) GTM visible(s):\n`)

  for (const account of accounts) {
    console.log(`📁 Cuenta: ${account.name} (accountId=${account.accountId})`)

    const containers = await client.listContainers(account.accountId)

    for (const container of containers) {
      console.log(
        `   📦 ${container.name}  ${container.publicId}  [${container.usageContext.join(', ') || 'sin contexto'}]  (containerId=${container.containerId})`
      )
    }

    if (containers.length === 0) {
      console.log('   (sin contenedores visibles)')
    }
  }

  console.log('\n👉 Copiá el accountId + containerId del contenedor de Efeonce para operar write+publish.')
}

main().catch((err: unknown) => {
  if (err instanceof GtmApiError && err.status === 403) {
    console.error('❌ 403 PERMISSION_DENIED — el SA no tiene acceso al contenedor DENTRO de GTM.')
    console.error(`   → Agregá ${TARGET_SERVICE_ACCOUNT} en GTM (Admin → User Management) con permiso Publish.`)
    process.exit(1)
  }

  console.error('❌ Falló la verificación:', err instanceof Error ? err.message : err)
  process.exit(1)
})
