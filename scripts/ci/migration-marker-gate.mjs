#!/usr/bin/env node
/**
 * TASK-838 Fase 2 — Migration Marker Gate
 * ============================================================================
 * Bloquea PRs con migrations que repiten el patrón "Up Migration vacía + DDL
 * bajo Down Migration" — la clase de bug que causó ISSUE-068 (TASK-404
 * governance tables nunca creadas) y TASK-768 Slice 1 (silent failure).
 *
 * Lógica:
 *   1. Walk migrations/*.sql.
 *   2. Por archivo, parsea sección Up (entre `-- Up Migration` y `-- Down Migration`
 *      o EOF) y sección Down (entre `-- Down Migration` y EOF).
 *   3. Detecta el bug si:
 *        - Up section solo contiene whitespace/comentarios (vacía efectiva)
 *        - AND Down section contiene DDL keywords (CREATE TABLE, CREATE INDEX,
 *          ALTER TABLE, CREATE FUNCTION, CREATE TRIGGER, INSERT INTO)
 *   4. Whitelist explícita:
 *        - `EMPTY_UP_INTENT_RE` — comentario `-- intentionally empty: <reason>`
 *        - `BUGGED_LEGACY_FILES` — archivos legacy ya documentados como bugged
 *          (ej. el TASK-404 original que motivó este gate; ya hay forward fix
 *          en TASK-838 — no re-flag).
 *
 * Modos:
 *   - default (error): exit=1 si detecta el bug.
 *   - --warn: warning estructurado, exit=0. Para adopción gradual.
 *
 * Uso local:
 *   pnpm migration-marker-gate
 *   pnpm migration-marker-gate --warn
 *
 * Uso CI: step en .github/workflows/ci.yml.
 *
 * Spec: docs/issues/open/ISSUE-068-task-404-pre-up-marker-bug-governance-tables-never-created.md
 *       docs/tasks/in-progress/TASK-838-issue-068-resolution-fases-1-4.md
 *
 * Pattern source: scripts/ci/vercel-cron-async-critical-gate.mjs (TASK-775).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

const ARGS = process.argv.slice(2)
const WARN_MODE = ARGS.includes('--warn')

const REPO_ROOT = resolve(process.cwd())
const MIGRATIONS_DIR = join(REPO_ROOT, 'migrations')

/**
 * Migrations conocidas como bugged (CREATE TABLE bajo Down) PERO ya tienen
 * forward fix en una migration posterior. No re-flag para no inundar CI.
 *
 * Si emerge un caso nuevo: la disciplina canónica es agregar forward fix
 * (migration nueva con SQL correcto) y agregar el archivo legacy a esta lista
 * (con referencia al ISSUE/TASK que documenta el hallazgo).
 */
const BUGGED_LEGACY_FILES = new Set([
  // TASK-404 governance tables — bugged, fixed forward por TASK-838 (ISSUE-068).
  '20260417044741101_task-404-entitlements-governance.sql'
])

const DDL_KEYWORDS = [
  'CREATE TABLE',
  'CREATE INDEX',
  'CREATE UNIQUE INDEX',
  'CREATE FUNCTION',
  'CREATE OR REPLACE FUNCTION',
  'CREATE TRIGGER',
  'CREATE OR REPLACE TRIGGER',
  'CREATE VIEW',
  'CREATE OR REPLACE VIEW',
  'CREATE MATERIALIZED VIEW',
  'ALTER TABLE',
  'INSERT INTO'
]

const UP_MARKER = /^--\s*Up\s+Migration\s*$/im
const DOWN_MARKER = /^--\s*Down\s+Migration\s*$/im
const EMPTY_UP_INTENT_RE = /--\s*intentionally\s+empty\s*:\s*\S+/i

/**
 * Strips SQL comments + whitespace; returns true if the resulting string
 * contains ANY non-empty token.
 */
const sectionHasNonCommentContent = section => {
  // Strip line comments + block comments + whitespace.
  const stripped = section
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/--[^\n]*/g, '')         // line comments
    .replace(/\s+/g, '')              // all whitespace

  return stripped.length > 0
}

/**
 * Returns the array of DDL keywords found in `section`. Case-insensitive.
 * Strips comments first so a comment mentioning "CREATE TABLE" doesn't trip.
 */
const findDdlKeywords = section => {
  const noComments = section
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\n]*/g, '')

  const found = []

  for (const keyword of DDL_KEYWORDS) {
    const re = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'i')

    if (re.test(noComments)) {
      found.push(keyword)
    }
  }

  return found
}

/**
 * Parse a migration file into { upSection, downSection, hasUpMarker, hasDownMarker }.
 */
export const parseMigrationSections = source => {
  const upMatch = source.match(UP_MARKER)
  const downMatch = source.match(DOWN_MARKER)

  const hasUpMarker = Boolean(upMatch)
  const hasDownMarker = Boolean(downMatch)

  if (!hasUpMarker) {
    return { upSection: '', downSection: source, hasUpMarker: false, hasDownMarker }
  }

  const upStart = upMatch.index + upMatch[0].length
  const downStart = downMatch ? downMatch.index : source.length

  const upSection = source.slice(upStart, downStart)
  const downSection = downMatch ? source.slice(downStart + downMatch[0].length) : ''

  return { upSection, downSection, hasUpMarker, hasDownMarker }
}

const inspectMigration = filename => {
  const path = join(MIGRATIONS_DIR, filename)
  const source = readFileSync(path, 'utf8')

  const { upSection, downSection, hasUpMarker, hasDownMarker } = parseMigrationSections(source)

  const findings = []

  // Legacy convention: archivos sin markers son tratados como whole-file=Up
  // por node-pg-migrate (válido pre-convención canónica). Solo flagear error
  // si falta Up PERO Down está presente (asimetría inválida).
  if (!hasUpMarker && hasDownMarker) {
    findings.push({
      severity: 'error',
      kind: 'down_marker_without_up',
      message:
        'Tiene `-- Down Migration` pero NO `-- Up Migration`. Asimetría inválida: ' +
        'agregar marker Up al inicio del archivo y mover el SQL apropiado debajo.'
    })

    return { filename, findings }
  }

  // Sin markers → legacy implicit Up (no flag; ya aplicado).
  if (!hasUpMarker && !hasDownMarker) {
    return { filename, findings }
  }

  const upHasContent = sectionHasNonCommentContent(upSection)
  const upHasIntentEmptyComment = EMPTY_UP_INTENT_RE.test(upSection)
  const downDdl = hasDownMarker ? findDdlKeywords(downSection) : []

  // Bug class: Up vacía + Down con DDL.
  if (!upHasContent && !upHasIntentEmptyComment && downDdl.length > 0) {
    findings.push({
      severity: 'error',
      kind: 'pre_up_marker_bug',
      message:
        `Sección Up vacía + DDL keywords detectados en sección Down: [${downDdl.join(', ')}]. ` +
        `Esto es exactamente el patrón anti pre-up-marker bug (ISSUE-068, TASK-768 Slice 1). ` +
        `Mover el DDL a la sección Up. Si la Up debe quedar realmente vacía, agregar el comentario ` +
        `\`-- intentionally empty: <reason>\` dentro de la sección Up.`
    })
  }

  // Soft warning: Up con DDL + Down con CREATE/INSERT (no OR REPLACE) + sin DROP.
  // CREATE OR REPLACE FUNCTION/VIEW es válido en Down (revert idempotente a versión
  // previa) — no flag. Solo flag CREATE TABLE/INDEX/TRIGGER nuevos en Down sin DROP.
  if (upHasContent && downDdl.length > 0 && !/\bDROP\b/i.test(downSection)) {
    const dangerousDdl = downDdl.filter(
      kw => !/^CREATE\s+OR\s+REPLACE/i.test(kw) && !/^ALTER\s+TABLE/i.test(kw)
    )

    if (dangerousDdl.length > 0) {
      findings.push({
        severity: 'warning',
        kind: 'down_section_has_ddl_no_drop',
        message:
          `Sección Down tiene DDL [${dangerousDdl.join(', ')}] pero NO tiene DROP. ` +
          `Verificar que esto es intencional — la sección Down debe ser undo (DROP/ALTER ... DROP) ` +
          `o revert idempotente (CREATE OR REPLACE FUNCTION/VIEW), NO extender la migration con más CREATE.`
      })
    }
  }

  return { filename, findings }
}

const main = () => {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .filter(f => {
      const stat = statSync(join(MIGRATIONS_DIR, f))

      return stat.isFile()
    })
    .sort()

  const reports = files.map(inspectMigration)

  const errors = []
  const warnings = []

  for (const report of reports) {
    if (BUGGED_LEGACY_FILES.has(report.filename)) {
      // Legacy bugged file already documented. Skip — but log informational note.
      const errorFindings = report.findings.filter(f => f.severity === 'error')

      if (errorFindings.length > 0) {
         
        console.error(
          `[migration-marker-gate] INFO: ${report.filename} flagged but whitelisted (legacy, fixed forward). ` +
          `Findings: ${errorFindings.map(f => f.kind).join(', ')}.`
        )
      }

      continue
    }

    for (const finding of report.findings) {
      const entry = { file: report.filename, ...finding }

      if (finding.severity === 'error') errors.push(entry)
      else warnings.push(entry)
    }
  }

  if (warnings.length > 0) {
     
    console.warn(`[migration-marker-gate] ${warnings.length} warning(s):`)

    for (const w of warnings) {
       
      console.warn(`  ⚠️  ${w.file} [${w.kind}]: ${w.message}`)
    }
  }

  if (errors.length > 0) {
     
    console.error(`[migration-marker-gate] ${errors.length} error(s):`)

    for (const e of errors) {
       
      console.error(`  ❌ ${e.file} [${e.kind}]: ${e.message}`)
    }

    if (WARN_MODE) {
       
      console.warn('[migration-marker-gate] --warn mode: exit=0 despite errors.')
      process.exit(0)
    }

    process.exit(1)
  }

   
  console.log(`[migration-marker-gate] OK — ${files.length} migrations scanned, 0 errors.`)
}

// CLI entry point. Skip when imported (allows test reuse of helpers).
const __isMainModule =
  import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1])

if (__isMainModule) {
  main()
}
