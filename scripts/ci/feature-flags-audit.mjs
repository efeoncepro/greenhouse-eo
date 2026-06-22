#!/usr/bin/env node
/**
 * Feature Flag Audit — anti deuda cognitiva (TASK-1079 follow-up)
 * ============================================================================
 * Cruza los env-var flags (`*_ENABLED`) referenciados en código contra el estado
 * real en Vercel (`vercel env ls`) y contra el ledger humano
 * `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`, y resalta la deuda:
 *
 *   1. 📒 Flags en código SIN registrar en el ledger.
 *   2. 🟡 Flags ON en staging pero NO en Production (candidatos a flip de prod).
 *   3. ⚪ Flags en código sin setear en NINGÚN environment (OFF/default everywhere).
 *   4. 🧹 Env vars `*_ENABLED` en Vercel pero SIN referencia en código (posible muerto).
 *
 * Uso:
 *   pnpm flags:audit            # reporte humano (advisory, exit 0)
 *   pnpm flags:audit --strict   # exit 1 si hay flags en código sin registrar en el ledger
 *   pnpm flags:audit --no-vercel# omite la comparación con Vercel (solo código vs ledger)
 *
 * La verdad live sigue siendo `vercel env ls`; este script es la pasada mecánica
 * que alimenta el ledger. NO muta nada (read-only).
 */

import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = process.cwd()
const SCAN_DIRS = ['src', 'services']
const CODE_EXT = new Set(['.ts', '.tsx', '.mjs', '.js', '.cjs'])
const LEDGER_PATH = 'docs/operations/FEATURE_FLAG_STATE_LEDGER.md'
const VERCEL_SCOPE = 'efeonce-7670142f'
const FLAG_RE = /process\.env\.((?:NEXT_PUBLIC_)?[A-Z0-9_]+_ENABLED)\b/g
const FLAG_NAME_RE = /^(?:NEXT_PUBLIC_)?[A-Z0-9_]+_ENABLED$/

const argv = process.argv.slice(2)
const STRICT = argv.includes('--strict')
const NO_VERCEL = argv.includes('--no-vercel')

// ── 1. Flags referenciados en código ─────────────────────────────────────────

const codeFlags = new Set()

const walk = dir => {
  let entries

  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    const full = join(dir, entry.name)

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) continue
      walk(full)
    } else if (CODE_EXT.has(extname(entry.name))) {
      let text

      try {
        text = readFileSync(full, 'utf8')
      } catch {
        continue
      }

      let m

      FLAG_RE.lastIndex = 0
      while ((m = FLAG_RE.exec(text)) !== null) codeFlags.add(m[1])
    }
  }
}

for (const d of SCAN_DIRS) {
  try {
    if (statSync(join(ROOT, d)).isDirectory()) walk(join(ROOT, d))
  } catch {
    /* dir ausente */
  }
}

// ── 2. Estado en Vercel (vercel env ls) ──────────────────────────────────────

/** @type {Map<string, Set<string>>} flag → set de environments */
const vercelFlags = new Map()
let vercelOk = false

if (!NO_VERCEL) {
  try {
    const out = execSync(`vercel env ls --scope ${VERCEL_SCOPE}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 60_000
    })

    vercelOk = true

    for (const rawLine of out.split('\n')) {
      const line = rawLine.trim()

      if (!line) continue
      const cols = line.split(/\s{2,}/)
      const name = cols[0]

      if (!FLAG_NAME_RE.test(name)) continue // ignora header + env vars no-flag
      const envsField = cols[2] ?? ''
      const envs = envsField.split(/[,\s]+/).filter(Boolean)

      if (!vercelFlags.has(name)) vercelFlags.set(name, new Set())
      for (const e of envs) vercelFlags.get(name).add(e)
    }
  } catch {
    vercelOk = false
  }
}

// ── 3. Ledger (registro humano) ──────────────────────────────────────────────

let ledgerText = ''

try {
  ledgerText = readFileSync(join(ROOT, LEDGER_PATH), 'utf8')
} catch {
  /* sin ledger todavía */
}

// ── 4. Cómputo ───────────────────────────────────────────────────────────────

const sortedCode = [...codeFlags].sort()

const unregistered = sortedCode.filter(f => !ledgerText.includes(f))

const isProd = e => /^prod/i.test(e)
const isStaging = e => /^staging$/i.test(e)

const stagingNotProd = []
const offEverywhere = []

if (vercelOk) {
  for (const f of sortedCode) {
    const envs = vercelFlags.get(f)

    if (!envs || envs.size === 0) {
      offEverywhere.push(f)
      continue
    }

    const hasStaging = [...envs].some(isStaging)
    const hasProd = [...envs].some(isProd)

    if (hasStaging && !hasProd) stagingNotProd.push(f)
  }
}

const orphanEnv = vercelOk ? [...vercelFlags.keys()].filter(f => !codeFlags.has(f)).sort() : []

// ── 5. Reporte ───────────────────────────────────────────────────────────────

const C = { reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m', yellow: '\x1b[33m', red: '\x1b[31m', green: '\x1b[32m', cyan: '\x1b[36m' }
const c = (color, s) => `${C[color]}${s}${C.reset}`

console.log(`\n${c('bold', 'Feature Flag Audit')} ${c('dim', `— ${sortedCode.length} flags en código`)}`)

if (!vercelOk && !NO_VERCEL) {
  console.log(c('yellow', '\n  ⚠ No se pudo leer `vercel env ls` (¿auth/scope?). Corriendo solo código vs ledger.'))
}

const section = (icon, title, items, render) => {
  console.log(`\n${icon} ${c('bold', title)} ${c('dim', `(${items.length})`)}`)

  if (items.length === 0) {
    console.log(c('green', '   ✓ ninguno'))
    
return
  }

  for (const it of items) console.log('   ' + render(it))
}

section('📒', 'En código pero SIN registrar en el ledger', unregistered, f =>
  `${c('red', f)} ${c('dim', '→ agregar fila al § Inventario de FEATURE_FLAG_STATE_LEDGER.md')}`
)

if (vercelOk) {
  section('🟡', 'ON en staging pero NO en Production (candidatos a flip de prod)', stagingNotProd, f =>
    `${c('yellow', f)} ${c('dim', `[${[...(vercelFlags.get(f) ?? [])].join(', ')}]`)}`
  )
  section('⚪', 'En código, sin setear en NINGÚN environment (OFF/default everywhere)', offEverywhere, f =>
    `${c('cyan', f)}`
  )
  section('🧹', 'En Vercel pero SIN referencia en código (posible env var muerta)', orphanEnv, f =>
    `${c('dim', f)} ${c('dim', `[${[...(vercelFlags.get(f) ?? [])].join(', ')}]`)}`
  )
}

console.log(`\n${c('dim', 'Verdad live = `vercel env ls`. Ledger humano = docs/operations/FEATURE_FLAG_STATE_LEDGER.md')}\n`)

if (STRICT && unregistered.length > 0) {
  console.log(c('red', `❌ ${unregistered.length} flag(s) en código sin registrar en el ledger (--strict).`))
  process.exit(1)
}

process.exit(0)
