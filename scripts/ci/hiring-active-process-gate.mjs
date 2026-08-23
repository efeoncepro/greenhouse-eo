#!/usr/bin/env node
/**
 * TASK-1772 Slice 4 — Guardrail preventivo: nadie vuelve a decidir «proceso activo» con una lista
 * literal de etapas.
 *
 * El defecto que persigue: ocho copias de una regla, repartidas en cuatro archivos de dos dominios,
 * derivando por separado cada vez que el vocabulario del pipeline cambia. La definición canónica
 * vive en `src/lib/hiring/active-process.ts` y son TRES ejes; preguntar por etapa responde mal a las
 * tres preguntas a la vez.
 *
 * Nace `--strict`-capable y el árbol pasa limpio HOY, así que puede bloquear desde el primer día —
 * a diferencia del gate de procedencia, que heredó deuda y tuvo que nacer advisory.
 *
 * Tres trampas conocidas, las tres ya pagadas por otros gates del repo:
 *   1. Barre `git ls-files`, así que es CIEGO a lo untracked: correrlo DESPUÉS de `git add` o no
 *      verá el archivo recién creado (ni a sí mismo).
 *   2. No escribe el patrón que persigue como literal suelto — se encontraría a sí mismo y
 *      reportaría un falso positivo eterno sobre su propio código. Los patrones se arman por partes.
 *   3. Salta líneas de COMENTARIO. Explicar por qué el patrón viejo estaba mal exige nombrarlo, y
 *      un gate que castiga su propia documentación empuja a borrar la explicación.
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const STRICT = process.argv.includes('--strict')

// Armados por partes a propósito (trampa 2).
const STAGE = 'stage'
const TERMINAL = ['rejected', 'withdrawn', 'closed']

/**
 * Los dos disfraces del mismo defecto:
 *  - SQL: preguntar por la lista de etapas terminales.
 *  - TS: usar la etapa de cierre como proxy de «sigue en proceso».
 *
 * `stage === 'closed'` en POSITIVO no entra: ésa es una pregunta de presentación («¿pinto el chip
 * Cerrado?»), no de actividad, y prohibirla sería perseguir algo que no es el defecto.
 */
const PATTERNS = [
  { id: 'sql-stage-list', needle: `${STAGE} NOT ${'IN'} (`, hint: `activeProcessPredicate('<alias>')` },
  { id: 'ts-stage-proxy', needle: `${STAGE} !${'=='} '${TERMINAL[2]}'`, hint: 'isActiveProcess(row)' },
  { id: 'ts-stage-proxy-loose', needle: `${STAGE} !${'='} '${TERMINAL[2]}'`, hint: 'isActiveProcess(row)' },
]

const SCANNED_PREFIXES = ['src/lib/hiring/', 'src/views/greenhouse/hiring/']

/**
 * `active-process.ts` es el DUEÑO de la definición: su docstring compara el predicado viejo con el
 * nuevo y la medición que lo justifica, así que nombrarlo ahí es el punto.
 *
 * `hiring-active-process-drift.ts` (fuera del scope escaneado, pero declarado acá para que quede
 * escrito) es el otro lugar legítimo: la señal existe para CONFRONTAR los dos predicados, así que
 * necesita ejecutar el viejo.
 */
const EXEMPT = new Set([
  'src/lib/hiring/active-process.ts',
  'src/lib/reliability/queries/hiring-active-process-drift.ts',
  'scripts/ci/hiring-active-process-gate.mjs',
])

const isCommentLine = line => {
  const t = line.trim()

  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('--')
}

const listTrackedFiles = () =>
  // maxBuffer explícito: `git ls-files` de este repo supera el 1 MB por defecto de execSync y la
  // falla se ve como un volcado ilegible de rutas, no como "buffer excedido".
  execSync('git ls-files', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\n')
    .filter(Boolean)
    .filter(file => SCANNED_PREFIXES.some(prefix => file.startsWith(prefix)))
    .filter(file => /\.(ts|tsx)$/.test(file))
    .filter(file => !EXEMPT.has(file))

const scanFile = (file, content) => {
  const findings = []

  content.split('\n').forEach((line, index) => {
    if (isCommentLine(line)) return // trampa 3

    for (const pattern of PATTERNS) {
      if (line.includes(pattern.needle)) {
        findings.push({ file, line: index + 1, pattern: pattern.id, hint: pattern.hint })
      }
    }
  })

  return findings
}

const findings = []

for (const file of listTrackedFiles()) {
  let content = ''

  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }

  findings.push(...scanFile(file, content))
}

if (findings.length === 0) {
  console.log(
    'hiring-active-process-gate: OK — nadie decide «proceso activo» por lista literal de etapas.',
  )
  process.exit(0)
}

const level = STRICT ? 'ERROR' : 'WARN'

console.log(`\nhiring-active-process-gate: ${findings.length} hallazgo(s) [${level}]\n`)

for (const finding of findings) {
  console.log(`  ${level} ${finding.file}:${finding.line} — ${finding.pattern}; usa ${finding.hint}.`)
}

console.log(`
«Proceso activo» son TRES ejes ortogonales, no uno: dónde va la persona (stage), cómo terminó
(decision) y si el registro se muestra (archived_at). Preguntar por etapa responde mal a las tres:
cuenta como viva una postulación que alguien archivó a propósito, y esa persona vuelve a quedar
buscable e invitable en el Banco de Talento.

La definición canónica vive en src/lib/hiring/active-process.ts. Consúmela; no la copies.
`)

process.exit(STRICT ? 1 : 0)
