#!/usr/bin/env node
/**
 * Vercel function reachability gate (ISSUE-177).
 *
 * Una función de Vercel no puede superar 250 MB sin comprimir. Tres veces en tres semanas un solo
 * import mal dirigido dejó `develop` sin deploy de staging, y NINGÚN gate local lo vio: el build de
 * Vercel era la única prueba.
 *
 *   - 2026-09-02 · `api/mcp/greenhouse` 397 MB: un módulo alcanzable desde la ruta leía el
 *     filesystem con rutas derivadas de `process.cwd()`. Turbopack no puede resolver el segmento
 *     variable y traza el directorio completo (o el proyecto entero).
 *   - 2026-09-16 y 2026-09-22 · `api/platform/app/insights/catalog` 434 y 441 MB: código que corre en
 *     Vercel importó un VALOR desde el barrel `@/lib/artifact-composer`, que re-exporta el motor de
 *     render (Playwright + pdf-lib) y los catálogos con sus fuentes y assets.
 *
 * Este gate es la capa BARATA y local (corre en `pnpm local:check`, sin build). Reproduce el grafo
 * de imports que ve el trazado de Next con esbuild (`bundle`, `metafile`, `packages: 'external'`)
 * desde cada entrada del App Router, y falla si:
 *
 *   1. una entrada alcanza un paquete o archivo de la DENYLIST (motor de render, catálogos,
 *      `scripts/**`, `services/**`), o
 *   2. un módulo alcanzable arma una ruta con `process.cwd()` / `__dirname` / `import.meta.url` más
 *      un segmento NO literal (la causa del 2026-09-02) y no está en la allowlist.
 *
 * El gate de tamaño real vive aparte (`vercel-function-size-gate.mjs`): lee los `*.nft.json` del
 * build y mide bytes. Éste no mide bytes; ve la CAUSA antes de que exista un build.
 *
 * Por qué esbuild y no un grep: esbuild elimina `import type` e imports sin uso de valor (misma
 * semántica que SWC/Turbopack), así que separa solo un import de tipo — inocuo — de uno de valor.
 *
 * ⚠️ Trampa medida: el metafile de esbuild lista los imports ELIMINADOS (`import { type X }`, valores
 * sin uso) como registros `external` sin resolver, idénticos a un import real de paquete. Por eso las
 * aristas a paquetes de la denylist NO se leen del metafile: las captura un plugin `onResolve`, que
 * esbuild sólo invoca para imports vivos.
 *
 * Límite conocido: los paquetes van externos, así que un paquete de la denylist que llega a través
 * de OTRO paquete npm no se ve acá. Eso lo cubre el gate de tamaño.
 *
 * Uso: node scripts/ci/vercel-function-reachability-gate.mjs [--json] [--verbose] [--batch-size=N]
 *      (pnpm vercel:reachability-gate)
 */
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'
import ts from 'typescript'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export const ALLOWLIST_RELATIVE_PATH = 'scripts/ci/vercel-function-reachability-allowlist.json'

// ───────────────────────────── Entradas ─────────────────────────────

/**
 * Archivos especiales del App Router que Next convierte en (o incluye dentro de) una función.
 * `forbidden`/`unauthorized` son los archivos de Next 15+ para 403/401; se suman porque se
 * renderizan en el servidor igual que `not-found`.
 */
export const APP_SPECIAL_FILES = [
  'route',
  'page',
  'layout',
  'template',
  'default',
  'not-found',
  'error',
  'global-error',
  'loading',
  'forbidden',
  'unauthorized'
]

/** Rutas de metadata generadas por código (las versiones estáticas .png/.svg no son funciones). */
export const METADATA_FILES = ['opengraph-image', 'twitter-image', 'icon', 'apple-icon', 'sitemap', 'robots', 'manifest']

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs'])

/** Entradas fuera de `src/app` que Next empaqueta como función o carga en cada una. */
export const ROOT_ENTRYPOINTS = ['src/proxy.ts', 'src/middleware.ts', 'src/instrumentation.ts']

/** Sólo corren en el navegador: nunca entran a una función de Vercel. */
const CLIENT_ONLY_ENTRYPOINTS = new Set(['src/instrumentation-client.ts', 'src/instrumentation-client.js'])

const toPosix = value => value.split(sep).join('/')

/**
 * ¿Es este archivo (ruta relativa al repo, posix) una entrada del App Router?
 * Excluye carpetas privadas `_x` (Next no las enruta; incluye `__tests__`) y tests.
 */
export const isAppEntrypoint = relPath => {
  if (!relPath.startsWith('src/app/')) return false

  const segments = relPath.split('/')
  const fileName = segments.at(-1)
  const ext = extname(fileName)

  if (!CODE_EXTENSIONS.has(ext)) return false
  if (/\.(test|spec|stories)\.[a-z]+$/.test(fileName) || fileName.endsWith('.d.ts')) return false
  if (segments.slice(2, -1).some(segment => segment.startsWith('_') || segment === 'node_modules')) return false

  const base = fileName.slice(0, -ext.length)

  if (APP_SPECIAL_FILES.includes(base)) return true

  // `opengraph-image2.tsx`, `icon1.tsx`: Next admite variantes numeradas.
  const metadataBase = base.replace(/\d+$/, '')

  return METADATA_FILES.includes(metadataBase)
}

const walkFiles = (absDir, root, out) => {
  let entries

  try {
    entries = readdirSync(absDir, { withFileTypes: true })
  } catch {
    return out
  }

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue

    const absPath = join(absDir, entry.name)

    if (entry.isDirectory()) walkFiles(absPath, root, out)
    else if (entry.isFile()) out.push(toPosix(relative(root, absPath)))
  }

  return out
}

/** Todas las entradas del proyecto, relativas al repo, ordenadas. */
export const discoverEntrypoints = (root = repoRoot) => {
  const appFiles = walkFiles(join(root, 'src/app'), root, []).filter(isAppEntrypoint)
  const rootFiles = ROOT_ENTRYPOINTS.filter(file => existsSync(join(root, file)))

  return [...new Set([...appFiles, ...rootFiles])].filter(file => !CLIENT_ONLY_ENTRYPOINTS.has(file)).sort()
}

// ───────────────────────────── Denylist ─────────────────────────────

const COMPOSER_FIX =
  'Si sólo necesitas tipos, usa `import type { … } from \'@/lib/artifact-composer\'` (se borra al compilar). ' +
  'Si necesitas una función pura, impórtala por su módulo puro (`@/lib/artifact-composer/pure` o un deep-import ' +
  'como `@/lib/artifact-composer/paginate`), nunca por el barrel. El render corre en el artifact-worker: encólalo.'

export const DENYLIST = [
  { kind: 'package', match: 'playwright', reason: 'Chromium + driver: sólo corre en el artifact-worker.', fix: COMPOSER_FIX },
  { kind: 'package', match: 'playwright-core', reason: 'Chromium + driver: sólo corre en el artifact-worker.', fix: COMPOSER_FIX },
  { kind: 'package', match: '@playwright/test', reason: 'Runner de tests E2E: nunca en runtime.', fix: 'Los helpers de Playwright viven en tests/ o scripts/.' },
  { kind: 'package', match: 'pdf-lib', reason: 'Motor de PDF del composer: sólo corre en el artifact-worker.', fix: COMPOSER_FIX },
  { kind: 'package', match: 'puppeteer', reason: 'Navegador headless completo.', fix: 'El render de navegador corre en un worker de Cloud Run, no en Vercel.' },
  { kind: 'package', match: 'puppeteer-core', reason: 'Navegador headless.', fix: 'El render de navegador corre en un worker de Cloud Run, no en Vercel.' },
  { kind: 'package', match: '@sparticuz/chromium', reason: 'Binario de Chromium (~60 MB comprimido).', fix: 'El render de navegador corre en un worker de Cloud Run, no en Vercel.' },
  {
    kind: 'file',
    match: 'src/lib/artifact-composer/{index,render,compose,catalog,compile-catalog-tokens,quality-gates}.ts',
    reason: 'Barrel o motor del Artifact Composer: arrastra Playwright, pdf-lib y catálogos (incidentes 2026-09-16 y 2026-09-22).',
    fix: COMPOSER_FIX
  },
  {
    kind: 'file',
    match: 'src/lib/artifact-composer/catalogs/**',
    reason: 'Catálogos del composer: plantillas, fuentes y assets leídos con rutas de runtime.',
    fix: COMPOSER_FIX
  },
  {
    kind: 'file',
    match: 'src/lib/artifact-composer/brand-packs/**',
    reason: 'Brand packs del composer: fuentes TTF y assets.',
    fix: COMPOSER_FIX
  },
  {
    kind: 'file',
    match: 'src/mcp/greenhouse/skill-catalog-fs.ts',
    reason: 'Lee docs/mcp/skills del filesystem: causó la función de 397 MB (2026-09-02).',
    fix: 'Consume el artefacto generado `skill-catalog.generated.json` vía `@/mcp/greenhouse/skill-catalog`.'
  },
  {
    kind: 'file',
    match: 'services/**',
    reason: 'Código de un worker de Cloud Run.',
    fix: 'Lo compartido entre worker y Vercel vive en `src/lib/`; el worker importa desde ahí, no al revés.'
  },
  {
    kind: 'file',
    match: 'scripts/**',
    reason: 'Tooling de CLI/CI: nunca en runtime.',
    fix: 'Mueve lo compartido a `src/lib/`; si el script genera un artefacto, la ruta importa el artefacto.'
  }
]

/**
 * Glob mínimo (`*`, `**`, `?`, `{a,b}`) → RegExp anclada. Suficiente para la denylist; no se
 * agrega una dependencia de minimatch para cuatro patrones.
 */
export const globToRegExp = glob => {
  let out = ''
  let braceDepth = 0

  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index]

    if (char === '*') {
      if (glob[index + 1] === '*') {
        if (glob[index + 2] === '/') {
          out += '(?:.*/)?'
          index += 2
        } else {
          out += '.*'
          index += 1
        }
      } else {
        out += '[^/]*'
      }
    } else if (char === '?') {
      out += '[^/]'
    } else if (char === '{') {
      braceDepth += 1
      out += '(?:'
    } else if (char === '}' && braceDepth > 0) {
      braceDepth -= 1
      out += ')'
    } else if (char === ',' && braceDepth > 0) {
      out += '|'
    } else {
      out += char.replace(/[.+^$()|[\]\\]/g, '\\$&')
    }
  }

  return new RegExp(`^${out}$`)
}

/** `@scope/pkg/sub` → `@scope/pkg`; `pkg/sub` → `pkg`; `node:fs` queda igual. */
export const packageNameFromSpecifier = specifier => {
  if (specifier.startsWith('node:')) return specifier

  const parts = specifier.split('/')

  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

const PACKAGE_PREFIX = 'pkg:'

export const packageNode = name => `${PACKAGE_PREFIX}${name}`

export const compileDenylist = denylist =>
  denylist.map(rule => ({ ...rule, regex: rule.kind === 'file' ? globToRegExp(rule.match) : null }))

/** Regla de la denylist que atrapa este nodo del grafo (archivo relativo o `pkg:<nombre>`), o null. */
export const matchDenylist = (node, compiledDenylist) => {
  if (node.startsWith(PACKAGE_PREFIX)) {
    const name = node.slice(PACKAGE_PREFIX.length)

    return compiledDenylist.find(rule => rule.kind === 'package' && rule.match === name) ?? null
  }

  return compiledDenylist.find(rule => rule.kind === 'file' && rule.regex.test(node)) ?? null
}

// ───────────────────────────── Grafo (esbuild) ─────────────────────────────

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

/** Loader `empty` para todo lo que no es código: sólo importa el grafo, no el contenido. */
const ASSET_LOADERS = Object.fromEntries(
  [
    '.css', '.scss', '.sass', '.less', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.bmp',
    '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp4', '.webm', '.mp3', '.wav', '.ogg', '.md', '.mdx', '.txt',
    '.html', '.pdf', '.wasm', '.node', '.riv', '.lottie', '.glb', '.gltf'
  ].map(ext => [ext, 'empty'])
)

/** Alias de tsconfig `paths` (`@/*` → `src/*`) para que `packages: 'external'` no los trate como paquetes. */
export const readTsconfigAliases = root => {
  try {
    const tsconfig = JSON.parse(readFileSync(join(root, 'tsconfig.json'), 'utf8'))
    const paths = tsconfig.compilerOptions?.paths ?? {}
    const alias = {}

    for (const [key, targets] of Object.entries(paths)) {
      if (!key.endsWith('/*') || !Array.isArray(targets) || !targets[0]?.endsWith('/*')) continue

      alias[key.slice(0, -2)] = join(root, targets[0].slice(0, -2))
    }

    return alias
  } catch {
    return {}
  }
}

const normalizeInputPath = file => toPosix(file).replace(/^\.\//, '')

/**
 * Suma un metafile al grafo. Sólo toma aristas INTERNAS resueltas: un registro `external` con
 * ruta relativa es un import que esbuild eliminó (sólo tipos o sin uso) — no existe en runtime.
 */
export const addMetafileToGraph = (graph, metafile) => {
  for (const [file, input] of Object.entries(metafile.inputs)) {
    const from = normalizeInputPath(file)
    let edges = graph.get(from)

    if (!edges) {
      edges = new Set()
      graph.set(from, edges)
    }

    for (const record of input.imports ?? []) {
      if (record.external) continue

      edges.add(normalizeInputPath(record.path))
    }
  }
}

/**
 * Arista viva a un paquete, capturada por el plugin. esbuild entrega el importer como ruta REAL
 * (symlinks resueltos: en macOS `/var` → `/private/var`), así que se relativiza contra la raíz y,
 * si queda fuera, contra su ruta real.
 */
const addPackageEdge = (graph, roots, importer, specifier) => {
  const candidates = roots.map(root => toPosix(relative(root, importer)))
  const from = candidates.find(candidate => !candidate.startsWith('..')) ?? candidates[0]
  let edges = graph.get(from)

  if (!edges) {
    edges = new Set()
    graph.set(from, edges)
  }

  edges.add(packageNode(packageNameFromSpecifier(specifier)))
}

const formatEsbuildError = error =>
  (error.errors ?? [])
    .slice(0, 5)
    .map(item => (item.location ? `${item.location.file}:${item.location.line}: ${item.text}` : item.text))
    .join('\n      ') || error.message

const bundleBatch = async ({ root, entryPoints, alias, watchedPackages, graph }) => {
  const roots = [root, realpathSync(root)]

  const packageFilter = watchedPackages.length
    ? new RegExp(`^(?:${watchedPackages.map(escapeRegExp).join('|')})(?:/.*)?$`)
    : null

  const plugins = packageFilter
    ? [
        {
          name: 'live-denylisted-packages',
          setup(pluginBuild) {
            // esbuild sólo resuelve imports VIVOS: este callback es la prueba de que el import
            // sobrevivió a la eliminación de tipos/sin-uso. Se marca externo igual que el resto.
            pluginBuild.onResolve({ filter: packageFilter }, args => {
              addPackageEdge(graph, roots, args.importer, args.path)

              return { path: args.path, external: true }
            })
          }
        }
      ]
    : []

  const result = await build({
    entryPoints: entryPoints.map(entry => join(root, entry)),
    bundle: true,
    write: false,
    metafile: true,
    platform: 'node',
    format: 'esm',
    // splitting deduplica el código compartido entre entradas: la salida (que se descarta) pesa
    // ~1 vez el código alcanzable y no N veces. Con write:false nada toca el disco.
    splitting: true,
    outdir: join(root, '.vercel-reachability-gate-out'),
    logLevel: 'silent',
    absWorkingDir: root,
    packages: 'external',
    jsx: 'automatic',
    tsconfig: existsSync(join(root, 'tsconfig.json')) ? join(root, 'tsconfig.json') : undefined,
    alias,
    loader: ASSET_LOADERS,
    resolveExtensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
    sourcemap: false,
    legalComments: 'none',
    plugins
  })

  addMetafileToGraph(graph, result.metafile)
}

/**
 * Construye el grafo de imports vivos de todas las entradas, en lotes para acotar memoria.
 * Si un lote falla, reintenta entrada por entrada para aislar la culpable sin perder el resto.
 */
export const collectImportGraph = async ({ root, entrypoints, batchSize, alias, watchedPackages }) => {
  const graph = new Map()
  const errors = []

  for (let start = 0; start < entrypoints.length; start += batchSize) {
    const batch = entrypoints.slice(start, start + batchSize)

    try {
      await bundleBatch({ root, entryPoints: batch, alias, watchedPackages, graph })
    } catch {
      for (const entry of batch) {
        try {
          await bundleBatch({ root, entryPoints: [entry], alias, watchedPackages, graph })
        } catch (error) {
          errors.push({ entry, message: formatEsbuildError(error) })
        }
      }
    }
  }

  return { graph, errors }
}

export const buildReverseGraph = graph => {
  const reverse = new Map()

  for (const [from, edges] of graph) {
    for (const to of edges) {
      let parents = reverse.get(to)

      if (!parents) {
        parents = new Set()
        reverse.set(to, parents)
      }

      parents.add(from)
    }
  }

  return reverse
}

/** BFS hacia adelante desde varias fuentes: todo lo alcanzable. */
export const reachableFrom = (graph, sources) => {
  const seen = new Set(sources)
  const queue = [...sources]

  for (let index = 0; index < queue.length; index += 1) {
    for (const next of graph.get(queue[index]) ?? []) {
      if (!seen.has(next)) {
        seen.add(next)
        queue.push(next)
      }
    }
  }

  return seen
}

/**
 * BFS inverso desde un objetivo: para cada nodo que lo alcanza, el siguiente salto del camino más
 * corto. Un BFS por objetivo (pocos) en vez de uno por entrada (~1.500).
 */
export const shortestPathsTo = (reverse, target) => {
  const next = new Map([[target, null]])
  const queue = [target]

  for (let index = 0; index < queue.length; index += 1) {
    const node = queue[index]

    for (const parent of reverse.get(node) ?? []) {
      if (!next.has(parent)) {
        next.set(parent, node)
        queue.push(parent)
      }
    }
  }

  return next
}

export const chainFrom = (next, start) => {
  const chain = [start]
  let current = start

  while (next.get(current) != null) {
    current = next.get(current)
    chain.push(current)
  }

  return chain
}

const displayNode = node => (node.startsWith(PACKAGE_PREFIX) ? node.slice(PACKAGE_PREFIX.length) : node)

// ───────────────────────────── Heurística de filesystem ─────────────────────────────

const FS_MODULES = new Set(['fs', 'node:fs', 'fs/promises', 'node:fs/promises'])
const PATH_MODULES = new Set(['path', 'node:path', 'path/posix', 'node:path/posix', 'path/win32', 'node:path/win32'])

/** APIs de lectura que el trazado de Next convierte en referencias a archivos. */
export const FS_READ_APIS = new Set([
  'readFileSync', 'readFile', 'readdirSync', 'readdir', 'existsSync', 'exists', 'statSync', 'stat', 'lstatSync',
  'lstat', 'createReadStream', 'opendir', 'opendirSync', 'access', 'accessSync', 'realpathSync', 'realpath',
  'readlinkSync', 'readlink', 'copyFileSync', 'copyFile', 'cpSync', 'cp', 'globSync', 'glob', 'watch'
])

/**
 * Turbopack evalúa `path.join`/`path.resolve` como referencias a archivos AUNQUE no haya una llamada
 * a fs en el mismo módulo (el path viaja a react-pdf, a `Font.register`, etc.). Por eso son sitios.
 */
const PATH_REFERENCE_APIS = new Set(['join', 'resolve'])

/** Transformaciones que conservan el ancla (el resultado sigue siendo una ruta absoluta). */
const PATH_TRANSPARENT_APIS = new Set(['join', 'resolve', 'normalize', 'dirname', 'toNamespacedPath', 'fileURLToPath'])

/** Transformaciones cuyo resultado ya no es una ruta anclada. */
const PATH_OPAQUE_APIS = new Set(['relative', 'basename', 'extname', 'parse', 'format', 'isAbsolute'])

/** Prefiltro barato: sólo se parsea con TypeScript lo que menciona un ancla de ruta de runtime. */
export const ANCHOR_HINT = /process\.cwd\(\)|__dirname|__filename|import\.meta\.(?:url|dirname|filename)/

const LITERAL = Object.freeze({ anchored: false, unknown: false })
const UNKNOWN = Object.freeze({ anchored: false, unknown: true })
const ANCHOR = Object.freeze({ anchored: true, unknown: false })

/** Partes que se concatenan en UNA ruta: basta una parte variable para que la ruta sea variable. */
const concatValues = values => ({
  anchored: values.some(value => value.anchored),
  unknown: values.some(value => value.unknown)
})

/**
 * Alternativas (`a ?? b`, `a || b`, `c ? a : b`): sólo cuenta la variabilidad de las ramas ANCLADAS.
 * `options.root ?? process.cwd()` es un ancla estática: la rama variable no es una ruta que el
 * trazado pueda ensanchar.
 */
const alternativeValues = values => {
  const anchored = values.filter(value => value.anchored)

  if (anchored.length) return { anchored: true, unknown: anchored.some(value => value.unknown) }

  return { anchored: false, unknown: values.some(value => value.unknown) }
}

const scriptKindFor = fileName => {
  if (fileName.endsWith('.tsx')) return ts.ScriptKind.TSX
  if (fileName.endsWith('.jsx')) return ts.ScriptKind.JSX
  if (fileName.endsWith('.js') || fileName.endsWith('.mjs') || fileName.endsWith('.cjs')) return ts.ScriptKind.JS

  return ts.ScriptKind.TS
}

const unwrap = node => {
  let current = node

  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      (ts.isSatisfiesExpression && ts.isSatisfiesExpression(current)))
  ) {
    current = current.expression
  }

  return current
}

const isProcessCwdCall = node =>
  ts.isCallExpression(node) &&
  node.arguments.length === 0 &&
  ts.isPropertyAccessExpression(node.expression) &&
  ts.isIdentifier(node.expression.expression) &&
  node.expression.expression.text === 'process' &&
  node.expression.name.text === 'cwd'

const isImportMetaAnchor = node =>
  ts.isPropertyAccessExpression(node) &&
  ts.isMetaProperty(node.expression) &&
  node.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
  ['url', 'dirname', 'filename'].includes(node.name.text)

/** Bindings locales de `fs` y `path` (imports ES y `require`). */
const collectModuleBindings = sourceFile => {
  const bindings = {
    fsNamespaces: new Set(),
    fsDirect: new Map(),
    pathNamespaces: new Set(),
    pathDirect: new Map()
  }

  const register = (moduleName, kind, localName, importedName) => {
    if (FS_MODULES.has(moduleName)) {
      if (kind === 'namespace' || importedName === 'promises') bindings.fsNamespaces.add(localName)
      else if (FS_READ_APIS.has(importedName)) bindings.fsDirect.set(localName, importedName)
    } else if (PATH_MODULES.has(moduleName)) {
      if (kind === 'namespace' || importedName === 'posix' || importedName === 'win32') {
        bindings.pathNamespaces.add(localName)
      } else {
        bindings.pathDirect.set(localName, importedName)
      }
    } else if (moduleName === 'url' || moduleName === 'node:url') {
      if (kind === 'named' && importedName === 'fileURLToPath') bindings.pathDirect.set(localName, 'fileURLToPath')
    }
  }

  const visit = node => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && !node.importClause?.isTypeOnly) {
      const moduleName = node.moduleSpecifier.text
      const clause = node.importClause

      if (clause?.name) register(moduleName, 'namespace', clause.name.text)

      if (clause?.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings)) {
          register(moduleName, 'namespace', clause.namedBindings.name.text)
        } else {
          for (const element of clause.namedBindings.elements) {
            if (element.isTypeOnly) continue

            register(moduleName, 'named', element.name.text, (element.propertyName ?? element.name).text)
          }
        }
      }
    } else if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === 'require' &&
      node.initializer.arguments.length === 1 &&
      ts.isStringLiteral(node.initializer.arguments[0])
    ) {
      const moduleName = node.initializer.arguments[0].text

      if (ts.isIdentifier(node.name)) {
        register(moduleName, 'namespace', node.name.text)
      } else if (ts.isObjectBindingPattern(node.name)) {
        for (const element of node.name.elements) {
          if (!ts.isIdentifier(element.name)) continue

          const imported = element.propertyName && ts.isIdentifier(element.propertyName) ? element.propertyName.text : element.name.text

          register(moduleName, 'named', element.name.text, imported)
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return bindings
}

/** ¿A qué API de fs/path apunta este callee? `{ module: 'fs'|'path', api }` o null. */
const resolveCallee = (expression, bindings) => {
  const callee = unwrap(expression)

  if (ts.isIdentifier(callee)) {
    if (bindings.fsDirect.has(callee.text)) return { module: 'fs', api: bindings.fsDirect.get(callee.text) }
    if (bindings.pathDirect.has(callee.text)) return { module: 'path', api: bindings.pathDirect.get(callee.text) }

    return null
  }

  if (!ts.isPropertyAccessExpression(callee)) return null

  const api = callee.name.text
  const owner = unwrap(callee.expression)

  if (ts.isIdentifier(owner)) {
    if (bindings.fsNamespaces.has(owner.text)) return { module: 'fs', api }
    if (bindings.pathNamespaces.has(owner.text)) return { module: 'path', api }

    return null
  }

  // fs.promises.readFile(...) / path.posix.join(...)
  if (ts.isPropertyAccessExpression(owner) && ts.isIdentifier(owner.expression)) {
    if (bindings.fsNamespaces.has(owner.expression.text) && owner.name.text === 'promises') return { module: 'fs', api }

    if (bindings.pathNamespaces.has(owner.expression.text) && ['posix', 'win32'].includes(owner.name.text)) {
      return { module: 'path', api }
    }
  }

  return null
}

/** Expresiones `return` de una función, sin entrar a funciones anidadas. */
const functionReturnExpressions = fn => {
  if (!fn.body) return []
  if (!ts.isBlock(fn.body)) return [fn.body]

  const found = []

  const visit = node => {
    if (ts.isFunctionLike(node) && node !== fn) return
    if (ts.isReturnStatement(node) && node.expression) found.push(node.expression)

    ts.forEachChild(node, visit)
  }

  ts.forEachChild(fn.body, visit)

  return found
}

/**
 * Clasifica una expresión como ruta: `anchored` = deriva de un ancla de runtime; `unknown` = tiene
 * al menos un segmento que el análisis estático no puede resolver. anchored + unknown = el trazado
 * de Turbopack incluye el directorio completo.
 *
 * El análisis es por NOMBRE (sin scopes): una variable local que sombrea a una de módulo puede
 * confundirlo. Es una heurística con ratchet, no un compilador.
 */
const evaluatePath = (node, context, depth = 0) => {
  const expression = unwrap(node)

  if (!expression || depth > 40) return UNKNOWN

  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression) || ts.isNumericLiteral(expression)) {
    return LITERAL
  }

  if (ts.isTemplateExpression(expression)) {
    return concatValues(expression.templateSpans.map(span => evaluatePath(span.expression, context, depth + 1)))
  }

  if (ts.isBinaryExpression(expression)) {
    const operator = expression.operatorToken.kind

    if (operator === ts.SyntaxKind.PlusToken) {
      return concatValues([evaluatePath(expression.left, context, depth + 1), evaluatePath(expression.right, context, depth + 1)])
    }

    if (
      operator === ts.SyntaxKind.BarBarToken ||
      operator === ts.SyntaxKind.QuestionQuestionToken
    ) {
      return alternativeValues([evaluatePath(expression.left, context, depth + 1), evaluatePath(expression.right, context, depth + 1)])
    }

    return UNKNOWN
  }

  if (ts.isConditionalExpression(expression)) {
    return alternativeValues([
      evaluatePath(expression.whenTrue, context, depth + 1),
      evaluatePath(expression.whenFalse, context, depth + 1)
    ])
  }

  if (ts.isIdentifier(expression)) {
    if (expression.text === '__dirname' || expression.text === '__filename') return ANCHOR
    if (context.values.has(expression.text)) return context.values.get(expression.text)
    if (context.literals.has(expression.text)) return LITERAL

    return UNKNOWN
  }

  if (isImportMetaAnchor(expression)) return ANCHOR

  if (ts.isNewExpression(expression)) {
    // new URL('./x', import.meta.url)
    if (ts.isIdentifier(expression.expression) && expression.expression.text === 'URL' && expression.arguments?.length) {
      return concatValues(expression.arguments.map(arg => evaluatePath(arg, context, depth + 1)))
    }

    return UNKNOWN
  }

  if (ts.isCallExpression(expression)) {
    if (isProcessCwdCall(expression)) return ANCHOR

    const callee = resolveCallee(expression.expression, context.bindings)

    if (callee?.module === 'path') {
      const args = expression.arguments.map(arg => evaluatePath(arg, context, depth + 1))

      if (PATH_TRANSPARENT_APIS.has(callee.api)) return concatValues(args)

      if (PATH_OPAQUE_APIS.has(callee.api)) {
        return args.every(arg => !arg.anchored && !arg.unknown) ? LITERAL : UNKNOWN
      }

      return UNKNOWN
    }

    const calleeNode = unwrap(expression.expression)

    if (ts.isIdentifier(calleeNode) && context.functions.has(calleeNode.text)) {
      return context.functions.get(calleeNode.text)
    }

    return UNKNOWN
  }

  return UNKNOWN
}

const sameValue = (left, right) => left?.anchored === right?.anchored && left?.unknown === right?.unknown

/**
 * Propaga anclas por nombre hasta un punto fijo: `const ROOT = process.cwd()`,
 * `const DIR = join(ROOT, 'x')`, parámetros con default `root = process.cwd()` y funciones que
 * devuelven una ruta anclada (`const asset = file => resolve(process.cwd(), 'public', file)`).
 */
const buildPathContext = (sourceFile, bindings) => {
  const declarations = []
  const functions = []

  const visit = node => {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && ts.isIdentifier(node.name) && node.initializer) {
      const initializer = unwrap(node.initializer)

      if (initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) {
        functions.push({ name: node.name.text, fn: initializer })
      } else {
        declarations.push({ name: node.name.text, initializer: node.initializer })
      }
    } else if (ts.isFunctionDeclaration(node) && node.name) {
      functions.push({ name: node.name.text, fn: node })
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  const context = { bindings, values: new Map(), literals: new Set(), functions: new Map() }

  for (let pass = 0; pass < 6; pass += 1) {
    let changed = false

    for (const { name, initializer } of declarations) {
      const value = evaluatePath(initializer, context)

      if (value.anchored) {
        if (!sameValue(context.values.get(name), value)) {
          context.values.set(name, value)
          changed = true
        }
      } else if (!value.unknown && !context.literals.has(name)) {
        context.literals.add(name)
        changed = true
      }
    }

    for (const { name, fn } of functions) {
      const returns = functionReturnExpressions(fn).map(expression => evaluatePath(expression, context))
      const value = returns.length ? alternativeValues(returns) : UNKNOWN

      if (value.anchored && !sameValue(context.functions.get(name), value)) {
        context.functions.set(name, value)
        changed = true
      }
    }

    if (!changed) break
  }

  return context
}

const snippetOf = (node, sourceFile) => node.getText(sourceFile).replace(/\s+/g, ' ').slice(0, 140)

/**
 * Hallazgos de la heurística en un archivo fuente: sitios donde una ruta anclada a
 * `process.cwd()`/`__dirname`/`import.meta.url` tiene un segmento no literal.
 * Devuelve `[{ line, kind: 'fs'|'path'|'url', api, snippet }]`, uno por línea.
 */
export const analyzeFsSource = (source, fileName = 'module.ts') => {
  if (!ANCHOR_HINT.test(source)) return []

  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKindFor(fileName))
  const bindings = collectModuleBindings(sourceFile)
  const context = buildPathContext(sourceFile, bindings)
  const byLine = new Map()

  const report = (node, kind, api) => {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1

    if (!byLine.has(line)) byLine.set(line, { line, kind, api, snippet: snippetOf(node, sourceFile) })
  }

  const visit = node => {
    if (ts.isCallExpression(node)) {
      const callee = resolveCallee(node.expression, bindings)

      if (callee?.module === 'fs' && FS_READ_APIS.has(callee.api) && node.arguments.length) {
        const value = evaluatePath(node.arguments[0], context)

        if (value.anchored && value.unknown) report(node, 'fs', callee.api)
      } else if (callee?.module === 'path' && PATH_REFERENCE_APIS.has(callee.api)) {
        const value = evaluatePath(node, context)

        if (value.anchored && value.unknown) report(node, 'path', callee.api)
      }
    } else if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'URL' &&
      node.arguments?.length === 2 &&
      isImportMetaAnchor(unwrap(node.arguments[1]))
    ) {
      const value = evaluatePath(node.arguments[0], context)

      if (value.unknown) report(node, 'url', 'URL')
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return [...byLine.values()].sort((left, right) => left.line - right.line)
}

// ───────────────────────────── Allowlist (ratchet) ─────────────────────────────

/** Errores de forma de la allowlist: sin `file`/`reason`/`since` la entrada no se acepta. */
export const validateAllowlist = allowlist => {
  const errors = []
  const entries = Array.isArray(allowlist?.fsDynamicPath) ? allowlist.fsDynamicPath : null

  if (!entries) return ['la allowlist debe tener un arreglo `fsDynamicPath`.']

  const seen = new Set()

  entries.forEach((entry, index) => {
    const where = `fsDynamicPath[${index}]`

    if (typeof entry?.file !== 'string' || !entry.file) errors.push(`${where}: falta \`file\`.`)
    if (typeof entry?.reason !== 'string' || entry.reason.trim().length < 10) errors.push(`${where}: falta \`reason\` (≥10 caracteres).`)
    if (typeof entry?.since !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.since)) errors.push(`${where}: \`since\` debe ser YYYY-MM-DD.`)
    if (entry?.file && seen.has(entry.file)) errors.push(`${where}: \`${entry.file}\` está duplicado.`)

    seen.add(entry?.file)
  })

  return errors
}

/**
 * Ratchet: hallazgo en la allowlist → info; hallazgo nuevo → falla; entrada que ya no tiene hallazgo
 * → advertencia (hay que borrarla para que la lista sólo se achique).
 *
 * @param findings Map<archivo, hallazgos[]> de archivos ALCANZABLES con hallazgos.
 * @param staleReason (archivo) => texto que explica por qué la entrada quedó obsoleta.
 */
export const applyAllowlist = ({ findings, allowlistEntries, staleReason = () => 'ya no tiene hallazgos' }) => {
  const allowed = new Map(allowlistEntries.map(entry => [entry.file, entry]))
  const fresh = []
  const allowlisted = []
  const stale = []

  for (const [file, hits] of findings) {
    if (allowed.has(file)) allowlisted.push({ file, hits, entry: allowed.get(file) })
    else fresh.push({ file, hits })
  }

  for (const entry of allowlistEntries) {
    if (!findings.has(entry.file)) stale.push({ ...entry, why: staleReason(entry.file) })
  }

  return { fresh, allowlisted, stale }
}

// ───────────────────────────── Orquestación ─────────────────────────────

const readAllowlist = (root, allowlistPath) => {
  const absolute = join(root, allowlistPath)

  if (!existsSync(absolute)) return { fsDynamicPath: [] }

  return JSON.parse(readFileSync(absolute, 'utf8'))
}

const isAnalyzableSource = file =>
  file.startsWith('src/') && CODE_EXTENSIONS.has(extname(file)) && !file.endsWith('.d.ts')

/**
 * Corre el gate completo y devuelve un reporte (no imprime). Opciones pensadas para los tests:
 * `entrypoints`, `denylist` y `allowlist` se pueden inyectar.
 */
export const runReachabilityGate = async ({
  root = repoRoot,
  entrypoints = discoverEntrypoints(root),
  denylist = DENYLIST,
  allowlist,
  allowlistPath = ALLOWLIST_RELATIVE_PATH,
  batchSize = 200
} = {}) => {
  const startedAt = Date.now()
  const compiledDenylist = compileDenylist(denylist)
  const watchedPackages = denylist.filter(rule => rule.kind === 'package').map(rule => rule.match)
  const alias = readTsconfigAliases(root)
  const resolvedAllowlist = allowlist ?? readAllowlist(root, allowlistPath)
  const allowlistErrors = validateAllowlist(resolvedAllowlist)

  const { graph, errors } = await collectImportGraph({ root, entrypoints, batchSize, alias, watchedPackages })
  const reverse = buildReverseGraph(graph)

  // 1) Denylist: cada objetivo presente en el grafo → entradas que lo alcanzan + camino más corto.
  const allNodes = new Set(graph.keys())

  for (const edges of graph.values()) for (const node of edges) allNodes.add(node)

  const violations = []

  for (const node of [...allNodes].sort()) {
    const rule = matchDenylist(node, compiledDenylist)

    if (!rule) continue

    const next = shortestPathsTo(reverse, node)
    const reachedBy = entrypoints.filter(entry => entry !== node && next.has(entry))

    if (reachedBy.length === 0) continue

    violations.push({
      target: displayNode(node),
      kind: rule.kind,
      rule: rule.match,
      reason: rule.reason,
      fix: rule.fix,
      entrypoints: reachedBy.map(entry => ({ entry, chain: chainFrom(next, entry).map(displayNode) }))
    })
  }

  // 2) Heurística de fs sobre los módulos de src/ alcanzables.
  const reachable = reachableFrom(graph, entrypoints.filter(entry => graph.has(entry)))
  const findings = new Map()

  for (const file of [...reachable].sort()) {
    if (!isAnalyzableSource(file)) continue

    let source

    try {
      source = readFileSync(join(root, file), 'utf8')
    } catch {
      continue
    }

    const hits = analyzeFsSource(source, file)

    if (hits.length) findings.set(file, hits)
  }

  const staleReason = file => {
    if (!existsSync(join(root, file))) return 'el archivo ya no existe'

    const hits = analyzeFsSource(readFileSync(join(root, file), 'utf8'), file)

    return hits.length
      ? 'ya no es alcanzable desde ninguna entrada de Vercel'
      : 'ya no coincide con la heurística'
  }

  const allowlistEntries = Array.isArray(resolvedAllowlist?.fsDynamicPath) ? resolvedAllowlist.fsDynamicPath : []
  const ratchet = applyAllowlist({ findings, allowlistEntries, staleReason })

  const describeReach = file => {
    const next = shortestPathsTo(reverse, file)
    const reachedBy = entrypoints.filter(entry => next.has(entry))

    return {
      count: reachedBy.length,
      examples: reachedBy.slice(0, 3).map(entry => ({ entry, chain: chainFrom(next, entry) }))
    }
  }

  const fsFresh = ratchet.fresh.map(item => ({ ...item, reach: describeReach(item.file) }))
  const fsAllowlisted = ratchet.allowlisted.map(item => ({ ...item, reach: describeReach(item.file) }))

  return {
    ok: violations.length === 0 && fsFresh.length === 0 && errors.length === 0 && allowlistErrors.length === 0,
    durationMs: Date.now() - startedAt,
    entrypointCount: entrypoints.length,
    moduleCount: graph.size,
    batchSize,
    violations,
    fs: { fresh: fsFresh, allowlisted: fsAllowlisted, stale: ratchet.stale },
    analysisErrors: errors,
    allowlistErrors
  }
}

// ───────────────────────────── CLI ─────────────────────────────

const parseArgs = argv => {
  const options = { json: false, verbose: false, batchSize: 200 }

  for (const arg of argv) {
    if (arg === '--json') options.json = true
    else if (arg === '--verbose') options.verbose = true
    else if (arg.startsWith('--batch-size=')) options.batchSize = Math.max(1, Number(arg.split('=')[1]) || 200)
  }

  return options
}

const FS_FIX =
  'Cómo arreglar: una ruta armada con `process.cwd()`/`__dirname`/`import.meta.url` más un segmento variable hace ' +
  'que Turbopack meta en la función el directorio completo (o el proyecto entero). Usa una ruta literal completa, ' +
  'o mueve la lectura del filesystem a `scripts/` y genera un artefacto (JSON/TS) que la ruta importe. Si el caso ' +
  `está acotado y medido, agrégalo a ${ALLOWLIST_RELATIVE_PATH} con \`reason\`, \`owner\` y \`since\`.`

const printReport = (report, { verbose }) => {
  const limit = verbose ? Infinity : 3

  for (const error of report.allowlistErrors) console.error(`✗ allowlist: ${error}`)

  for (const error of report.analysisErrors) {
    console.error(`✗ No se pudo analizar ${error.entry}:\n      ${error.message}`)
  }

  if (report.violations.length) {
    const affected = new Set(report.violations.flatMap(violation => violation.entrypoints.map(item => item.entry)))

    console.error('')
    console.error(
      `✗ ${report.violations.length} objetivo(s) de la denylist alcanzables desde ${affected.size} entrada(s) de Vercel:`
    )

    // Paquetes primero: son los que pesan; los archivos del motor explican por dónde llegan.
    const ordered = [...report.violations].sort((left, right) => (left.kind === right.kind ? 0 : left.kind === 'package' ? -1 : 1))

    for (const violation of ordered) {
      const label = violation.kind === 'package' ? 'paquete' : 'archivo'

      console.error('')
      console.error(`  ✗ ${violation.target} (${label}) — alcanzado por ${violation.entrypoints.length} entrada(s).`)
      console.error(`    Por qué no: ${violation.reason}`)

      for (const { entry, chain } of violation.entrypoints.slice(0, limit)) {
        console.error(`    · ${entry}`)
        console.error(`        ${chain.join('\n        → ')}`)
      }

      if (violation.entrypoints.length > limit) {
        console.error(`    … y ${violation.entrypoints.length - limit} entrada(s) más (usa --verbose).`)
      }
    }

    console.error('')
    console.error('  Cómo arreglar:')

    for (const fix of new Set(ordered.map(violation => violation.fix))) console.error(`    - ${fix}`)
  }

  if (report.fs.fresh.length) {
    console.error('')
    console.error(`✗ ${report.fs.fresh.length} módulo(s) nuevo(s) arman rutas de runtime con un segmento variable:`)

    for (const item of report.fs.fresh) {
      console.error('')
      console.error(`  ✗ ${item.file} — alcanzado por ${item.reach.count} entrada(s).`)

      for (const hit of item.hits.slice(0, verbose ? Infinity : 5)) {
        console.error(`    línea ${hit.line} (${hit.kind}.${hit.api}): ${hit.snippet}`)
      }

      for (const { entry, chain } of item.reach.examples.slice(0, verbose ? 3 : 1)) {
        console.error(`    · ${entry}`)
        console.error(`        ${chain.join('\n        → ')}`)
      }
    }

    console.error('')
    console.error(`  ${FS_FIX}`)
  }

  if (report.fs.allowlisted.length) {
    console.log('')
    console.log(`ℹ ${report.fs.allowlisted.length} módulo(s) con rutas de runtime variables, aceptados en la allowlist:`)

    for (const item of report.fs.allowlisted) {
      const lines = item.hits.map(hit => hit.line).join(', ')

      console.log(`  · ${item.file} (línea(s) ${lines}; ${item.reach.count} entrada(s)) — ${item.entry.reason}`)
    }
  }

  if (report.fs.stale.length) {
    console.warn('')
    console.warn(`⚠ ${report.fs.stale.length} entrada(s) obsoleta(s) en ${ALLOWLIST_RELATIVE_PATH} (bórralas para que la lista se achique):`)

    for (const entry of report.fs.stale) console.warn(`  · ${entry.file}: ${entry.why}`)
  }

  const seconds = (report.durationMs / 1000).toFixed(1)
  const rssMb = Math.round(process.resourceUsage().maxRSS / 1024)

  console.log('')
  console.log(
    `Entradas analizadas: ${report.entrypointCount} (lotes de ${report.batchSize}) · módulos en el grafo: ` +
      `${report.moduleCount} · ${seconds} s · RSS máx. del proceso Node: ${rssMb} MB (esbuild corre en un proceso aparte).`
  )

  if (report.ok) {
    console.log('✓ Ninguna función de Vercel alcanza la denylist ni una ruta de runtime variable sin registrar.')
  } else {
    console.error('✗ Gate de alcanzabilidad de funciones de Vercel en rojo (ISSUE-177).')
  }
}

const main = async () => {
  const options = parseArgs(process.argv.slice(2))
  const report = await runReachabilityGate({ batchSize: options.batchSize })

  if (options.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printReport(report, options)
  }

  return report.ok ? 0 : 1
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  main()
    .then(code => process.exit(code))
    .catch(error => {
      console.error(`✗ vercel-function-reachability-gate falló: ${error.stack ?? error.message}`)
      process.exit(1)
    })
}
