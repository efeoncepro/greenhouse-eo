/**
 * Snapshot + drift detection de los containers GTM live (capa delgada de robustez —
 * ADR `GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1`).
 *
 * Exporta la versión LIVE de los DOS containers —web `GTM-NGHPGRLZ` y servidor
 * `GTM-K2X4ZTTK` (sGTM/Meta CAPI)— a JSON normalizados y commiteados, con los secretos
 * TAPADOS por una huella (ver `snapshot-lib.ts`). NO despliega nada.
 *
 * Uso:
 *   pnpm gtm:snapshot            # escribe ambos snapshots (tras un publish, para que git refleje el live)
 *   pnpm gtm:snapshot --check    # compara live vs commiteado → exit 1 si hay drift (lo corre CI a diario)
 *
 * Auth:
 *   - Local: ADC del operador + impersonación de `greenhouse-gtm-publisher` (scope readonly).
 *   - CI (`GTM_SNAPSHOT_DIRECT_AUTH=1`): el job ya se autenticó COMO ese SA vía WIF; se usa
 *     ADC directo con el scope readonly, sin una segunda impersonación.
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs'

import { GoogleAuth, Impersonated } from 'google-auth-library'

import { GTM_API_BASE, GTM_SCOPES } from '@/lib/growth/gtm/contracts'

import {
  GTM_SNAPSHOT_TARGETS, describeDrift, normalizeLiveVersion, serializeSnapshot,
  type NormalizedSnapshot, type RedactionReport
} from './snapshot-lib'

const SA = 'greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com'

const readonlyToken = async (): Promise<string> => {
  if (process.env.GTM_SNAPSHOT_DIRECT_AUTH === '1') {
    const direct = await new GoogleAuth({ scopes: [GTM_SCOPES.readonly] }).getAccessToken()

    if (!direct) throw new Error('ADC directo no devolvió token (¿el job se autenticó como el SA de GTM?)')

    return direct
  }

  const src = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] }).getClient()
  const imp = new Impersonated({ sourceClient: src, targetPrincipal: SA, targetScopes: [GTM_SCOPES.readonly], lifetime: 300 })
  const { token } = await imp.getAccessToken()

  if (!token) throw new Error('la impersonación no devolvió token')

  return token
}

export interface LiveSnapshot {
  key: string
  publicId: string
  snapshotPath: string
  snapshot: NormalizedSnapshot
  redaction: RedactionReport
}

export const fetchLiveSnapshots = async (token?: string): Promise<LiveSnapshot[]> => {
  const bearer = token ?? await readonlyToken()

  return Promise.all(GTM_SNAPSHOT_TARGETS.map(async target => {
    const r = await fetch(`${GTM_API_BASE}/${target.containerPath}/versions:live`, {
      headers: { Authorization: `Bearer ${bearer}` }, cache: 'no-store'
    })

    if (!r.ok) throw new Error(`${target.key} ${target.publicId}: GET versions:live → ${r.status} ${await r.text()}`)

    const redaction: RedactionReport = { redacted: [] }
    const snapshot = normalizeLiveVersion(await r.json(), redaction)

    return { key: target.key, publicId: target.publicId, snapshotPath: target.snapshotPath, snapshot, redaction }
  }))
}

/** Escribe los snapshots live a disco. Lo reutilizan los scripts que publican en GTM. */
export const writeLiveSnapshots = async (token?: string): Promise<LiveSnapshot[]> => {
  const lives = await fetchLiveSnapshots(token)

  for (const live of lives) {
    writeFileSync(live.snapshotPath, serializeSnapshot(live.snapshot))
    console.log(`✅ ${live.key} ${live.publicId} «${live.snapshot.name ?? '—'}» → ${live.snapshotPath}`)
    console.log(`   tags: ${live.snapshot.tags.length} · triggers: ${live.snapshot.triggers.length} · variables: ${live.snapshot.variables.length} · clients: ${live.snapshot.clients.length}`)
    if (live.redaction.redacted.length) console.log(`   secretos tapados: ${live.redaction.redacted.join('; ')}`)
  }

  return lives
}

const check = async (): Promise<number> => {
  const lives = await fetchLiveSnapshots()
  let drifted = 0

  for (const live of lives) {
    const label = `${live.key} ${live.publicId}`

    if (!existsSync(live.snapshotPath)) {
      console.error(`❌ ${label}: no existe ${live.snapshotPath} — corre 'pnpm gtm:snapshot' primero`)
      drifted++
      continue
    }

    const committedRaw = readFileSync(live.snapshotPath, 'utf8')

    if (committedRaw.trim() === serializeSnapshot(live.snapshot).trim()) {
      console.log(`✅ ${label}: sin drift («${live.snapshot.name ?? '—'}»).`)
      continue
    }

    drifted++
    const changes = describeDrift(JSON.parse(committedRaw), live.snapshot)

    console.error(`❌ ${label}: DRIFT — el container live difiere del snapshot commiteado.`)
    for (const line of changes.length ? changes : ['(diferencias de detalle; ver `git diff` tras `pnpm gtm:snapshot`)']) console.error(`   ${line}`)
  }

  if (drifted) {
    console.error("\nRevisa que el cambio sea intencional, corre 'pnpm gtm:snapshot' y commitea los snapshots.")

    if (process.env.GITHUB_STEP_SUMMARY) {
      writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## GTM drift\n\n${drifted} container(s) difieren del snapshot commiteado. Revisa el log del job y corre \`pnpm gtm:snapshot\`.\n`, { flag: 'a' })
    }
  }

  return drifted ? 1 : 0
}

const isEntrypoint = process.argv[1]?.endsWith('snapshot.ts')

if (isEntrypoint) {
  const run = process.argv.includes('--check') ? check() : writeLiveSnapshots().then(() => 0)

  run.then(code => process.exit(code)).catch((e: unknown) => {
    console.error('FAIL:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
}
