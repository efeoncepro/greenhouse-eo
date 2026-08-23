#!/usr/bin/env node
/**
 * TASK-1739 Slice 6 — Guardrail preventivo: ningún seed/smoke crea datos de Hiring sin declarar
 * procedencia.
 *
 * Nace ADVISORY (`warn`, exit 0). Promueve a `error` con `--strict` una vez avisado a los carriles
 * activos de EPIC-011, que también fabrican datos y tendrían que declarar antes de que el gate
 * bloquee su CI.
 *
 * Dos trampas conocidas, ambas ya pagadas por otros gates del repo:
 *   1. Barre `git ls-files`, así que es CIEGO a lo untracked: correrlo DESPUÉS de `git add` o no verá
 *      el archivo recién creado (ni a sí mismo).
 *   2. No escribe el patrón que persigue como literal suelto — se encontraría a sí mismo y reportaría
 *      un falso positivo eterno sobre su propio código. Por eso los nombres se arman por partes.
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const STRICT = process.argv.includes('--strict')

// Armados por partes a propósito (trampa 2).
const CREATE = 'create'
const TARGETS = [`${CREATE}TalentDemand`, `${CREATE}HiringOpening`]
const DECLARATION = 'dataOrigin'

const SCANNED_PREFIXES = ['scripts/', 'tests/e2e/']

/**
 * Los `*.live.test.ts` de `src/**` fabrican datos contra la MISMA instancia que comparten dev,
 * staging y producción, exactamente igual que un seed de `scripts/` — pero quedaban fuera del
 * barrido, y ahí se coló el defecto que el gate existe para impedir: dos archivos creaban demanda y
 * vacante sin declarar procedencia, así que nacían `real`. Mientras el teardown alcanza a correr no
 * se nota; cuando muere a mitad —se cae el proxy, se aborta la corrida— lo que queda es
 * indistinguible de un candidato de verdad. Un gate que no mira donde el dato NACE no es un gate.
 */
const isLiveTestFabricator = file => file.startsWith('src/') && file.endsWith('.live.test.ts')

/** El propio gate y el módulo dueño del contrato quedan fuera: hablan del tema, no fabrican datos. */
const EXEMPT = new Set(['scripts/ci/hiring-data-origin-gate.mjs'])

const listTrackedFiles = () =>
  // maxBuffer explícito: `git ls-files` de este repo supera el 1 MB por defecto de execSync y la
  // falla se ve como un volcado ilegible de rutas, no como "buffer excedido".
  execSync('git ls-files', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\n')
    .filter(Boolean)
    .filter(file => SCANNED_PREFIXES.some(prefix => file.startsWith(prefix)) || isLiveTestFabricator(file))
    .filter(file => /\.(ts|tsx|mjs|js)$/.test(file))
    .filter(file => !EXEMPT.has(file))

const findings = []

for (const file of listTrackedFiles()) {
  let content = ''

  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }

  for (const target of TARGETS) {
    let index = content.indexOf(`${target}(`)

    while (index !== -1) {
      // Ventana del llamado: hasta el cierre del objeto de input o 700 caracteres, lo que llegue antes.
      const window = content.slice(index, index + 700)

      if (!window.includes(DECLARATION)) {
        const line = content.slice(0, index).split('\n').length

        findings.push({ file, line, target })
      }

      index = content.indexOf(`${target}(`, index + 1)
    }
  }
}

if (findings.length === 0) {
  console.log('hiring-data-origin-gate: OK — todo seed/smoke que crea datos de Hiring declara su procedencia.')
  process.exit(0)
}

const level = STRICT ? 'ERROR' : 'WARN'

console.log(`\nhiring-data-origin-gate: ${findings.length} hallazgo(s) [${level}]\n`)

for (const finding of findings) {
  console.log(`  ${level} ${finding.file}:${finding.line} — ${finding.target} sin declarar procedencia.`)
}

console.log(
  `\nUn dato de Hiring creado sin declarar procedencia nace indistinguible de un candidato o un cargo`,
)
console.log(`real, y después sólo se puede separar adivinando por el nombre — que falla en las dos`)
console.log(`direcciones. Declara \`${DECLARATION}\` en el input del command.\n`)

process.exit(STRICT ? 1 : 0)
