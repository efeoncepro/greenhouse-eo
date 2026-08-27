// TASK-1697 Slice 3 — greenhouse/growth-substrate-boundary (rule ANGOSTA)
//
// Dos invariantes, ambos verificados con CERO violaciones al momento del commit
// (grep sobre develop, alias y rutas relativas), por eso nace en `error` sin una
// sola exención ni fecha de saldo:
//
//   (1) `src/lib/growth/ai-visibility/probes/**` es PRIVADO del dominio AEO:
//       sólo archivos bajo `src/lib/growth/ai-visibility/**` pueden importarlo.
//       El sustrato compartido (fetcher SSRF-guarded + parseo HTML/robots) vive
//       en `@/lib/growth/site-substrate` — esa es la puerta para todo consumidor
//       externo (TASK-1670 / TASK-1701 / TASK-1709).
//
//   (2) La carta del sustrato, en la dirección inversa:
//       `src/lib/growth/site-substrate/**` NO importa `@/lib/growth/*` ni escapa
//       de su directorio por ruta relativa. El sustrato dice cómo se OBTIENE la
//       evidencia, nunca cómo se JUZGA.
//
// Lo que esta rule NO hace (a propósito): no prohíbe deep imports entre dominios
// `growth/*` en general. Esa es la rule universal `no-cross-domain-import-in-growth`
// (TASK-1713) y no puede nacer hoy en `error`: hay 30 deep imports cross-dominio
// vivos, 18 fuera del par seo↔ai-visibility (medición 2026-08-15).
//
// Molde: no-cross-domain-import-from-client-portal.mjs (TASK-822) — cubre
// ImportDeclaration + ImportExpression + require + `export ... from`.
//
// Spec: docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §17.3.

import path from 'node:path'

const AEO_DOMAIN_FILE = /[/\\]src[/\\]lib[/\\]growth[/\\]ai-visibility[/\\]/
const SUBSTRATE_FILE = /[/\\]src[/\\]lib[/\\]growth[/\\]site-substrate[/\\]/

// Superficies excluidas del invariante (1), espejo del molde: UI/API surfaces y
// tooling no deberían tocar probes/** igualmente, pero hoy no lo hacen (cero
// ocurrencias) y su frontera la gobiernan otros contratos.
const EXCLUDED_SURFACE = /[/\\]src[/\\](app|views|components|mcp)[/\\]/

const AEO_PROBES_IMPORT_REGEXES = [
  // Alias absoluto: @/lib/growth/ai-visibility/probes/...
  /^@\/lib\/growth\/ai-visibility\/probes(\/|$)/,
  // Path "bare" defensivo: src/lib/growth/ai-visibility/probes/...
  /^src\/lib\/growth\/ai-visibility\/probes(\/|$)/,
  // Ruta relativa que entra a probes/** desde fuera del dominio: exige al menos
  // un `../` de escape y el segmento ai-visibility/probes en el camino.
  /^(\.\.\/)+([^'"\n]*\/)?ai-visibility\/probes(\/|$)/
]

const GROWTH_IMPORT = /^@\/lib\/growth\//

// ¿Una ruta relativa escapa del directorio del sustrato? Resolución por path real,
// no por conteo de `../` (un subdirectorio interno futuro podría usar `../` legítimo).
const escapesSubstrate = (filename, spec) => {
  if (!/^\.\.?\//.test(spec)) return false

  const resolved = path.resolve(path.dirname(filename), spec)
  const marker = `${path.sep}src${path.sep}lib${path.sep}growth${path.sep}site-substrate`
  const idx = filename.lastIndexOf(marker)

  if (idx === -1) return false

  const packageDir = filename.slice(0, idx + marker.length)

  return !(resolved === packageDir || resolved.startsWith(packageDir + path.sep))
}

const isTestFile = filename =>
  /[/\\]__tests__[/\\]/.test(filename) || /\.(test|spec)\.(t|j)sx?$/.test(filename)

const PROBES_HINT = `
'ai-visibility/probes/**' es privado del dominio AEO. Si necesitas el fetcher
SSRF-guarded o el parseo HTML/robots desde otro dominio, la puerta es el
sustrato compartido:

  import { createSiteFetcher, resolveSubjectSite } from '@/lib/growth/site-substrate'

Si lo que necesitas es un PROBE (mide y produce un score), eso es juicio del
grader y no se comparte: consume el contrato del dominio AEO
('@/lib/growth/ai-visibility') o declara la necesidad en tu task.

Spec: docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §17.3
`.trim()

const SUBSTRATE_HINT = `
La carta del sustrato: 'site-substrate' dice cómo se OBTIENE la evidencia de un
sitio y NUNCA cómo se JUZGA. No importa 'growth/*', no persiste, no conoce el
grader. Si el código que escribes necesita un dominio, no es del sustrato —
muévelo al dominio y consume el sustrato desde ahí.

Spec: docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §17.3
`.trim()

const isProbesImport = source =>
  typeof source === 'string' && AEO_PROBES_IMPORT_REGEXES.some(rx => rx.test(source))

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Frontera angosta del sustrato de sitio: nadie fuera del dominio AEO importa ai-visibility/probes/**, y site-substrate/** no importa growth/* (TASK-1697).',
      url: 'docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md'
    },
    schema: []
  },

  create(context) {
    const filename = context.getFilename()

    if (isTestFile(filename)) return {}

    const insideAeoDomain = AEO_DOMAIN_FILE.test(filename)
    const insideSubstrate = SUBSTRATE_FILE.test(filename)
    const excludedSurface = EXCLUDED_SURFACE.test(filename)

    const checkProbesDirection = !insideAeoDomain && !insideSubstrate && !excludedSurface
    const checkSubstrateDirection = insideSubstrate

    if (!checkProbesDirection && !checkSubstrateDirection) return {}

    const report = (node, source) => {
      if (checkProbesDirection && isProbesImport(source)) {
        context.report({
          node,
          message: `Import de '${source}' viola la frontera del dominio AEO. ${PROBES_HINT}`
        })

        return
      }

      if (checkSubstrateDirection && typeof source === 'string') {
        if (GROWTH_IMPORT.test(source) || escapesSubstrate(filename, source)) {
          context.report({
            node,
            message: `Import de '${source}' viola la carta del sustrato. ${SUBSTRATE_HINT}`
          })
        }
      }
    }

    return {
      ImportDeclaration(node) {
        report(node.source, node.source && node.source.value)
      },

      ExportNamedDeclaration(node) {
        if (node.source) report(node.source, node.source.value)
      },

      ExportAllDeclaration(node) {
        if (node.source) report(node.source, node.source.value)
      },

      ImportExpression(node) {
        if (node.source && node.source.type === 'Literal' && typeof node.source.value === 'string') {
          report(node.source, node.source.value)
        }
      },

      CallExpression(node) {
        if (
          node.callee &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string'
        ) {
          report(node.arguments[0], node.arguments[0].value)
        }
      }
    }
  }
}
