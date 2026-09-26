// ISSUE-177 — greenhouse/no-worker-only-module-in-vercel-code
//
// Todo `src/**` puede terminar dentro de una función de Vercel, y una función de Vercel tiene un
// límite de 250 MB sin comprimir. El motor de composición (`src/lib/artifact-composer`) carga
// Playwright, pdf-lib y los catálogos con sus fuentes: un solo import de VALOR desde su barrel en
// código alcanzable desde una ruta hizo que el trazado de archivos metiera todo eso en la función
// `api/platform/app/insights/catalog` (441 MB). Nada local lo veía — ni lint, ni tsc, ni tests, ni el
// build local —; el deploy fallaba recién en Vercel. Pasó el 2026-09-16 y otra vez el 2026-09-22.
//
// La composición corre SÓLO en el Cloud Run Job `services/artifact-worker`. Desde `src/**`:
//
//   - `@/lib/artifact-composer` (el barrel): sólo TIPOS — `import type {…}` o todos los especificadores
//     con `type` inline. Un valor, un `export … from`, un `import()` o un `require()` es error.
//   - `@/lib/artifact-composer/pure`: permitido. Es la segunda entrada pública del motor, el
//     subconjunto liviano para encolar, mapear y sellar (su cierre transitivo lo verifica
//     `src/lib/artifact-composer/__tests__/pure-entry-boundary.test.ts`).
//   - Cualquier otro `@/lib/artifact-composer/<ruta>` (catálogos, brand packs, render, paginate…):
//     error, incluso sólo de tipos. El ADR del composer prohíbe los deep-imports desde consumers; los
//     tipos salen del barrel o de `pure`.
//   - Una ruta relativa que entra a `src/lib/artifact-composer/` desde fuera recibe el mismo trato que
//     el alias (se resuelve contra el directorio del archivo, no por conteo de `../`).
//   - Los paquetes de navegador/PDF (`playwright`, `pdf-lib`, `puppeteer`, `@sparticuz/chromium`…):
//     un valor es error; un tipo no pesa y está permitido.
//
// Exentos por diseño: el propio motor (`src/lib/artifact-composer/**`, cuya frontera gobiernan el
// boundary test y `no-restricted-imports`) y los tests, que nunca viajan a una función. Fuera de
// `src/` (`services/`, `scripts/`) la regla no aplica aunque se habilite: ahí vive el worker.
//
// Lo que esta regla NO ve: un `node:fs` con rutas dinámicas que hace que Turbopack trace el proyecto
// entero (la causa del 2026-09-02). Eso lo cubre el gate de tamaño trazado de ISSUE-177, no un lint.
//
// Molde: no-cross-domain-import-from-client-portal.mjs (TASK-822) + growth-substrate-boundary.mjs
// (TASK-1697) — ImportDeclaration + export-from + ImportExpression + require.
//
// Spec: docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md (Delta 2026-09-22).

import path from 'node:path'

const SRC_FILE = /[/\\]src[/\\]/
const COMPOSER_FILE = /[/\\]src[/\\]lib[/\\]artifact-composer([/\\]|$)/

// Un path resuelto que cae dentro del motor; el grupo 1 es la ruta interna (vacía = el directorio).
const COMPOSER_RESOLVED_PATH = /[/\\]src[/\\]lib[/\\]artifact-composer(?:[/\\](.*))?$/

const COMPOSER_ALIAS = /^@\/lib\/artifact-composer(?:\/(.*))?$/

// Dependencias que sólo pueden vivir en el worker de render (Chromium headless y manipulación de PDF).
const WORKER_ONLY_PACKAGES = [
  'playwright',
  'playwright-core',
  '@playwright/test',
  'pdf-lib',
  'puppeteer',
  'puppeteer-core',
  '@sparticuz/chromium'
]

const isTestFile = filename =>
  /[/\\]__tests__[/\\]/.test(filename) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(filename)

const isWorkerOnlyPackage = source =>
  WORKER_ONLY_PACKAGES.some(pkg => source === pkg || source.startsWith(`${pkg}/`))

// `pure`, `pure.ts`, `index`, `./` — la entrada no cambia por la extensión ni por un `/index` final.
const normalizeSubpath = subpath =>
  (subpath ?? '')
    .replace(/\\/g, '/')
    .replace(/\.[cm]?[jt]sx?$/, '')
    .replace(/(^|\/)index$/, '')
    .replace(/\/+$/, '')

/**
 * Clasifica un especificador:
 *   'barrel'  → la API completa del motor
 *   'pure'    → la entrada liviana
 *   'deep'    → un interno del motor
 *   'package' → una dependencia de navegador/PDF
 *   null      → nada que ver con esta regla
 */
const classifySource = (source, filename) => {
  if (typeof source !== 'string') return null

  let subpath = null
  const aliasMatch = COMPOSER_ALIAS.exec(source)

  if (aliasMatch) {
    subpath = aliasMatch[1] ?? ''
  } else if (/^\.\.?(\/|$)/.test(source)) {
    const resolved = path.resolve(path.dirname(filename), source)
    const resolvedMatch = COMPOSER_RESOLVED_PATH.exec(resolved)

    if (!resolvedMatch) return null

    subpath = resolvedMatch[1] ?? ''
  } else if (isWorkerOnlyPackage(source)) {
    return 'package'
  } else {
    return null
  }

  const normalized = normalizeSubpath(subpath)

  if (normalized === '') return 'barrel'

  if (normalized === 'pure') return 'pure'

  return 'deep'
}

// `import type {…}` / `import type X` / `import type * as X`, o todos los especificadores `type` inline.
// `import {} from` y `import 'x'` son imports de efecto: cargan el módulo, así que cuentan como valor.
const isTypeOnlyImport = node =>
  node.importKind === 'type' ||
  (node.specifiers.length > 0 &&
    node.specifiers.every(specifier => specifier.type === 'ImportSpecifier' && specifier.importKind === 'type'))

// `export type {…} from` / `export type * from`, o todos los especificadores `type` inline.
const isTypeOnlyReexport = node =>
  node.exportKind === 'type' ||
  (node.type === 'ExportNamedDeclaration' &&
    node.specifiers.length > 0 &&
    node.specifiers.every(specifier => specifier.exportKind === 'type'))

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohíbe que código de src/** (alcanzable desde una función de Vercel) importe valores del motor de composición o de paquetes de navegador/PDF que sólo corren en el worker de render (ISSUE-177).',
      url: 'docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md'
    },
    schema: [],
    messages: {
      barrelValue:
        'Importar un VALOR del motor de composición completo (`{{source}}`) arrastra Playwright, pdf-lib y los catálogos a la función de Vercel (>250 MB, ISSUE-177). Usa `import type`, la entrada liviana `@/lib/artifact-composer/pure`, o deja la composición en `services/artifact-worker`.',
      deepPath:
        '`{{source}}` es un interno del motor de composición: el ADR prohíbe los deep-imports desde consumers, incluso de tipos. Importa desde una de sus dos entradas públicas: `@/lib/artifact-composer/pure` (liviana, apta para Vercel) o `import type` desde `@/lib/artifact-composer`. Si necesitas un catálogo o el render, eso corre en `services/artifact-worker`, no en Vercel (ISSUE-177).',
      workerOnlyPackage:
        '`{{source}}` sólo corre en el worker de render: importarlo como VALOR desde `src/` lo mete en la función de Vercel (>250 MB, ISSUE-177). Usa `import type` o mueve el código a `services/artifact-worker`.'
    }
  },

  create(context) {
    const filename = context.filename ?? context.getFilename()

    if (!SRC_FILE.test(filename) || COMPOSER_FILE.test(filename) || isTestFile(filename)) return {}

    const report = (sourceNode, messageId) =>
      context.report({ node: sourceNode, messageId, data: { source: sourceNode.value } })

    // Declaraciones estáticas: el tipo sólo exime al barrel y a los paquetes; un deep-import nunca.
    const checkStatic = (sourceNode, typeOnly) => {
      const kind = classifySource(sourceNode.value, filename)

      if (kind === null || kind === 'pure') return

      if (kind === 'deep') {
        report(sourceNode, 'deepPath')

        return
      }

      if (typeOnly) return

      report(sourceNode, kind === 'barrel' ? 'barrelValue' : 'workerOnlyPackage')
    }

    // `import()` y `require()` siempre cargan el módulo en runtime: no existe la variante de tipos.
    const checkRuntimeLoad = sourceNode => {
      if (!sourceNode || sourceNode.type !== 'Literal' || typeof sourceNode.value !== 'string') return

      const kind = classifySource(sourceNode.value, filename)

      if (kind === null || kind === 'pure') return

      report(sourceNode, kind === 'deep' ? 'deepPath' : kind === 'barrel' ? 'barrelValue' : 'workerOnlyPackage')
    }

    return {
      ImportDeclaration(node) {
        checkStatic(node.source, isTypeOnlyImport(node))
      },

      ExportNamedDeclaration(node) {
        if (!node.source) return

        checkStatic(node.source, isTypeOnlyReexport(node))
      },

      ExportAllDeclaration(node) {
        checkStatic(node.source, isTypeOnlyReexport(node))
      },

      // `import x = require('…')` (sintaxis TS); `import type x = require('…')` es sólo de tipos.
      TSImportEqualsDeclaration(node) {
        if (node.moduleReference?.type !== 'TSExternalModuleReference') return

        checkStatic(node.moduleReference.expression, node.importKind === 'type')
      },

      ImportExpression(node) {
        checkRuntimeLoad(node.source)
      },

      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'require' || node.arguments.length === 0) return

        checkRuntimeLoad(node.arguments[0])
      }
    }
  }
}
