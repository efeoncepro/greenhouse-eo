#!/usr/bin/env node
/**
 * Worker deploy-path coverage gate (canonical).
 *
 * Los workflows de deploy de los workers Cloud Run deciden DOS veces si hay que
 * desplegar, y ambas decisiones se toman contra una lista de rutas mantenida A MANO:
 *
 *   1. `on.push.paths` — decide si el workflow siquiera corre.
 *   2. `WORKER_RUNTIME_PATHS` — el drift-check: si `git diff --quiet EXPECTED..CURRENT`
 *      no ve cambios en esas rutas, el step de deploy se SALTA y el job cierra `success`.
 *
 * Bug class: el worker bundlea código de `src/lib/**` que la lista NO menciona. El
 * cambio entra a `main`, el release queda verde, el manifest transiciona a `released`
 * — y el worker sigue sirviendo la versión anterior. El síntoma aparece después y lejos
 * (un dato viejo, un consumer que no reacciona), y apunta al dominio, nunca al deploy.
 *
 * Ya ocurrió al menos cinco veces, y cada vez se cerró agregando una ruta más:
 * TASK-1210 (nubox), TASK-742 (auth/secrets), TASK-1723 (talent-pool), TASK-1746
 * (hiring/notifications), TASK-1279 (deps transitivos del grader). Agregar la ruta
 * arregla el caso y deja la clase abierta: el siguiente dominio que entre al worker
 * la repite.
 *
 * Este gate cierra la clase. En vez de revisar la lista con los ojos, deriva la
 * cobertura del ÁRBOL REAL del bundle: replica el `esbuild --bundle` del Dockerfile y
 * lee `metafile.inputs`, que contiene todos los archivos locales que entran al
 * artefacto — transitivos incluidos, que es justo lo que TASK-1279 mostró que se
 * escapa. Si un archivo del bundle no cae bajo ningún prefijo declarado, falla.
 *
 * Correlato: `worker-runtime-deps-gate.mjs` hace lo mismo para los paquetes npm
 * externalizados. Este es su gemelo para las rutas del repo.
 *
 * Uso: node scripts/ci/worker-deploy-path-coverage-gate.mjs   (pnpm worker:deploy-path-gate)
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

const WORKERS = [
  {
    name: 'ops-worker',
    entry: 'services/ops-worker/server.ts',
    workflow: '.github/workflows/ops-worker-deploy.yml'
  },
  {
    name: 'commercial-cost-worker',
    entry: 'services/commercial-cost-worker/server.ts',
    workflow: '.github/workflows/commercial-cost-worker-deploy.yml'
  },
  {
    name: 'ico-batch',
    entry: 'services/ico-batch/server.ts',
    workflow: '.github/workflows/ico-batch-deploy.yml'
  }
]

/**
 * Archivos que entran al bundle pero NO deben forzar un redeploy por sí solos.
 * Sólo el árbol `src/**` y `services/**` es código del worker; `node_modules` va
 * externalizado y lo cubre el runtime-deps gate.
 */
const isWorkerSource = file =>
  (file.startsWith('src/') || file.startsWith('services/')) && !file.includes('node_modules')

/** Archivos locales del árbol estático del bundle, relativos al repo. */
const collectBundleFiles = async entry => {
  const result = await build({
    entryPoints: [join(repoRoot, entry)],
    bundle: true,
    write: false,
    metafile: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
    absWorkingDir: repoRoot,
    packages: 'external',
    resolveExtensions: ['.ts', '.tsx', '.js', '.json'],
    tsconfig: join(repoRoot, 'tsconfig.json'),
    alias: {
      '@': join(repoRoot, 'src'),
      '@core': join(repoRoot, 'src/@core')
    }
  })

  return Object.keys(result.metafile.inputs)
    .map(file => file.replace(/^\.\//, ''))
    .filter(isWorkerSource)
}

/**
 * Prefijos declarados en el workflow. Une las dos listas porque un hueco en
 * CUALQUIERA de las dos deja el worker stale: sin `on.push.paths` el workflow no
 * corre; sin `WORKER_RUNTIME_PATHS` corre pero el drift-check salta el deploy.
 */
const readDeclaredPrefixes = workflowPath => {
  const raw = readFileSync(join(repoRoot, workflowPath), 'utf8')

  const pushPaths = [...raw.matchAll(/^\s*-\s*'([^']+)'\s*$/gm)]
    .map(match => match[1])
    .filter(value => value.startsWith('src/') || value.startsWith('services/'))

  const arrayBlock = raw.match(/WORKER_RUNTIME_PATHS=\(([\s\S]*?)\n\s*\)/)

  const runtimePaths = arrayBlock
    ? arrayBlock[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('src/') || line.startsWith('services/'))
    : []

  return {
    pushPaths: pushPaths.map(value => value.replace(/\/\*\*$/, '')),
    runtimePaths,
    all: [...new Set([...pushPaths, ...runtimePaths].map(value => value.replace(/\/\*\*$/, '')))]
  }
}

const isCovered = (file, prefixes) =>
  prefixes.some(prefix => file === prefix || file.startsWith(`${prefix}/`))

/** Agrupa los huecos por directorio de 3 niveles para que el reporte sea accionable. */
const summarize = files => {
  const groups = new Map()

  for (const file of files) {
    const key = file.split('/').slice(0, 3).join('/')

    groups.set(key, (groups.get(key) ?? 0) + 1)
  }

  return [...groups.entries()].sort((a, b) => b[1] - a[1])
}

let hadError = false

for (const worker of WORKERS) {
  let bundleFiles
  let declared

  try {
    bundleFiles = await collectBundleFiles(worker.entry)
    declared = readDeclaredPrefixes(worker.workflow)
  } catch (error) {
    console.error(`✗ ${worker.name}: no se pudo analizar (${error.message})`)
    hadError = true
    continue
  }

  const uncovered = bundleFiles.filter(file => !isCovered(file, declared.all))

  // Un hueco SÓLO en runtimePaths es igual de grave: el workflow corre y el
  // drift-check lo salta. Se reporta aparte porque la remediación es distinta.
  //
  // Sólo aplica donde el mecanismo existe: un workflow SIN bloque
  // `WORKER_RUNTIME_PATHS` no tiene drift-check que saltarse, así que exigirle
  // cobertura ahí es un falso positivo (marcaría todo su push filter como hueco).
  const runtimeOnlyGaps =
    declared.runtimePaths.length === 0
      ? []
      : bundleFiles.filter(
          file => isCovered(file, declared.pushPaths) && !isCovered(file, declared.runtimePaths)
        )

  if (uncovered.length === 0 && runtimeOnlyGaps.length === 0) {
    console.log(`✓ ${worker.name}: ${bundleFiles.length} archivo(s) del bundle, todos cubiertos.`)
    continue
  }

  hadError = true

  if (uncovered.length > 0) {
    console.error(
      `✗ ${worker.name}: ${uncovered.length} archivo(s) del bundle sin cobertura en ${worker.workflow}.`
    )
    console.error('  Un cambio a estas rutas NO redespliega el worker y el release cierra verde:')

    for (const [dir, count] of summarize(uncovered)) {
      console.error(`    ${dir}  (${count} archivo(s))`)
    }
  }

  if (runtimeOnlyGaps.length > 0) {
    console.error(
      `✗ ${worker.name}: ${runtimeOnlyGaps.length} archivo(s) en on.push.paths pero NO en WORKER_RUNTIME_PATHS.`
    )
    console.error('  El workflow corre, el drift-check salta el deploy y el job cierra success:')

    for (const [dir, count] of summarize(runtimeOnlyGaps)) {
      console.error(`    ${dir}  (${count} archivo(s))`)
    }
  }
}

if (hadError) {
  console.error('')
  console.error('Remediación: agregar el prefijo faltante a AMBAS listas del workflow')
  console.error('(on.push.paths y WORKER_RUNTIME_PATHS). Declarar el directorio, no el archivo.')
  process.exit(1)
}

console.log('Cobertura de rutas de deploy OK para todos los workers analizados.')
