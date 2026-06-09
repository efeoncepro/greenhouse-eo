#!/usr/bin/env node
/**
 * Worker runtime-deps gate (canonical).
 *
 * Los 3 workers Cloud Run Node (ops-worker, commercial-cost-worker, ico-batch)
 * bundlean `services/<w>/server.ts` con esbuild `--packages=external` y, en el
 * runtime stage del Dockerfile, hacen `pnpm install --prod` (SOLO `dependencies`).
 *
 * Consecuencia dura: **todo paquete npm que el bundle del worker importe
 * (externalizado) DEBE estar en `dependencies`** de `package.json`. Si está en
 * `devDependencies` (o no está), el runtime stage no lo instala → el contenedor
 * crashea al arrancar con `ERR_MODULE_NOT_FOUND` → no escucha en 8080 → deploy
 * failed (silent-startup-crash). Es el mismo bug class que el `@core` boundary,
 * pero para paquetes npm runtime mal clasificados como devDeps.
 *
 * Este gate replica el bundling de cada worker, enumera los paquetes externos del
 * árbol ESTÁTICO y falla loud (exit 1) si alguno no está en `dependencies`.
 * Mover el silent-startup-crash a un fallo de build/CI detectable antes del deploy.
 *
 * Uso: node scripts/ci/worker-runtime-deps-gate.mjs   (pnpm worker:runtime-deps-gate)
 */
import { builtinModules, createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const pkg = require(join(repoRoot, 'package.json'))
const declaredDeps = new Set(Object.keys(pkg.dependencies ?? {}))

const NODE_BUILTINS = new Set([
  ...builtinModules,
  ...builtinModules.map(name => `node:${name}`)
])

// Nombres de paquete que los Dockerfiles aliasan a shims locales (NO se instalan
// en el runtime stage). Mantener en sync con los `--alias:*=./*-shim.js`:
//   next/server, next/headers → next ; next-auth/* → next-auth ; server-only ;
//   bcryptjs ; @vercel/oidc.
const SHIMMED_PACKAGES = new Set(['server-only', 'next', 'next-auth', 'bcryptjs', '@vercel/oidc'])

const WORKERS = [
  { name: 'ops-worker', entry: 'services/ops-worker/server.ts' },
  { name: 'commercial-cost-worker', entry: 'services/commercial-cost-worker/server.ts' },
  { name: 'ico-batch', entry: 'services/ico-batch/server.ts' }
]

/** Resuelve el nombre de paquete de un specifier: `a/b/c`→`a`, `@s/p/sub`→`@s/p`. */
const toPackageName = specifier => {
  if (specifier.startsWith('@')) {
    const [scope, name] = specifier.split('/')

    return scope && name ? `${scope}/${name}` : specifier
  }

  return specifier.split('/')[0]
}

const isBare = specifier => !specifier.startsWith('.') && !specifier.startsWith('/')

const collectExternalPackages = async entry => {
  const result = await build({
    entryPoints: [join(repoRoot, entry)],
    bundle: true,
    write: false,
    metafile: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
    absWorkingDir: repoRoot,
    // `packages: 'external'` espeja el `--packages=external` del Dockerfile:
    // los paquetes npm (incl. los shimmeados como next/next-auth/server-only)
    // quedan como imports externos sin resolver su contenido.
    packages: 'external',
    resolveExtensions: ['.ts', '.tsx', '.js', '.json'],
    tsconfig: join(repoRoot, 'tsconfig.json'),
    // `@`/`@core` resuelven a archivos locales (no externos), como en el Dockerfile.
    alias: {
      '@': join(repoRoot, 'src'),
      '@core': join(repoRoot, 'src/@core')
    }
  })

  const externals = new Set()

  for (const input of Object.values(result.metafile.inputs)) {
    for (const imp of input.imports ?? []) {
      if (imp.external && isBare(imp.path)) {
        const name = toPackageName(imp.path)

        if (NODE_BUILTINS.has(imp.path) || NODE_BUILTINS.has(name)) continue
        if (SHIMMED_PACKAGES.has(name)) continue // aliasado a shim local en el Docker

        externals.add(name)
      }
    }
  }

  return externals
}

let hadError = false

for (const worker of WORKERS) {
  let externals

  try {
    externals = await collectExternalPackages(worker.entry)
  } catch (error) {
    console.error(`✗ ${worker.name}: no se pudo bundlear (${error.message})`)
    hadError = true
    continue
  }

  const missing = [...externals].filter(name => !declaredDeps.has(name)).sort()

  if (missing.length > 0) {
    hadError = true
    console.error(`✗ ${worker.name}: ${missing.length} paquete(s) externalizado(s) que NO están en dependencies:`)

    for (const name of missing) {
      const inDev = pkg.devDependencies?.[name] !== undefined

      console.error(`    - ${name}${inDev ? '  (está en devDependencies — moverlo a dependencies)' : '  (no declarado)'}`)
    }
  } else {
    console.log(`✓ ${worker.name}: todos los paquetes externalizados están en dependencies (${externals.size} externos)`)
  }
}

if (hadError) {
  console.error(
    '\nFALLÓ — un worker importa un paquete runtime que el runtime stage (`pnpm install --prod`)\n' +
      'no instala. Movelo a `dependencies` o haz el import lazy si no debe vivir en el worker.'
  )
  process.exit(1)
}

console.log('\nOK — los 3 workers Node resuelven todos sus paquetes externos desde dependencies.')
