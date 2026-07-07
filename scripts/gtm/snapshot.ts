/**
 * Snapshot + drift detection del container GTM live (capa delgada de robustez —
 * ADR `GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1`).
 *
 * Exporta el config del container LIVE (`GTM-NGHPGRLZ`) a un JSON normalizado y
 * commiteado — para diff revisable en git + detección de drift. NO despliega nada.
 *
 * Uso:
 *   gcloud auth application-default login
 *   pnpm gtm:snapshot            # escribe el snapshot (tras un publish, para que git refleje el live)
 *   pnpm gtm:snapshot --check    # compara live vs snapshot commiteado → exit 1 si hay drift (CI)
 *
 * Normalización (para un diff limpio, research doc 06 §1.1): se descartan los campos
 * volátiles (fingerprint, path, url, monitoringMetadata, account/container/workspace IDs,
 * timestamps) y se ordena por nombre. Se conservan name/type/parameter/triggers.
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs'

import { GoogleAuth, Impersonated } from 'google-auth-library'

import { GTM_API_BASE, GTM_SCOPES } from '@/lib/growth/gtm/contracts'

const SA = 'greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com'
const CONTAINER = 'accounts/6291647045/containers/218104216'
const SNAPSHOT_PATH = 'docs/reference/measurement-gtm-ga4/container-snapshot.json'

const VOLATILE = new Set([
  'fingerprint', 'path', 'tagManagerUrl', 'monitoringMetadata', 'accountId', 'containerId',
  'workspaceId', 'tagId', 'triggerId', 'variableId', 'containerVersionId', 'formatValue',
])

const strip = (obj: unknown): unknown => {
  if (Array.isArray(obj)) return obj.map(strip)

  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {}

    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (VOLATILE.has(k)) continue
      out[k] = strip(v)
    }

    
return out
  }

  
return obj
}

const byName = (a: { name?: string }, b: { name?: string }) => (a.name ?? '').localeCompare(b.name ?? '')

const normalize = (live: any) => ({
  name: live.name ?? null,
  tags: (live.tag ?? []).map(strip).sort(byName),
  triggers: (live.trigger ?? []).map(strip).sort(byName),
  variables: (live.variable ?? []).map(strip).sort(byName),
  builtInVariables: (live.builtInVariable ?? []).map((v: any) => v.type).sort(),
})

const main = async () => {
  const check = process.argv.includes('--check')
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
  const src = await auth.getClient()
  const imp = new Impersonated({ sourceClient: src, targetPrincipal: SA, targetScopes: [GTM_SCOPES.readonly], lifetime: 300 })
  const { token } = await imp.getAccessToken()
  const r = await fetch(`${GTM_API_BASE}/${CONTAINER}/versions:live`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })

  if (!r.ok) { console.error('GET versions:live →', r.status, await r.text()); process.exit(1) }
  const liveNorm = normalize(await r.json())
  const liveJson = JSON.stringify(liveNorm, null, 2) + '\n'

  if (check) {
    if (!existsSync(SNAPSHOT_PATH)) { console.error(`❌ no existe ${SNAPSHOT_PATH} — corré 'pnpm gtm:snapshot' primero`); process.exit(1) }
    const committed = readFileSync(SNAPSHOT_PATH, 'utf8')

    if (committed.trim() === liveJson.trim()) {
      console.log('✅ Sin drift — el container live coincide con el snapshot commiteado.')
      
return
    }

    console.error('❌ DRIFT — el container live difiere del snapshot commiteado.')
    console.error('   Tags live:', liveNorm.tags.map((t: any) => t.name).join(', '))
    console.error("   Corré 'pnpm gtm:snapshot' para actualizar el snapshot (tras revisar que el cambio es intencional).")
    process.exit(1)
  }

  writeFileSync(SNAPSHOT_PATH, liveJson)
  console.log(`✅ snapshot escrito: ${SNAPSHOT_PATH}`)
  console.log('   tags:', liveNorm.tags.map((t: any) => t.name).join(', '))
  console.log('   triggers:', liveNorm.triggers.map((t: any) => t.name).join(', '))
  console.log('   variables:', liveNorm.variables.map((v: any) => v.name).join(', '))
}

main().catch((e: unknown) => { console.error('FAIL:', e instanceof Error ? e.message : e); process.exit(1) })
