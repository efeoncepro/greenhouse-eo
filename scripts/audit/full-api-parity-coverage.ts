/**
 * TASK-1172 — Full API Parity coverage reader (re-executable audit).
 *
 * Read-only. Mide la cobertura de Full API Parity y de operabilidad de Nexa
 * contra el inventario REAL de capabilities del portal, derivando todo de fuentes
 * verificables del repo (sin PG, corre en CI):
 *
 *   1. Capability coverage — para cada capability del catálogo canónico
 *      (`ENTITLEMENT_CAPABILITY_CATALOG`), busca sus referencias en el repo
 *      (`git grep`) y la clasifica por consumer-reach: governed / api-inline /
 *      lib-only / ui-only / declared-unwired. Overlay de cobertura Nexa.
 *
 *   2. Mutation-route governance — enumera los route handlers de mutación
 *      (`POST/PUT/PATCH/DELETE`) bajo `src/app/api/**` y clasifica su estilo de
 *      auth: capability-governed (`can(`) / session-coarse / external (webhook,
 *      cron, agente) / unguarded-review. `session-coarse` es el candidato directo
 *      a deuda de parity (acción de negocio gobernada solo por sesión/route-group,
 *      sin capability fina — patrón "admin-coarse").
 *
 * El criterio de clasificación aplica `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`:
 * parity = contrato gobernado a nivel capability (un primitive, muchos consumers).
 *
 * Uso:
 *   pnpm tsx scripts/audit/full-api-parity-coverage.ts            # reporte markdown
 *   pnpm tsx scripts/audit/full-api-parity-coverage.ts --json     # JSON
 *   pnpm tsx scripts/audit/full-api-parity-coverage.ts --out f.json
 *
 * NO remedia: produce el mapa medible. La remediación son tasks derivadas.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'

import {
  ENTITLEMENT_CAPABILITY_CATALOG,
  ENTITLEMENT_MODULES,
  type GreenhouseEntitlementModule
} from '../../src/config/entitlements-catalog'

// ── Consumer-reach buckets ───────────────────────────────────────────────────

type ReachBucket = 'api' | 'lib' | 'nexa' | 'ui' | 'test' | 'cli' | 'other'

type CapabilityClass =
  | 'governed' // ✅ command en src/lib + expuesto por API (can-checked)
  | 'api-inline' // 🟡 can-checked en route, sin primitive extraído (lógica inline)
  | 'lib-only' // 🟡 primitive existe, sin superficie API (consumers no-UI no la alcanzan)
  | 'ui-only' // ⚠️ solo referenciada en UI (lógica/guard client-side, sin contrato server)
  | 'declared-unwired' // ⚠️ declarada en el catálogo pero sin consumer real

const CLASS_BADGE: Record<CapabilityClass, string> = {
  governed: '✅ governed',
  'api-inline': '🟡 api-inline',
  'lib-only': '🟡 lib-only',
  'ui-only': '⚠️ ui-only',
  'declared-unwired': '⚠️ declared-unwired'
}

// Archivos definicionales del plano de gobernanza — NO cuentan como "consumer".
const DEFINITIONAL_PATHS = [
  'src/config/entitlements-catalog.ts',
  'src/lib/entitlements/' // runtime grants + tests de cobertura
]

const isDefinitional = (file: string) => DEFINITIONAL_PATHS.some(prefix => file.startsWith(prefix))

const bucketOf = (file: string): ReachBucket => {
  if (file.includes('.test.') || file.includes('/__tests__/') || file.startsWith('tests/')) return 'test'
  if (file.startsWith('scripts/') || file.startsWith('services/')) return 'cli'
  if (file.startsWith('src/lib/nexa/')) return 'nexa'
  if (file.startsWith('src/app/api/')) return 'api'
  if (file.startsWith('src/lib/')) return 'lib'

  if (
    file.startsWith('src/views/') ||
    file.startsWith('src/components/') ||
    file.startsWith('src/@') ||
    file.startsWith('src/app/') ||
    file.startsWith('src/hooks/')
  ) {
    return 'ui'
  }

  return 'other'
}

/** Lista los archivos del repo que contienen el string fijo `pattern`. */
const gitGrepFiles = (pattern: string): string[] => {
  try {
    const out = execFileSync('git', ['grep', '--no-color', '-l', '-F', pattern, '--', 'src', 'scripts', 'services', 'tests'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    })

    return out.split('\n').filter(Boolean)
  } catch {
    // git grep sale != 0 cuando no hay match.
    return []
  }
}

interface CapabilityReach {
  key: string
  module: GreenhouseEntitlementModule
  reach: Record<ReachBucket, number>
  classification: CapabilityClass
  nexaReadable: boolean
  nexaActionable: boolean
}

// ── Cobertura de Nexa (curada, verificada contra src/lib/nexa/nexa-tools.ts) ──
// Mapea cada tool de Nexa a las capabilities / dominios que efectivamente opera.
// readableModules: módulos cuyo dato Nexa puede LEER vía un tool.
// actionableCapabilities: capabilities que Nexa puede ACCIONAR (propose→confirm→execute).
const NEXA_READABLE_MODULES = new Set<GreenhouseEntitlementModule>([
  'hr', // check_payroll, explain_my_pay (member-self)
  'finance', // pending_invoices
  'agency', // get_otd (pulso global)
  'organization', // get_otd (org activa)
  'people', // get_capacity
  'admin', // check_emails (email delivery health)
  'knowledge' // search_knowledge (knowledge.agentic.retrieve)
])

// Nexa hoy solo acciona acciones registradas en el action runtime (TASK-1137).
// Capability registrada: mark_notifications_read (no es una capability del catálogo
// de entitlements; es una acción del registry de Nexa). No hay capability del catálogo
// que Nexa pueda mutar todavía.
const NEXA_ACTIONABLE_CAPABILITY_KEYS = new Set<string>([])

const classify = (reach: Record<ReachBucket, number>): CapabilityClass => {
  const api = reach.api
  const lib = reach.lib + reach.nexa
  const ui = reach.ui

  if (api > 0 && lib > 0) return 'governed'
  if (api > 0 && lib === 0) return 'api-inline'
  if (lib > 0 && api === 0) return 'lib-only'
  if (ui > 0) return 'ui-only'

  return 'declared-unwired'
}

const buildCapabilityReach = (): CapabilityReach[] =>
  ENTITLEMENT_CAPABILITY_CATALOG.map(entry => {
    const files = gitGrepFiles(`'${entry.key}'`).filter(file => !isDefinitional(file))
    const reach: Record<ReachBucket, number> = { api: 0, lib: 0, nexa: 0, ui: 0, test: 0, cli: 0, other: 0 }

    for (const file of files) {
      reach[bucketOf(file)] += 1
    }

    return {
      key: entry.key,
      module: entry.module,
      reach,
      classification: classify(reach),
      nexaReadable: NEXA_READABLE_MODULES.has(entry.module),
      nexaActionable: NEXA_ACTIONABLE_CAPABILITY_KEYS.has(entry.key)
    }
  })

// ── Mutation-route governance ────────────────────────────────────────────────

type RouteAuthClass = 'capability-governed' | 'session-coarse' | 'external' | 'unguarded-review'

interface MutationRoute {
  file: string
  methods: string[]
  authClass: RouteAuthClass
}

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const

const listMutationRouteFiles = (): string[] => {
  // Route files con al menos un export de método mutador.
  const patterns = MUTATION_METHODS.flatMap(method => [`export const ${method}`, `export async function ${method}`, `export function ${method}`])
  const files = new Set<string>()

  for (const pattern of patterns) {
    try {
      const out = execFileSync('git', ['grep', '--no-color', '-l', '-F', pattern, '--', 'src/app/api'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

      out
        .split('\n')
        .filter(file => file.endsWith('/route.ts'))
        .forEach(file => files.add(file))
    } catch {
      // sin match para este patrón
    }
  }

  return [...files].sort()
}

const readFileSafe = (file: string): string => {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}

const detectMethods = (content: string): string[] =>
  MUTATION_METHODS.filter(method => new RegExp(`export\\s+(?:const|async\\s+function|function)\\s+${method}\\b`).test(content))

const classifyRouteAuth = (content: string): RouteAuthClass => {
  // Capability-governed: `can(` directo, o un wrapper `authorize*(...)` al que se le
  // pasa una capability dotted (p. ej. authorizeLifecycle('client.lifecycle.case.open')).
  const capabilityGoverned = /\bcan\(/.test(content) || /authoriz\w*\(\s*['"][a-z][a-z_]*\.[a-z_.]+['"]/i.test(content)

  if (capabilityGoverned) return 'capability-governed'

  // Auth de máquina o flujos por token (webhook / cron / agente / bypass / invite /
  // reset password) — gobernados por otro contrato, NO deuda de parity de sesión humana.
  const externalMarkers =
    /verifySignature|x-hub-signature|createHmac|verifyWebhook|CRON_SECRET|AGENT_AUTH_SECRET|x-vercel-protection-bypass|verifyCronRequest|verifyScimToken|SCIM_|consumeToken|validateToken|auth-tokens|magic-link/i

  if (externalMarkers.test(content)) return 'external'

  // Sesión humana / tenant sin capability fina → candidato a deuda de parity (admin-coarse).
  const sessionMarkers =
    /getServerAuthSession|requireServerSession|require\w*TenantContext|getTenantContext|authoriz\w*\(|assertCan|ensureCan|assertTenant|requireRole|requireCapability|requireMember/

  if (sessionMarkers.test(content)) return 'session-coarse'

  return 'unguarded-review'
}

const buildMutationRoutes = (): MutationRoute[] =>
  listMutationRouteFiles().map(file => {
    const content = readFileSafe(file)

    return { file, methods: detectMethods(content), authClass: classifyRouteAuth(content) }
  })

// ── Reporte ──────────────────────────────────────────────────────────────────

interface CoverageReport {
  generatedAt: string
  capabilityTotal: number
  byClassification: Record<CapabilityClass, number>
  byModule: Record<string, Record<CapabilityClass, number>>
  nexaReadableCapabilities: number
  nexaActionableCapabilities: number
  mutationRouteTotal: number
  byRouteAuth: Record<RouteAuthClass, number>
  capabilities: CapabilityReach[]
  sessionCoarseRoutes: string[]
  unguardedRoutes: string[]
}

const emptyClassCounts = (): Record<CapabilityClass, number> => ({
  governed: 0,
  'api-inline': 0,
  'lib-only': 0,
  'ui-only': 0,
  'declared-unwired': 0
})

const buildReport = (): CoverageReport => {
  const capabilities = buildCapabilityReach()
  const routes = buildMutationRoutes()

  const byClassification = emptyClassCounts()
  const byModule: Record<string, Record<CapabilityClass, number>> = {}

  for (const moduleKey of ENTITLEMENT_MODULES) byModule[moduleKey] = emptyClassCounts()

  for (const cap of capabilities) {
    byClassification[cap.classification] += 1
    byModule[cap.module][cap.classification] += 1
  }

  const byRouteAuth: Record<RouteAuthClass, number> = {
    'capability-governed': 0,
    'session-coarse': 0,
    external: 0,
    'unguarded-review': 0
  }

  for (const route of routes) byRouteAuth[route.authClass] += 1

  return {
    generatedAt: new Date().toISOString(),
    capabilityTotal: capabilities.length,
    byClassification,
    byModule,
    nexaReadableCapabilities: capabilities.filter(cap => cap.nexaReadable).length,
    nexaActionableCapabilities: capabilities.filter(cap => cap.nexaActionable).length,
    mutationRouteTotal: routes.length,
    byRouteAuth,
    capabilities,
    sessionCoarseRoutes: routes.filter(route => route.authClass === 'session-coarse').map(route => route.file),
    unguardedRoutes: routes.filter(route => route.authClass === 'unguarded-review').map(route => route.file)
  }
}

const pct = (part: number, total: number) => (total === 0 ? '0%' : `${Math.round((part / total) * 100)}%`)

const renderMarkdown = (report: CoverageReport): string => {
  const lines: string[] = []

  lines.push('# Full API Parity — coverage report (TASK-1172 reader)')
  lines.push('')
  lines.push(`Generado: ${report.generatedAt}`)
  lines.push('')
  lines.push('## 1. Cobertura de capabilities (consumer-reach)')
  lines.push('')
  lines.push(`Total capabilities en catálogo: **${report.capabilityTotal}**`)
  lines.push('')
  lines.push('| Clasificación | Conteo | % |')
  lines.push('|---|---:|---:|')

  for (const cls of Object.keys(report.byClassification) as CapabilityClass[]) {
    lines.push(`| ${CLASS_BADGE[cls]} | ${report.byClassification[cls]} | ${pct(report.byClassification[cls], report.capabilityTotal)} |`)
  }

  lines.push('')
  lines.push('### Por módulo')
  lines.push('')
  lines.push('| Módulo | governed | api-inline | lib-only | ui-only | declared-unwired |')
  lines.push('|---|---:|---:|---:|---:|---:|')

  for (const moduleKey of ENTITLEMENT_MODULES) {
    const counts = report.byModule[moduleKey]
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0)

    if (total === 0) continue

    lines.push(
      `| ${moduleKey} | ${counts.governed} | ${counts['api-inline']} | ${counts['lib-only']} | ${counts['ui-only']} | ${counts['declared-unwired']} |`
    )
  }

  lines.push('')
  lines.push('## 2. Operabilidad de Nexa')
  lines.push('')
  lines.push(`Capabilities con LECTURA cubierta por un tool de Nexa: **${report.nexaReadableCapabilities} / ${report.capabilityTotal}** (${pct(report.nexaReadableCapabilities, report.capabilityTotal)})`)
  lines.push(`Capabilities ACCIONABLES por Nexa (propose→confirm→execute): **${report.nexaActionableCapabilities} / ${report.capabilityTotal}** (${pct(report.nexaActionableCapabilities, report.capabilityTotal)})`)
  lines.push('')
  lines.push('> Nexa cubre lectura por módulo de dominio (8 tools), no por capability fina. La acción gobernada está en `mark_notifications_read` (registry de Nexa, no del catálogo de entitlements). Ver `src/lib/nexa/nexa-tools.ts`.')
  lines.push('')
  lines.push('## 3. Gobernanza de routes de mutación')
  lines.push('')
  lines.push(`Total routes de mutación (POST/PUT/PATCH/DELETE): **${report.mutationRouteTotal}**`)
  lines.push('')
  lines.push('| Auth class | Conteo | % | Lectura |')
  lines.push('|---|---:|---:|---|')
  lines.push(`| capability-governed | ${report.byRouteAuth['capability-governed']} | ${pct(report.byRouteAuth['capability-governed'], report.mutationRouteTotal)} | usa \`can(\` |`)
  lines.push(`| session-coarse | ${report.byRouteAuth['session-coarse']} | ${pct(report.byRouteAuth['session-coarse'], report.mutationRouteTotal)} | sesión/route-group sin \`can(\` **en el boundary** → cola de revisión parity |`)
  lines.push(`| external | ${report.byRouteAuth.external} | ${pct(report.byRouteAuth.external, report.mutationRouteTotal)} | webhook/cron/agente/token (gobernado por otro contrato) |`)
  lines.push(`| unguarded-review | ${report.byRouteAuth['unguarded-review']} | ${pct(report.byRouteAuth['unguarded-review'], report.mutationRouteTotal)} | sin guard reconocible → revisar |`)
  lines.push('')
  lines.push('> ⚠️ `session-coarse` es señal de boundary, NO veredicto de deuda: cuenta routes sin `can(` **en el archivo del route**. El patrón canónico de Full API Parity empuja la lógica (y a veces el `can()`) al command en `src/lib/**` — esos routes están gobernados a nivel capability aunque el route solo tenga el tenant-gate (ej. `enable-sync`: route con `requireInternalTenantContext` + command con `can(\'delivery.ico.sync.enable\')`). Esta cola requiere verificación per-route: capability en el command ⇒ OK; sin capability en ninguna capa ⇒ deuda admin-coarse real.')
  lines.push('')

  if (report.unguardedRoutes.length > 0) {
    lines.push('### Routes unguarded-review (revisar manualmente)')
    lines.push('')
    report.unguardedRoutes.forEach(file => lines.push(`- \`${file}\``))
    lines.push('')
  }

  lines.push('---')
  lines.push('')
  lines.push('Reader: `scripts/audit/full-api-parity-coverage.ts`. Re-ejecutable e idempotente (misma fuente → mismo mapa).')

  return lines.join('\n')
}

// ── Entrypoint ────────────────────────────────────────────────────────────────

const main = () => {
  const args = process.argv.slice(2)
  const report = buildReport()

  const outIndex = args.indexOf('--out')

  if (outIndex >= 0 && args[outIndex + 1]) {
    writeFileSync(args[outIndex + 1], JSON.stringify(report, null, 2))
    process.stdout.write(`Reporte JSON escrito en ${args[outIndex + 1]}\n`)

    return
  }

  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)

    return
  }

  process.stdout.write(`${renderMarkdown(report)}\n`)
}

main()
