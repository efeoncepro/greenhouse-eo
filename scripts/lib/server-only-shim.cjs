// CLI shim — neutralizes the `server-only` package so tsx-driven scripts can
// import server libs that mark themselves with `import 'server-only'`. The
// package is meant to fence client component imports in Next.js bundles, but
// in a Node/tsx CLI context (migrations, rematerialization, backfills) it
// throws at module load. We replace its resolution with an empty CJS module.
//
// Wire via: `tsx --import file:///${PWD}/scripts/lib/server-only-shim.cjs ...`
// or `node --require ./scripts/lib/server-only-shim.cjs ...`.

const Module = require('module')
const path = require('path')

const SHIM_TARGET = path.join(__dirname, 'server-only-empty.cjs')
const originalResolve = Module._resolveFilename

Module._resolveFilename = function patched(request, parent, ...rest) {
  if (request === 'server-only') {
    return SHIM_TARGET
  }

  return originalResolve.call(this, request, parent, ...rest)
}
