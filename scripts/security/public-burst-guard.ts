/**
 * TASK-1876 — Sincroniza las reglas del guard volumétrico de `/api/public/**` con el
 * Firewall de Vercel (WAF) desde la fuente versionada
 * `src/lib/security/public-burst-guard/firewall-rules.ts`.
 *
 *   pnpm security:public-burst-guard            # plan (sólo lectura)
 *   pnpm security:public-burst-guard --apply    # escribe y relee; falla si el readback no converge
 *
 * Nunca toca reglas ajenas al guard. Rollback: cambiar `mode` en el archivo fuente y aplicar,
 * o desactivar la regla en el dashboard (Firewall → Custom Rules).
 */
import {
  planPublicBurstGuardChanges,
  type ActiveFirewallRule,
  type FirewallRuleChange
} from '../../src/lib/security/public-burst-guard/firewall-rules'
import { VERCEL_PROJECT_ID, VERCEL_TEAM_ID, getVercelCliToken } from '../lib/vercel-staging-access.mjs'

const API = 'https://api.vercel.com/v1/security/firewall/config'
const query = `projectId=${VERCEL_PROJECT_ID}&slug=${VERCEL_TEAM_ID}`

interface ActiveConfig {
  firewallEnabled?: boolean
  rules?: ActiveFirewallRule[]
}

const request = async (token: string, method: 'GET' | 'PATCH', path: string, body?: unknown) => {
  const response = await fetch(`${API}${path}?${query}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })

  const text = await response.text()

  return { status: response.status, json: text ? (JSON.parse(text) as Record<string, unknown>) : {} }
}

const readActive = async (token: string): Promise<ActiveConfig | null> => {
  const { status, json } = await request(token, 'GET', '/active')

  if (status === 404) return null
  if (status !== 200) throw new Error(`GET firewall config -> ${status}: ${JSON.stringify(json).slice(0, 300)}`)

  return json as ActiveConfig
}

const describeChange = (change: FirewallRuleChange) =>
  change.kind === 'unchanged'
    ? `  = ${change.name} (sin cambios)`
    : `  ${change.kind === 'insert' ? '+' : '~'} ${change.value.name} -> ${change.value.action.mitigate.rateLimit.action}`

const main = async () => {
  const apply = process.argv.includes('--apply')
  const token = await getVercelCliToken()

  if (!token) throw new Error('Sin token de Vercel: exporta VERCEL_TOKEN o corre `vercel login`.')

  const active = await readActive(token)
  const plan = planPublicBurstGuardChanges(active?.rules ?? [])

  console.log(`Firewall ${active ? `activo (firewallEnabled=${active.firewallEnabled})` : 'sin configuración'}.`)
  console.log('Plan:')
  plan.forEach(change => console.log(describeChange(change)))

  const pending = plan.filter(change => change.kind !== 'unchanged')

  if (!apply) {
    console.log(pending.length ? `\n${pending.length} cambio(s) pendiente(s). Usa --apply para escribir.` : '\nSin drift.')

    process.exitCode = pending.length ? 2 : 0

    return
  }

  if (active?.firewallEnabled !== true) {
    const { status, json } = await request(token, 'PATCH', '', { action: 'firewallEnabled', id: null, value: true })

    if (status >= 300) throw new Error(`firewallEnabled -> ${status}: ${JSON.stringify(json).slice(0, 300)}`)
  }

  for (const change of pending) {
    if (change.kind === 'unchanged') continue

    const body =
      change.kind === 'insert'
        ? { action: 'rules.insert', id: null, value: change.value }
        : { action: 'rules.update', id: change.id, value: change.value }

    const { status, json } = await request(token, 'PATCH', '', body)

    if (status >= 300) throw new Error(`${body.action} ${change.value.name} -> ${status}: ${JSON.stringify(json).slice(0, 400)}`)
  }

  const readback = await readActive(token)
  const residual = planPublicBurstGuardChanges(readback?.rules ?? []).filter(change => change.kind !== 'unchanged')

  console.log(`\nReadback: firewallEnabled=${readback?.firewallEnabled}; reglas del guard sin drift: ${residual.length === 0}.`)

  if (residual.length) {
    residual.forEach(change => console.log(describeChange(change)))
    throw new Error('El readback no converge con la fuente versionada.')
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
