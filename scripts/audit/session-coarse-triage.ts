/**
 * TASK-1178 — Triage de las routes `session-coarse` (deriva del reader TASK-1172).
 *
 * Read-only y self-contained (NO spawnea el reader; replica su enumeración +
 * clasificación de auth para correr en proceso, importable por el guard de CI).
 *
 * Qué hace: enumera las routes de mutación (`POST/PUT/PATCH/DELETE`) bajo
 * `src/app/api/**`, toma las clasificadas `session-coarse` (sesión/route-group sin
 * `can(` en el archivo del route) y, por cada una, traza sus imports hacia
 * `src/lib/**` (depth ≤ 2) buscando un capability-check en el COMMAND. El patrón
 * canónico de Full API Parity empuja el `can()` al command en `src/lib` — esos
 * routes están gobernados a nivel capability aunque el reader los marque
 * session-coarse (el `can(` no vive en el archivo del route).
 *
 * Clasificación resultante:
 *   - command-governed : el route delega en un command de `src/lib` que chequea
 *                        capability en alguna capa alcanzable (depth ≤ 2). NO es deuda.
 *   - debt-candidate   : ni el route ni ningún command alcanzable chequean capability
 *                        → deuda admin-coarse real, cola de backfill / revisión.
 *
 * Uso:
 *   pnpm tsx scripts/audit/session-coarse-triage.ts            # reporte markdown
 *   pnpm tsx scripts/audit/session-coarse-triage.ts --json     # JSON
 *   pnpm tsx scripts/audit/session-coarse-triage.ts --out f.json
 *
 * NO remedia: produce la cola priorizable. El guard anti-regresión (TASK-1178 Slice 3)
 * la consume para que NINGUNA route nueva nazca session-coarse sin capability.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export const REPO_ROOT = path.resolve(__dirname, '..', '..')

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const

// ── Clasificación de auth en el boundary del route (alineada con el reader 1172) ─

type RouteAuthClass = 'capability-governed' | 'session-coarse' | 'external' | 'unguarded-review'

const classifyRouteAuth = (content: string): RouteAuthClass => {
  const capabilityGoverned =
    /\bcan\(/.test(content) || /authoriz\w*\(\s*['"][a-z][a-z_]*\.[a-z_.]+['"]/i.test(content)

  if (capabilityGoverned) return 'capability-governed'

  const externalMarkers =
    /verifySignature|x-hub-signature|createHmac|verifyWebhook|CRON_SECRET|AGENT_AUTH_SECRET|x-vercel-protection-bypass|verifyCronRequest|verifyScimToken|SCIM_|consumeToken|validateToken|auth-tokens|magic-link/i

  if (externalMarkers.test(content)) return 'external'

  const sessionMarkers =
    /getServerAuthSession|requireServerSession|require\w*TenantContext|getTenantContext|authoriz\w*\(|assertCan|ensureCan|assertTenant|requireRole|requireCapability|requireMember/

  if (sessionMarkers.test(content)) return 'session-coarse'

  return 'unguarded-review'
}

// ── Detector de capability-check en commands (más amplio que el del boundary) ───

const CAPABILITY_CHECK =
  /\bcan\(|\bassertCan\(|\bensureCan\(|\brequireCapability\(|\bhasEntitlement\(|authoriz\w*\(\s*[^)]*['"][a-z][a-z_]*\.[a-z_.]+['"]/i

const hasCapabilityCheck = (content: string): boolean => CAPABILITY_CHECK.test(content)

// ── Lectura + enumeración ───────────────────────────────────────────────────────

const readFileSafe = (file: string): string => {
  try {
    return readFileSync(path.join(REPO_ROOT, file), 'utf8')
  } catch {
    return ''
  }
}

const listMutationRouteFiles = (): string[] => {
  const patterns = MUTATION_METHODS.flatMap(method => [
    `export const ${method}`,
    `export async function ${method}`,
    `export function ${method}`
  ])

  const files = new Set<string>()

  for (const pattern of patterns) {
    try {
      const out = execFileSync('git', ['grep', '--no-color', '-l', '-F', pattern, '--', 'src/app/api'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024
      })

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

const detectMethods = (content: string): string[] =>
  MUTATION_METHODS.filter(method => new RegExp(`export\\s+(?:const|async\\s+function|function)\\s+${method}\\b`).test(content))

// ── Resolución de imports route → src/lib (depth-limited BFS) ────────────────────

const extractImportSpecifiers = (content: string): string[] => {
  const specifiers = new Set<string>()
  const importRe = /from\s+['"]([^'"]+)['"]/g
  let match: RegExpExecArray | null

  while ((match = importRe.exec(content)) !== null) specifiers.add(match[1])

  return [...specifiers]
}

const resolveLibFile = (specifier: string, fromFile: string): string | null => {
  let baseRel: string | null = null

  if (specifier.startsWith('@/')) {
    baseRel = path.join('src', specifier.slice(2))
  } else if (specifier.startsWith('.')) {
    const fromDir = path.dirname(fromFile)

    baseRel = path.relative(REPO_ROOT, path.resolve(path.join(REPO_ROOT, fromDir), specifier))
  } else {
    return null // paquete externo
  }

  // Solo seguimos imports al árbol de commands de dominio.
  if (!baseRel.startsWith(path.join('src', 'lib'))) return null

  const candidates = [`${baseRel}.ts`, `${baseRel}.tsx`, path.join(baseRel, 'index.ts'), path.join(baseRel, 'index.tsx')]

  for (const candidate of candidates) {
    if (existsSync(path.join(REPO_ROOT, candidate))) return candidate
  }

  return null
}

/**
 * ¿Alguna capa alcanzable desde `routeFile` (route + imports lib depth ≤ maxDepth)
 * tiene un capability-check? BFS sobre el grafo de imports, limitándose a src/lib.
 */
const reachesCapabilityCheck = (routeFile: string, maxDepth = 2): { governed: boolean; evidence: string | null } => {
  const visited = new Set<string>()
  const queue: Array<{ file: string; depth: number }> = [{ file: routeFile, depth: 0 }]

  while (queue.length > 0) {
    const { file, depth } = queue.shift() as { file: string; depth: number }

    if (visited.has(file)) continue
    visited.add(file)

    const content = readFileSafe(file)

    if (!content) continue
    if (hasCapabilityCheck(content)) return { governed: true, evidence: file }
    if (depth >= maxDepth) continue

    for (const specifier of extractImportSpecifiers(content)) {
      const libFile = resolveLibFile(specifier, file)

      if (libFile && !visited.has(libFile)) queue.push({ file: libFile, depth: depth + 1 })
    }
  }

  return { governed: false, evidence: null }
}

// ── Triage ───────────────────────────────────────────────────────────────────

export interface TriageRow {
  file: string
  domain: string
  methods: string[]
  governed: boolean
  evidence: string | null
}

const domainOf = (file: string): string => file.replace('src/app/api/', '').split('/')[0]

export interface TriageReport {
  generatedAt: string
  mutationRouteTotal: number
  sessionCoarseTotal: number
  commandGoverned: number
  debtCandidates: number
  byDomain: Record<string, { total: number; governed: number; debt: number }>
  debt: TriageRow[]
  governed: TriageRow[]
}

/** Construye el triage en proceso (sin spawnear el reader). Importable por el guard. */
export const buildTriageReport = (): TriageReport => {
  const rows: TriageRow[] = []

  for (const file of listMutationRouteFiles()) {
    const content = readFileSafe(file)

    if (classifyRouteAuth(content) !== 'session-coarse') continue

    const { governed, evidence } = reachesCapabilityCheck(file)

    rows.push({ file, domain: domainOf(file), methods: detectMethods(content), governed, evidence })
  }

  const byDomain: Record<string, { total: number; governed: number; debt: number }> = {}

  for (const row of rows) {
    byDomain[row.domain] ??= { total: 0, governed: 0, debt: 0 }
    byDomain[row.domain].total += 1
    if (row.governed) byDomain[row.domain].governed += 1
    else byDomain[row.domain].debt += 1
  }

  return {
    generatedAt: new Date().toISOString(),
    mutationRouteTotal: listMutationRouteFiles().length,
    sessionCoarseTotal: rows.length,
    commandGoverned: rows.filter(row => row.governed).length,
    debtCandidates: rows.filter(row => !row.governed).length,
    byDomain,
    debt: rows.filter(row => !row.governed),
    governed: rows.filter(row => row.governed)
  }
}

const renderMarkdown = (report: TriageReport): string => {
  const lines: string[] = []

  lines.push('# TASK-1178 — Triage session-coarse → deuda de capability fina')
  lines.push('')
  lines.push(`Generado: ${report.generatedAt}`)
  lines.push('')
  lines.push(`Total session-coarse: **${report.sessionCoarseTotal}**`)
  lines.push(`- command-governed (can() en el command, depth ≤ 2) — NO deuda: **${report.commandGoverned}**`)
  lines.push(`- debt-candidate (sin capability en ninguna capa alcanzable): **${report.debtCandidates}**`)
  lines.push('')
  lines.push('## Por dominio (solo con deuda)')
  lines.push('')
  lines.push('| Dominio | session-coarse | command-governed | deuda |')
  lines.push('|---|---:|---:|---:|')

  for (const [domain, counts] of Object.entries(report.byDomain).sort((a, b) => b[1].debt - a[1].debt)) {
    if (counts.debt === 0) continue
    lines.push(`| ${domain} | ${counts.total} | ${counts.governed} | ${counts.debt} |`)
  }

  lines.push('')
  lines.push('## Cola de deuda (debt-candidate)')
  lines.push('')
  lines.push('| Route | métodos |')
  lines.push('|---|---|')

  for (const row of report.debt) lines.push(`| \`${row.file}\` | ${row.methods.join(', ')} |`)

  lines.push('')
  lines.push(
    '> Heurística: traza imports route → `src/lib/**` depth ≤ 2 buscando un capability-check. Falsos positivos posibles (capability vía wrapper no detectado); cada candidato se verifica a mano antes de remediar.'
  )

  return lines.join('\n')
}

const main = () => {
  const args = process.argv.slice(2)
  const report = buildTriageReport()
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

if (require.main === module) main()
