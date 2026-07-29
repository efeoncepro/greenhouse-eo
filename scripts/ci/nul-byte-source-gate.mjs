#!/usr/bin/env node
/**
 * NUL byte source gate (canonical).
 *
 * Bug class (TASK-1566, cuatro apariciones medidas el 2026-07-26): un archivo de
 * texto con un byte NUL crudo (`U+0000`) es **UTF-8 valido y compila perfecto**,
 * pero las heuristicas de contenido lo clasifican como BINARIO. Consecuencia dura:
 * `grep` / `git grep` / `ripgrep` lo **saltan en silencio** — no avisan "salte un
 * binario", simplemente no lo listan. Un simbolo que si existe "no aparece", y se
 * concluye que no existe.
 *
 * Ocurrencias corregidas en el mismo barrido:
 *   - `efeonce-globe/packages/domain/src/credit-funding.ts` — 3 NUL como separador
 *     de clave (el original; hizo invisible dos veces el simbolo buscado).
 *   - `efeonce-globe/packages/domain/src/media-derivatives.ts` — 1 NUL en el
 *     separador de `mediaDerivativeId`.
 *   - `docs/tasks/in-progress/TASK-1566-*.md` y
 *     `.claude/skills/greenhouse-globe/SKILL.md` — el byte literal escrito **dentro
 *     de la propia linea que ensena a no escribirlo**.
 *
 * El fix es siempre el mismo y es runtime-identico: escribir la secuencia de escape
 * (dos caracteres en el fuente) en vez del byte literal. En JS/TS esa escape produce
 * exactamente `String.fromCharCode(0)`, asi que ningun hash, id derivado ni clave
 * de idempotencia cambia de valor.
 *
 * Ningun gate previo lo atrapaba: no es un error de tipos, ni de lint, ni de build.
 * Este lo mueve a un fallo loud y barato.
 *
 * Uso: node scripts/ci/nul-byte-source-gate.mjs   (pnpm nul-byte-gate)
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

const NUL = String.fromCharCode(0)

/**
 * Extensiones de texto donde un NUL nunca es legitimo. Se excluye deliberadamente
 * todo lo binario por definicion (imagenes, fuentes, PDFs): ahi el NUL es
 * contenido, no defecto.
 */
const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.md',
  '.mdx',
  '.json',
  '.sql',
  '.yml',
  '.yaml',
  '.tf',
  '.tfvars',
  '.sh',
  '.css',
  '.scss',
  '.html',
  '.txt',
  '.toml'
])

/** Archivos que legitimamente contienen bytes NUL (fixtures de este mismo gate). */
const ALLOWLIST = new Set([])

const MAX_BYTES = 8 * 1024 * 1024

/** True cuando la extension de la ruta declara contenido de texto. */
export const isTextPath = relativePath => TEXT_EXTENSIONS.has(extname(relativePath).toLowerCase())

/**
 * Inspecciona el contenido de un archivo. Devuelve `null` cuando esta limpio, o el
 * hallazgo (conteo, linea y contexto legible) cuando hay al menos un NUL.
 */
export const inspectBytes = (relativePath, bytes) => {
  const offset = bytes.indexOf(0)

  if (offset === -1) return null

  const lineNumber = bytes.subarray(0, offset).toString('utf8').split('\n').length
  const from = Math.max(0, offset - 60)

  const context = bytes
    .subarray(from, offset + 60)
    .toString('utf8')
    .split(NUL)
    .join('[NUL]')
    .split('\n')
    .join('\\n')
    .trim()

  let count = 0

  for (const byte of bytes) {
    if (byte === 0) count += 1
  }

  return { path: relativePath, count, lineNumber, context }
}

const listTrackedFiles = () =>
  execFileSync('git', ['ls-files', '-z'], { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 })
    .toString('utf8')
    .split(NUL)
    .filter(Boolean)

/** Barre el repo trackeado. Devuelve el exit code (0 limpio, 1 con hallazgos). */
export const runNulByteSourceGate = () => {
  const findings = []

  for (const relativePath of listTrackedFiles()) {
    if (ALLOWLIST.has(relativePath)) continue
    if (!isTextPath(relativePath)) continue

    const absolutePath = join(repoRoot, relativePath)

    let size

    try {
      size = statSync(absolutePath).size
    } catch {
      // Trackeado pero ausente en el working tree (checkout parcial, rename a medias).
      // No es asunto de este gate.
      continue
    }

    if (size > MAX_BYTES) continue

    const finding = inspectBytes(relativePath, readFileSync(absolutePath))

    if (finding) findings.push(finding)
  }

  if (findings.length === 0) {
    console.log('nul-byte-source-gate: OK — sin bytes NUL crudos en archivos de texto trackeados.')

    return 0
  }

  console.error(
    `\nnul-byte-source-gate: BLOCK — ${findings.length} archivo(s) de texto con byte(s) NUL crudo(s).\n`
  )
  console.error(
    'Un NUL crudo hace que grep / git grep / ripgrep salten el archivo EN SILENCIO: el\n' +
      'simbolo esta pero no aparece. Reemplazar el byte por su secuencia de escape (dos\n' +
      'caracteres); en JS/TS es runtime-identico, asi que ningun id derivado cambia.\n'
  )

  for (const finding of findings) {
    console.error(`  - ${finding.path}:${finding.lineNumber} — ${finding.count} NUL`)
    console.error(`      ...${finding.context}...`)
  }

  console.error('')

  return 1
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) process.exit(runNulByteSourceGate())
