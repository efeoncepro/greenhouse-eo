import path from 'node:path'

import { build, type Metafile, type Plugin } from 'esbuild'
import { describe, expect, it } from 'vitest'

/**
 * Gate de la entrada liviana `@/lib/artifact-composer/pure` (ISSUE-177) — mide el CIERRE TRANSITIVO REAL.
 *
 * `pure.ts` existe para que el código que corre en Vercel (encolar, mapear, sellar) use el composer sin
 * arrastrar el motor de render. Si alguna vez re-exporta —directa o indirectamente— algo que toca
 * Playwright, pdf-lib, `node:fs` o los catálogos, la función de Vercel vuelve a pasar los 250 MB y el
 * deploy falla recién en el build remoto: nada local lo ve (así pasó el 2026-09-16 y el 2026-09-22).
 *
 * Por qué esbuild y no una lectura de imports con regex como `package-boundary.test.ts`: lo que importa
 * acá no es qué importa `pure.ts`, sino qué termina DENTRO del bundle siguiendo toda la cadena. Un
 * módulo puro hoy puede sumar mañana un import pesado, y sólo recorrer el grafo completo lo detecta.
 * `packages: 'external'` deja las dependencias como imports externos del metafile: así se ven por
 * nombre sin tener que empaquetarlas.
 *
 * El control positivo (el barrel SÍ alcanza Playwright) prueba que el test es capaz de fallar: sin él,
 * un metafile vacío por un error de configuración pasaría en verde.
 */

const REPO_ROOT = path.resolve(__dirname, '../../../..')
const SRC_DIR = path.join(REPO_ROOT, 'src')
const PACKAGE_REL = 'src/lib/artifact-composer'

// Los módulos del motor que cargan el render, los catálogos o el disco. Ninguno puede entrar a `pure`.
const HEAVY_COMPOSER_FILES = [
  `${PACKAGE_REL}/index.ts`,
  `${PACKAGE_REL}/render.ts`,
  `${PACKAGE_REL}/compose.ts`,
  `${PACKAGE_REL}/catalog.ts`,
  `${PACKAGE_REL}/quality-gates.ts`,
  `${PACKAGE_REL}/compile-catalog-tokens.ts`
]

const HEAVY_COMPOSER_DIRS = [`${PACKAGE_REL}/catalogs/`, `${PACKAGE_REL}/brand-packs/`]

// Dependencias externas que sólo pueden vivir en el worker de render.
const FORBIDDEN_EXTERNALS = ['playwright', 'playwright-core', 'pdf-lib', 'pngjs', 'node:fs', 'fs', 'node:fs/promises', 'fs/promises']

// El alias `@/` del monolito resuelto contra `src/`, con la resolución de extensiones de esbuild. Hoy el
// paquete no lo usa (lo prohíbe `package-boundary.test.ts`), pero si alguien lo introdujera, el grafo
// tiene que seguir midiéndose entero y no cortarse en un import que esbuild no sabe resolver.
const monolithAlias: Plugin = {
  name: 'monolith-alias',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^@\// }, args =>
      pluginBuild.resolve(`./${args.path.slice(2)}`, { resolveDir: SRC_DIR, kind: args.kind })
    )
  }
}

interface BundleGraph {
  inputs: string[]
  externals: string[]
}

const bundleGraphOf = async (entryRel: string): Promise<BundleGraph> => {
  const result = await build({
    entryPoints: [path.join(REPO_ROOT, entryRel)],
    absWorkingDir: REPO_ROOT,
    bundle: true,
    write: false,
    metafile: true,
    platform: 'node',
    packages: 'external',
    format: 'esm',
    logLevel: 'silent',
    plugins: [monolithAlias]
  })

  const metafile: Metafile = result.metafile!
  const externals = new Set<string>()

  for (const input of Object.values(metafile.inputs)) {
    for (const imported of input.imports) {
      if (imported.external) externals.add(imported.path)
    }
  }

  // Las claves de `inputs` son rutas relativas a `absWorkingDir` (`src/lib/…`), comparables tal cual.
  return { inputs: Object.keys(metafile.inputs), externals: [...externals] }
}

const isHeavyComposerFile = (input: string): boolean =>
  HEAVY_COMPOSER_FILES.includes(input) || HEAVY_COMPOSER_DIRS.some(dir => input.startsWith(dir))

const isForbiddenExternal = (spec: string): boolean =>
  FORBIDDEN_EXTERNALS.some(forbidden => spec === forbidden || spec.startsWith(`${forbidden}/`))

describe('entrada liviana del composer (`pure.ts`) — ISSUE-177', () => {
  it('su cierre transitivo no alcanza ningún módulo pesado del motor', async () => {
    const { inputs } = await bundleGraphOf(`${PACKAGE_REL}/pure.ts`)

    // Sanidad: el grafo se midió de verdad (entrada + al menos un módulo re-exportado).
    expect(inputs).toContain(`${PACKAGE_REL}/pure.ts`)
    expect(inputs).toContain(`${PACKAGE_REL}/paginate.ts`)

    expect(
      inputs.filter(isHeavyComposerFile),
      'pure.ts alcanza un módulo del motor que carga el render, un catálogo o el disco. Eso vuelve a meter ' +
        'el motor en la función de Vercel (ISSUE-177): la función nueva no es liviana, va al barrel y corre ' +
        'en services/artifact-worker.'
    ).toEqual([])
  })

  it('no importa Playwright, pdf-lib, pngjs ni el sistema de archivos', async () => {
    const { externals } = await bundleGraphOf(`${PACKAGE_REL}/pure.ts`)

    expect(
      externals.filter(isForbiddenExternal),
      'pure.ts depende de un paquete que sólo puede vivir en el worker de render (ISSUE-177).'
    ).toEqual([])
  })

  it('control positivo: el barrel completo SÍ alcanza Playwright (el test puede fallar)', async () => {
    const { inputs, externals } = await bundleGraphOf(`${PACKAGE_REL}/index.ts`)

    expect(externals).toContain('playwright')
    expect(externals).toContain('pdf-lib')
    expect(inputs).toContain(`${PACKAGE_REL}/render.ts`)
  })
})
