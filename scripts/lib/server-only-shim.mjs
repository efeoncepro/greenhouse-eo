// ESM shim — neutralizes the `server-only` package so tsx-driven scripts can
// import server libs that mark themselves with `import 'server-only'`. The
// package is meant to fence client component imports in Next.js bundles, but
// in a Node/tsx CLI context (migrations, rematerialization, backfills) it
// throws at module load. We replace its resolution with an empty CJS module.
//
// **Why ESM instead of the legacy `server-only-shim.cjs` (TASK-765 follow-up):**
// post-TASK-742, `src/lib/auth-secrets.ts` introduced top-level `await` para
// resolver Secret Manager refs en startup. tsx detecta el shim CJS (--require)
// y compila TODO el grafo en CJS-mode, donde top-level await NO está soportado.
// El error es:
//   `Top-level await is currently not supported with the "cjs" output format`
//
// Este shim ESM se carga via `--import` (ESM-aware), permitiendo a tsx mantener
// ESM-mode end-to-end y respetar top-level await.
//
// Wire via: `tsx --import file:///${PWD}/scripts/lib/server-only-shim.mjs ...`

import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SHIM_TARGET = join(__dirname, 'server-only-empty.cjs')
const SHIM_TARGET_URL = pathToFileURL(SHIM_TARGET).href

// Custom resolve hook: cualquier import a 'server-only' resuelve al stub
// vacío local. Cualquier otro import sigue el resolver default.
const resolveHook = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') {
    return { url: '${SHIM_TARGET_URL}', shortCircuit: true }
  }
  return nextResolve(specifier, context)
}
`

// Inscribe el hook como ESM loader.
register(`data:text/javascript,${encodeURIComponent(resolveHook)}`, import.meta.url)
