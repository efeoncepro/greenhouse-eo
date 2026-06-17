#!/usr/bin/env node
/**
 * Nexa Intelligence — Doc Gate (TASK-1124 follow-up).
 *
 * Garantiza que la documentación de las capas de Nexa Intelligence
 * (`docs/architecture/nexa-intelligence/`) se mantenga viva: cuando se toca el
 * código de un dominio Nexa, su(s) doc(s) de capa DEBEN cambiar también; y ningún
 * archivo Nexa nuevo queda sin capa (sin dominio registrado).
 *
 * SSOT del mapeo dominio↔código↔docs: `docs/architecture/nexa-intelligence/manifest.json`.
 *
 * Modos:
 *   --audit   (default)  chequeo estructural: docs existen, domain.docs ⊆ layers,
 *                        cada archivo Nexa pertenece a un dominio o al codeAllowlist.
 *   --changed [--base=<ref>]  vs un ref base (default origin/develop): si cambió código
 *                        de un dominio pero ninguno de sus docs → falla; archivo Nexa
 *                        cambiado sin dominio/allowlist → falla.
 *   --strict             en --audit, convierte warnings de cobertura en fallo (exit 1).
 *
 * Uso:
 *   node scripts/ci/nexa-intelligence-doc-gate.mjs            # audit estructural
 *   node scripts/ci/nexa-intelligence-doc-gate.mjs --changed  # gate de cambios (CI/pre-merge)
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')
const MANIFEST_PATH = join(REPO_ROOT, 'docs', 'architecture', 'nexa-intelligence', 'manifest.json')

const args = process.argv.slice(2)
const MODE_CHANGED = args.includes('--changed')
const STRICT = args.includes('--strict')
const BASE = (args.find(a => a.startsWith('--base=')) || '--base=origin/develop').split('=')[1]

const toPosix = p => p.split('\\').join('/')

const fail = []
const warn = []

// ── Cargar manifest ──────────────────────────────────────────────────────────
if (!existsSync(MANIFEST_PATH)) {
  console.error('✖ Nexa doc gate: no encuentro manifest.json en docs/architecture/nexa-intelligence/')
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
const docsRoot = manifest.docsRoot
const layers = new Set(manifest.layers)
const domains = manifest.domains || []
const codeAllowlist = new Set(manifest.codeAllowlist || [])

// ── Prompt governance (TASK-1126): el system prompt es un artefacto versionado ─────────────────
// El gate .mjs no puede importar el módulo TS, así que parsea NEXA_PROMPT_GOVERNANCE por regex
// (resolviendo los consts string `export const NEXA_SYSTEM_PROMPT_V*_VERSION = '...'`). La SHAPE
// canónica (activeVersion + changelog que referencian esos consts) es load-bearing para este
// parseo: si la cambiás, actualizá el módulo Y este parser. SSOT humano + cómo bumpear:
// `docs/architecture/nexa-intelligence/system-prompt/versioning.md`.
const PROMPT_DOMAIN = domains.find(d => d.key === 'system-prompt')
const PROMPT_SRC = PROMPT_DOMAIN?.code?.[0] || null

const resolveConstStrings = src => {
  const map = new Map()
  const re = /export const (\w+)\s*=\s*'([^']+)'/g
  let m

  while ((m = re.exec(src))) map.set(m[1], m[2])


return map
}

const resolveVersionToken = (token, consts) => {
  const t = token.trim()

  if (/^'[^']*'$/.test(t)) return t.slice(1, -1)


return consts.get(t) ?? t
}

// Devuelve { activeVersion, changelogVersions[] } con los consts resueltos, o null si no parsea.
const parsePromptGovernance = src => {
  if (!src) return null
  const govStart = src.indexOf('NEXA_PROMPT_GOVERNANCE:') // const literal (la interfaz usa NexaPromptGovernance)

  if (govStart === -1) return null
  const consts = resolveConstStrings(src)
  const slice = src.slice(govStart)
  const activeM = slice.match(/activeVersion:\s*([A-Za-z0-9_]+|'[^']+')/)
  const activeVersion = activeM ? resolveVersionToken(activeM[1], consts) : null
  const clIdx = slice.indexOf('changelog:')
  const changelogVersions = []

  if (clIdx !== -1) {
    const re = /\bversion:\s*([A-Za-z0-9_]+|'[^']+')/g
    let m

    while ((m = re.exec(slice.slice(clIdx)))) changelogVersions.push(resolveVersionToken(m[1], consts))
  }


return { activeVersion, changelogVersions }
}

// ── Cobertura: todo archivo Nexa pertenece a un dominio o al allowlist ─────────
const NEXA_LIB_DIR = join(REPO_ROOT, 'src', 'lib', 'nexa')

const collectNexaFiles = (dir, out = []) => {
  if (!existsSync(dir)) return out

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)

    if (st.isDirectory()) collectNexaFiles(full, out)
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(toPosix(relative(REPO_ROOT, full)))
  }

  
return out
}

const domainCode = new Set(domains.flatMap(d => d.code))
const nexaFiles = collectNexaFiles(NEXA_LIB_DIR)
const uncovered = nexaFiles.filter(f => !domainCode.has(f) && !codeAllowlist.has(f))

// ── Audit estructural ──────────────────────────────────────────────────────────
const runAudit = () => {
  // 1. cada layer doc existe
  for (const layer of layers) {
    if (!existsSync(join(REPO_ROOT, docsRoot, layer))) {
      fail.push(`Layer doc declarado pero ausente: ${docsRoot}/${layer}`)
    }
  }

  // 2. cada domain.docs ⊆ layers + cada domain.code existe
  for (const d of domains) {
    for (const doc of d.docs) {
      if (!layers.has(doc)) fail.push(`Dominio "${d.key}": doc "${doc}" no está en manifest.layers`)
    }

    for (const c of d.code) {
      if (!existsSync(join(REPO_ROOT, c))) warn.push(`Dominio "${d.key}": code path ausente (¿movido/borrado?): ${c}`)
    }
  }

  // 3. cobertura: ningún archivo Nexa huérfano
  for (const f of uncovered) {
    const msg = `Archivo Nexa sin capa: ${f} — registralo en un domains[].code (con su doc) o en codeAllowlist del manifest`

    if (STRICT) fail.push(msg)
    else warn.push(msg)
  }
}

// ── Changed gate ───────────────────────────────────────────────────────────────
const sh = cmd => {
  try {
    return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

const resolveChangedFiles = () => {
  const set = new Set()
  const add = out => out.split('\n').map(s => s.trim()).filter(Boolean).forEach(f => set.add(toPosix(f)))
  // commits del branch vs base (si el base resuelve)
  const baseOk = sh(`git rev-parse --verify --quiet ${BASE}`)

  if (baseOk) {
    const mb = sh(`git merge-base HEAD ${BASE}`) || BASE

    add(sh(`git diff --name-only ${mb} HEAD`))
  }

  add(sh('git diff --name-only HEAD')) // unstaged
  add(sh('git diff --name-only --cached')) // staged
  add(sh('git ls-files --others --exclude-standard')) // untracked
  
return set
}

const gitShow = ref => sh(`git show ${ref}`)

// Si cambió el prompt: exigir (A) changelog con una entrada == activeVersion y (B) versión
// bumpeada vs base O changelog que creció. Cierra "cambié el prompt pero no bumpeé la versión".
const checkPromptGovernance = () => {
  if (!PROMPT_SRC) {
    fail.push('manifest sin domain "system-prompt" con code[0] = ruta del prompt — no puedo gobernar versión/changelog del prompt')

    return
  }

  const cur = parsePromptGovernance(readFileSync(join(REPO_ROOT, PROMPT_SRC), 'utf8'))

  if (!cur?.activeVersion) {
    fail.push(`No pude parsear NEXA_PROMPT_GOVERNANCE en ${PROMPT_SRC} (activeVersion/changelog). Mantené la shape canónica (consts string + changelog).`)

    return
  }

  // (A) el changelog debe tener una entrada para la versión activa
  if (!cur.changelogVersions.includes(cur.activeVersion)) {
    fail.push(
      `NEXA_PROMPT_GOVERNANCE.changelog no tiene una entrada para activeVersion "${cur.activeVersion}" — agregá la entrada (más reciente primero).`
    )
  }

  // (B) vs base: si el prompt cambió, la versión debe bumpear o el changelog crecer
  const baseOk = sh(`git rev-parse --verify --quiet ${BASE}`)
  const mergeBase = baseOk ? sh(`git merge-base HEAD ${BASE}`) || BASE : ''
  const base = mergeBase ? parsePromptGovernance(gitShow(`${mergeBase}:${PROMPT_SRC}`)) : null

  if (base?.activeVersion) {
    const bumped = cur.activeVersion !== base.activeVersion
    const grew = cur.changelogVersions.length > base.changelogVersions.length

    if (!bumped && !grew) {
      fail.push(
        `Cambió ${PROMPT_SRC} pero NO se bumpeó la versión (sigue "${cur.activeVersion}") ni creció el changelog de NEXA_PROMPT_GOVERNANCE. Elegí la clase de cambio + bumpeá versión + agregá la entrada de changelog (ver ${docsRoot}/system-prompt/versioning.md).`
      )
    }
  }
}

const runChanged = () => {
  const changed = resolveChangedFiles()
  const docChanged = doc => changed.has(toPosix(`${docsRoot}/${doc}`))

  for (const d of domains) {
    const codeTouched = d.code.some(c => changed.has(c))

    if (!codeTouched) continue
    const anyDocTouched = d.docs.some(docChanged)

    if (!anyDocTouched) {
      fail.push(
        `Dominio Nexa "${d.key}" (${d.label}) cambió en código pero NO se actualizó ninguno de sus docs de capa: ${d.docs.join(', ')}`
      )
    }
  }

  // archivo Nexa cambiado sin dominio/allowlist
  for (const f of uncovered) {
    if (changed.has(f)) {
      fail.push(`Archivo Nexa "${f}" cambió pero no pertenece a ningún dominio ni al codeAllowlist — registralo en el manifest`)
    }
  }

  // prompt governance: si cambió el system prompt, exigir bump de versión + entrada de changelog
  if (PROMPT_SRC && changed.has(PROMPT_SRC)) checkPromptGovernance()

  if (changed.size === 0) warn.push('No detecté archivos cambiados (¿base inalcanzable?). Corré --audit para el chequeo estructural.')
}

// ── Run ──────────────────────────────────────────────────────────────────────
if (MODE_CHANGED) runChanged()
else runAudit()

// ── Report ─────────────────────────────────────────────────────────────────────
const label = MODE_CHANGED ? 'changed' : 'audit'

if (warn.length) {
  console.log(`\n⚠ Nexa doc gate (${label}) — advertencias:`)
  warn.forEach(w => console.log(`  - ${w}`))
}

if (fail.length) {
  console.error(`\n✖ Nexa doc gate (${label}) — FALLA:`)
  fail.forEach(f => console.error(`  - ${f}`))
  console.error('\nAl tocar Nexa, actualizá su(s) doc(s) de capa en docs/architecture/nexa-intelligence/ (ver manifest.json).')
  process.exit(1)
}

console.log(`\n✓ Nexa doc gate (${label}) OK — ${domains.length} dominios, ${layers.size} docs de capa, ${nexaFiles.length} archivos Nexa cubiertos.`)
process.exit(0)
