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
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = process.cwd()
const SCAN_DIRS = ['src', 'services']
const CODE_EXT = new Set(['.ts', '.tsx', '.mjs', '.js', '.cjs'])
const LEDGER_PATH = 'docs/operations/FEATURE_FLAG_STATE_LEDGER.md'
const VERCEL_SCOPE = 'efeonce-7670142f'
const FLAG_RE = /process\.env\.((?:NEXT_PUBLIC_)?[A-Z0-9_]+_ENABLED)\b/g

/**
 * Referencia al flag como STRING LITERAL — `process.env['FLAG']`, `env[FLAG_CONST]` con
 * `const FLAG_CONST = 'FLAG'`, o cualquier otra indirección.
 *
 * 🔴 Por qué hace falta, y por qué el ancla es el literal y no la forma de acceso: un flag
 * leído por indirección **tiene** que nombrarse como string en alguna parte, o no habría cómo
 * indexar `process.env`. El literal es el invariante; la sintaxis de acceso, no.
 *
 * Sin esto, `FLAG_RE` sólo veía la notación de punto y **91 callsites de este repo** usaban la
 * indirección (`env[GROWTH_SEO_WORK_QUEUE_FLAG]` es el patrón de todo `src/lib/growth/seo/flags.ts`).
 * Esos flags quedaban invisibles para el escaneo, con dos consecuencias que no son cosméticas:
 * se reportaban como «env var muerta en Vercel» teniendo lector real, y —lo grave— **escapaban
 * enteros del gate ISSUE-150**, que hace `exit 1` SIEMPRE cuando un flag está prendido en
 * Production sin su código en `main`. El gate existía, el mecanismo lo hacía cumplir, y una
 * clase entera de flags pasaba por al lado sin que nada fallara. Encontrado el 2026-08-29
 * prendiendo `GROWTH_SEO_WORK_QUEUE_ENABLED`: el audit lo clasificó como env var muerta.
 *
 * Sobre-incluir acá es MUY preferible a sub-incluir: el costo de un falso positivo es registrar
 * un flag de más en el ledger; el de un falso negativo es un flag fail-closed vivo en producción
 * sobre código que producción no tiene (ISSUE-150: 5 CV de candidatos en cuarentena 89 minutos).
 */
const FLAG_REF_RE = /['"`]((?:NEXT_PUBLIC_)?[A-Z0-9_]+_ENABLED)['"`]/g
const FLAG_NAME_RE = /^(?:NEXT_PUBLIC_)?[A-Z0-9_]+_ENABLED$/

const argv = process.argv.slice(2)
const STRICT = argv.includes('--strict')
const NO_VERCEL = argv.includes('--no-vercel')

// ── 1. Flags referenciados en código ─────────────────────────────────────────

const codeFlags = new Set()

/**
 * ISSUE-150 — flag → archivos que lo LEEN, en rutas relativas al repo.
 *
 * Hace falta para poder preguntarle a `main` si ese código existe allá. Un flag
 * prendido en Production sobre código que sólo está en `develop` es un
 * fail-closed esperando gente: producción ejecuta la rama vieja, que no sabe
 * nada del comportamiento nuevo.
 */
const flagReaders = new Map()

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

      const relative = full.startsWith(ROOT) ? full.slice(ROOT.length + 1) : full

      // Las DOS formas de nombrar un flag: acceso por punto e indirección por literal.
      // Se recorren ambas sobre el mismo archivo; `Set` deduplica el solapamiento.
      for (const re of [FLAG_RE, FLAG_REF_RE]) {
        let m

        re.lastIndex = 0

        while ((m = re.exec(text)) !== null) {
          codeFlags.add(m[1])

          if (!flagReaders.has(m[1])) flagReaders.set(m[1], new Set())
          flagReaders.get(m[1]).add(relative)
        }
      }
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

// ── 4a. TASK-1699 follow-up — el ledger DECLARA un estado y el valor live es otro ────
//
// 🔴 `vercel env ls` sólo lista PRESENCIA (nombre + environments), nunca el VALOR. Por eso este
// auditor era estructuralmente ciego a la contradicción más cara del ledger: una fila que dice
// `prod: OFF` mientras el valor live es `"true"`.
//
// Medido el 2026-09-01: TRES filas en ese estado (`GROWTH_FORMS_SERVER_VALIDATION_ENABLED`,
// `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED`, `GROWTH_FORMS_CATALOG_API_ENABLED`). El daño no es
// cosmético: el ledger es el SoT humano que un agente lee para decidir si algo está desplegado.
// Si dice "rollout pendiente" sobre algo que lleva meses vivo, el agente RE-EJECUTA trabajo
// terminado — la misma clase de defecto que hizo repetir TASK-1699 cinco veces.
//
// Se compara sólo el caso inequívoco (ledger dice `prod: OFF`, live dice `true`) para que la
// señal sea de alta precisión y no ruido sobre prosa libre. Si no se pueden leer los valores
// (sin auth, sin red, CI), la sección se apaga sola: nunca inventa una contradicción.

const ledgerDeclaresProdOff = flag => {
  for (const line of ledgerText.split('\n')) {
    // Sólo FILAS DE TABLA cuya PRIMERA celda es el flag. Escanear cualquier línea que lo
    // mencione da falsos positivos contra los párrafos narrativos del ledger, que nombran varios
    // flags y las palabras "prod"/"OFF" en cláusulas ajenas — medido: 32 reportados vs 3 reales.
    if (!/^\|\s*`/.test(line)) continue

    const firstCell = line.split('|')[1] ?? ''

    if (firstCell.trim().replace(/`/g, '').split(/\s/)[0] !== flag) continue
    if (/prod(?:ucción|uction)?\s*:\s*OFF/i.test(line)) return true
  }

  return false
}

const ledgerContradictsLive = []
let liveValuesOk = false

if (!NO_VERCEL) {
  const tmp = join(ROOT, '.flags-audit-prod.env')

  try {
    execSync(`vercel env pull ${tmp} --environment=production --scope ${VERCEL_SCOPE}`, {
      encoding: 'utf8',
      stdio: 'pipe'
    })

    const pulled = readFileSync(tmp, 'utf8')

    liveValuesOk = true

    for (const flag of sortedCode) {
      const match = pulled.match(new RegExp(`^${flag}="?([^"\n]*)"?$`, 'm'))

      if (!match) continue
      if (match[1] !== 'true') continue
      if (!ledgerDeclaresProdOff(flag)) continue

      ledgerContradictsLive.push(flag)
    }
  } catch {
    // Sin credenciales/red: la sección se apaga. Un auditor que no puede medir no afirma.
  } finally {
    try {
      rmSync(tmp, { force: true })
    } catch {
      /* nada que limpiar */
    }
  }
}

// ── 4b. ISSUE-150 — flags ON en Production sin su código en `main` ───────────
//
// Producción sirve `main`. Si el código que lee el flag sólo existe en
// `develop`, prenderlo en Production activa una promesa que ese runtime no
// puede cumplir. Con semántica fail-closed —como el escáner de assets— eso no
// degrada: bloquea usuarios reales. Pasó el 2026-08-11 con
// ASSET_MALWARE_SCAN_ENABLED: cinco CV de candidatos en cuarentena por 403.
const prodWithoutCodeOnMain = []
const prodOnDriftedCode = []

if (vercelOk) {
  let mainReachable = true

  try {
    execSync('git rev-parse --verify origin/main', { stdio: 'ignore' })
  } catch {
    mainReachable = false
  }

  if (mainReachable) {
    for (const f of sortedCode) {
      const envs = vercelFlags.get(f)

      if (!envs || ![...envs].some(isProd)) continue

      const readers = [...(flagReaders.get(f) ?? [])]

      // Basta con que UN lector exista en main: el flag tiene a quién activar.
      const presentOnMain = readers.some(rel => {
        try {
          const onMain = execSync(`git show origin/main:${rel}`, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
            maxBuffer: 20 * 1024 * 1024
          })

          return onMain.includes(f)
        } catch {
          return false
        }
      })

      if (!presentOnMain) prodWithoutCodeOnMain.push({ flag: f, readers })
    }

    // El chequeo de arriba sólo ve el caso extremo: el flag no existe en main.
    // El incidente real fue más sutil — el flag SÍ estaba en main desde una task
    // anterior, y lo que faltaba era el comportamiento nuevo que activaba. Por
    // eso importa la DERIVA: si un flag está ON en Production y su código lector
    // difiere entre main y la rama de trabajo, producción está ejecutando una
    // versión distinta de lo que se probó.
    for (const f of sortedCode) {
      const envs = vercelFlags.get(f)

      if (!envs || ![...envs].some(isProd)) continue
      if (prodWithoutCodeOnMain.some(i => i.flag === f)) continue

      const drifted = [...(flagReaders.get(f) ?? [])].filter(rel => {
        try {
          const onMain = execSync(`git show origin/main:${rel}`, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
            maxBuffer: 20 * 1024 * 1024
          })

          return onMain !== readFileSync(join(ROOT, rel), 'utf8')
        } catch {
          return true
        }
      })

      if (drifted.length > 0) prodOnDriftedCode.push({ flag: f, drifted })
    }
  }
}

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

if (liveValuesOk) {
  section(
    '🔴',
    'El ledger DECLARA `prod: OFF` y el valor LIVE es `true` (drift que hace re-ejecutar trabajo hecho)',
    ledgerContradictsLive,
    f =>
      `   ${c('red', f)} — corrige su fila en ${LEDGER_PATH}: alguien va a leer «rollout pendiente» sobre algo vivo`
  )
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

if (vercelOk) {
  section('🚨', 'ON en Production pero su código NO está en `main` (ISSUE-150)', prodWithoutCodeOnMain, item =>
    `${c('red', item.flag)} ${c('dim', `→ lectores sólo en develop: ${item.readers.join(', ')}`)}`
  )
  section('⚠️', 'ON en Production con código lector que difiere de `main` (ISSUE-150)', prodOnDriftedCode, item =>
    `${c('yellow', item.flag)} ${c('dim', `→ producción ejecuta otra versión de: ${item.drifted.join(', ')}`)}`
  )
}

console.log(`\n${c('dim', 'Verdad live = `vercel env pull` (VALORES; `vercel env ls` solo dice que la var EXISTE). Ledger humano = docs/operations/FEATURE_FLAG_STATE_LEDGER.md')}\n`)

if (prodWithoutCodeOnMain.length > 0) {
  // Falla SIEMPRE, no sólo en --strict: esto no es higiene documental, es un
  // flag activo en producción sobre código que producción no tiene.
  console.log(
    c('red', `❌ ${prodWithoutCodeOnMain.length} flag(s) prendidos en Production sin su código en \`main\`.`)
  )
  console.log(c('dim', '   Promover develop→main por el release control plane, o apagar el flag. Ver ISSUE-150.'))
  process.exit(1)
}

if (STRICT && unregistered.length > 0) {
  console.log(c('red', `❌ ${unregistered.length} flag(s) en código sin registrar en el ledger (--strict).`))
  process.exit(1)
}

process.exit(0)
