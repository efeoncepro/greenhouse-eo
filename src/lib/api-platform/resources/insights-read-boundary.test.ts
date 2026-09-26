import path from 'node:path'

import { build } from 'esbuild'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * ISSUE-177 (capa 3) — frontera lectura/commands de la capa de recursos de Efeonce Insights.
 *
 * Qué protege: una ruta GET de Insights (`catalog`, `reports`, …) NO debe cargar el barrel
 * `@/lib/efeonce-insights/commands`, que re-exporta el render entero. Con un único módulo de
 * recursos, cualquier import pesado del render entraba en TODAS las funciones de Vercel de
 * Insights (`api/platform/app/insights/catalog` llegó a 441 MB en staging, 2026-09-22).
 *
 * Con qué lo verifica — el mecanismo, no el texto del import:
 *
 * 1. **Grafo real del bundler.** esbuild resuelve el grafo TRANSITIVO de valores de cada módulo
 *    (los `import type` se eliminan, igual que al compilar Next antes del trazado de archivos) y
 *    `metafile.inputs` lista cada archivo que entraría. Un import del barrel escondido detrás de un
 *    helper también aparece. Para que el detector no sea vacío, se comprueba además que SÍ ve el
 *    render en el grafo de los módulos de commands.
 * 2. **Cableado del puerto de outputs (comportamiento).** El barrel de commands, AL CARGARSE,
 *    ejecuta `wireInsightOutputsPort()`; sólo `issueInsightEdition` lee ese puerto. Si un módulo que
 *    expone commands dejara de cargar el barrel (p. ej. por deep-imports), `issue` fallaría con un
 *    `409 not_ready` engañoso («el render durable aún no está conectado»). Por eso se importa cada
 *    módulo de verdad y se observa el puerto antes y después.
 *
 * Este test NO mide el tamaño de la función: eso es la capa 2 de ISSUE-177 (gate sobre los
 * `*.nft.json` del build). Aquí sólo se garantiza que una lectura no arrastra commands ni render.
 */

const ROOT = process.cwd()
const RESOURCES = 'src/lib/api-platform/resources'

/** Módulos que usan las rutas de lectura: jamás deben alcanzar commands, render ni el composer. */
const READ_SIDE_MODULES = ['app-insights-read.ts', 'ecosystem-insights-read.ts', 'app-insights-scope.ts', 'ecosystem-insights-scope.ts']

/** Módulos de commands: DEBEN cargar el barrel (cablea el puerto de outputs). */
const COMMAND_MODULES = ['app-insights.ts', 'ecosystem-insights.ts']

const COMMANDS_BARREL = 'src/lib/efeonce-insights/commands/index.ts'
const RENDER_COMMANDS = 'src/lib/efeonce-insights/render/commands.ts'
const ARTIFACT_COMPOSER_DIR = 'src/lib/artifact-composer/'

/** Archivos del repo que el bundler incluiría al importar `file` (node_modules queda externo). */
const bundledInputs = async (file: string): Promise<string[]> => {
  const result = await build({
    entryPoints: [path.join(ROOT, RESOURCES, file)],
    absWorkingDir: ROOT,
    bundle: true,
    write: false,
    metafile: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    logLevel: 'silent'
  })

  return Object.keys(result.metafile.inputs).map(input => input.split(path.sep).join('/'))
}

const isForbiddenForReads = (input: string) => input === COMMANDS_BARREL || input === RENDER_COMMANDS || input.startsWith(ARTIFACT_COMPOSER_DIR)

describe('ISSUE-177 — grafo de imports de la capa de recursos de Insights', () => {
  it.each(READ_SIDE_MODULES)('%s no alcanza commands, render/commands ni @/lib/artifact-composer', async file => {
    const inputs = await bundledInputs(file)

    // Sanidad: el alias `@/` se resolvió (si quedara externo, el grafo estaría vacío y el test mentiría).
    expect(inputs).toContain(`${RESOURCES}/${file}`)
    expect(inputs.some(input => input.startsWith('src/lib/api-platform/core/'))).toBe(true)

    expect(inputs.filter(isForbiddenForReads), `${file} arrastra commands/render a las rutas de lectura`).toEqual([])
  })

  it.each(COMMAND_MODULES)('%s carga el barrel de commands (y el detector ve el render en su grafo)', async file => {
    const inputs = await bundledInputs(file)

    expect(inputs).toContain(COMMANDS_BARREL)
    expect(inputs).toContain('src/lib/efeonce-insights/render/outputs-port.ts')
    // Prueba de que el detector de arriba no es vacío: el mismo análisis SÍ encuentra el render aquí.
    expect(inputs).toContain(RENDER_COMMANDS)
  })
})

describe('ISSUE-177 — cableado del puerto de outputs según el módulo que carga la ruta', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock('server-only', () => ({}))
  })

  // Imports estáticos (no plantillas): el bundler de vitest sólo resuelve rutas literales.
  const IMPORTERS: Record<string, () => Promise<unknown>> = {
    'app-insights.ts': () => import('./app-insights'),
    'ecosystem-insights.ts': () => import('./ecosystem-insights'),
    'app-insights-read.ts': () => import('./app-insights-read'),
    'ecosystem-insights-read.ts': () => import('./ecosystem-insights-read')
  }

  const portAfterImporting = async (file: string) => {
    const { getInsightOutputsPort } = await import('@/lib/efeonce-insights/ports')
    const before = getInsightOutputsPort()

    await IMPORTERS[file]!()

    return { before, after: getInsightOutputsPort() }
  }

  it.each(COMMAND_MODULES)('importar %s conecta el puerto (issue no queda en «no conectado»)', async file => {
    const { before, after } = await portAfterImporting(file)

    expect(after).not.toBe(before)
  })

  it.each(['app-insights-read.ts', 'ecosystem-insights-read.ts'])('importar %s NO carga el barrel: el puerto sigue sin conectar', async file => {
    const { before, after } = await portAfterImporting(file)

    expect(after).toBe(before)
  })
})
