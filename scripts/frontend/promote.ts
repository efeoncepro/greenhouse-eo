#!/usr/bin/env tsx
/**
 * Greenhouse Visual Capture — promote (TASK-1098, Capa 3).
 *
 * Cristaliza una sesión de `fe:capture:explore` en un `.scenario.ts`
 * determinístico: readiness sugerido + marks, validado contra el DSL canónico.
 * El output durable SIEMPRE es el DSL gobernado — la improvisación de explore
 * se DESTILA, nunca se commitea como verificación cruda.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import type { ExploreSession } from './lib/explore'
import { slugifyRoute } from './lib/explore'
import { buildPromotedScenario, serializeScenario } from './lib/promote'
import { validateScenario } from './lib/scenario'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '../..')
const EXPLORE_DIR = resolve(REPO_ROOT, '.captures', '_explore')
const SCENARIOS_DIR = resolve(SCRIPT_DIR, 'scenarios')

const PRINT = (msg: string) => console.log(msg)

const HELP_TEXT = `Greenhouse Visual Capture — promote (TASK-1098)

Cristaliza una sesión de explore en un .scenario.ts determinístico.

Uso:
  pnpm fe:capture:promote --name=<scenario-name> (--route=/path | --session=<dir>) [--mark='<selector>']… [--force]

Opciones:
  --name=<name>      Nombre kebab-case del scenario (= archivo). Requerido.
  --route=<path>     Resuelve la sesión desde .captures/_explore/<slug>/
  --session=<dir>    Carpeta de sesión explícita (alternativa a --route)
  --mark=<selector>  Selector de detalle a marcar (scroll + clipSelector). Repetible.
  --out=<path>       Path de salida. Default: scripts/frontend/scenarios/<name>.scenario.ts
  --force            Sobrescribe si el archivo ya existe
  -h, --help
`

const loadSession = (sessionDir: string): ExploreSession => {
  const path = resolve(sessionDir, 'session.json')

  if (!existsSync(path)) {
    throw new Error(
      `No hay session.json en ${path}.\n` +
        `Corré primero: pnpm fe:capture:explore --route=<path>`
    )
  }

  return JSON.parse(readFileSync(path, 'utf8')) as ExploreSession
}

const main = async (): Promise<void> => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      name: { type: 'string' },
      route: { type: 'string' },
      session: { type: 'string' },
      mark: { type: 'string', multiple: true },
      out: { type: 'string' },
      force: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false }
    }
  })

  if (values.help === true) {
    PRINT(HELP_TEXT)

    return
  }

  const name = values.name as string | undefined

  if (!name || !/^[a-z0-9-]+$/.test(name)) {
    throw new Error(`--name requerido (kebab-case): "${name ?? ''}"`)
  }

  if (!values.route && !values.session) {
    throw new Error('Pasá --route=<path> o --session=<dir> para resolver la sesión de explore.')
  }

  const sessionDir = values.session
    ? resolve(REPO_ROOT, values.session as string)
    : resolve(EXPLORE_DIR, slugifyRoute(values.route as string))

  const session = loadSession(sessionDir)

  const scenario = buildPromotedScenario(session, {
    name,
    markSelectors: values.mark as string[] | undefined
  })

  // Gate canónico: el scenario emitido DEBE ser válido contra el DSL.
  validateScenario(scenario)

  const outPath = values.out
    ? resolve(REPO_ROOT, values.out as string)
    : resolve(SCENARIOS_DIR, `${name}.scenario.ts`)

  if (existsSync(outPath) && values.force !== true) {
    throw new Error(`${outPath.replace(REPO_ROOT, '<repo>')} ya existe. Usá --force para sobrescribir.`)
  }

  writeFileSync(outPath, serializeScenario(scenario), 'utf8')

  PRINT(`✓ scenario emitido: ${outPath.replace(REPO_ROOT, '<repo>')}`)
  PRINT(`  readiness: ${scenario.readiness?.selector ?? '(solo absentSelectors + fonts)'}`)
  PRINT(`  steps: ${scenario.steps.map(s => `${s.kind}${s.label ? `:${s.label}` : ''}`).join(' · ')}`)
  PRINT('')
  PRINT(`Siguiente: revisá selectores/marks y capturá →`)
  PRINT(`  pnpm fe:capture ${name} --env=${session.env}`)
}

main().catch(err => {
  console.error(err instanceof Error ? err.stack : String(err))
  process.exit(1)
})
