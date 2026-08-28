import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1700 — El boundary §1.1, verificado sobre el CÓDIGO y no sobre la intención.
 *
 * Los invariantes que este gate sostiene no se pueden probar con un unit test del
 * comportamiento: son afirmaciones sobre lo que el módulo NO hace. Un colector que un día
 * "optimice" el cruce SEO↔AEO con un JOIN pasaría todos los tests de comportamiento —
 * devolvería las mismas filas— y rompería el aislamiento entre motores que es la razón de
 * ser del contrato.
 *
 * ⚠️ El gate se escribe DERIVANDO los archivos del directorio, no con una lista literal: un
 * colector nuevo queda cubierto por existir, sin que nadie se acuerde de agregarlo acá.
 */

const MODULE_DIR = path.join(process.cwd(), 'src/lib/growth/seo/work-queue')

const listSourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(entry => {
    const full = path.join(dir, entry)

    if (statSync(full).isDirectory()) {
      return entry === '__tests__' ? [] : listSourceFiles(full)
    }

    return full.endsWith('.ts') ? [full] : []
  })

const sourceFiles = listSourceFiles(MODULE_DIR)

describe('TASK-1700 — boundary del módulo de la cola', () => {
  it('hay archivos que auditar (el gate no puede pasar por estar vacío)', () => {
    expect(sourceFiles.length).toBeGreaterThan(5)
  })

  it('NINGÚN archivo consulta tablas grader_* por SQL', () => {
    // El lado AEO entra SÓLO por `readSeoAeoGap`. Un JOIN o un SELECT directo acoplaría dos
    // motores con providers, cadencias y breakers distintos — la violación más cara posible.
    const offenders = sourceFiles.filter(file => /greenhouse_growth\.grader_/.test(readFileSync(file, 'utf8')))

    expect(offenders.map(f => path.relative(process.cwd(), f))).toEqual([])
  })

  it('NINGÚN archivo hace deep import a growth/ai-visibility', () => {
    // El lado AEO se consume por su superficie pública declarada (TASK-1670), no metiendo la
    // mano en sus internos.
    const offenders = sourceFiles.filter(file =>
      /from\s+['"](@\/lib\/growth\/ai-visibility|\.\.\/\.\.\/ai-visibility)/.test(readFileSync(file, 'utf8'))
    )

    expect(offenders.map(f => path.relative(process.cwd(), f))).toEqual([])
  })

  it('NINGÚN archivo crea su propio Pool de pg', () => {
    const offenders = sourceFiles.filter(file => /new\s+Pool\s*\(/.test(readFileSync(file, 'utf8')))

    expect(offenders.map(f => path.relative(process.cwd(), f))).toEqual([])
  })

  it('todo archivo del módulo es server-only', () => {
    // El store, la resolución de tenant y el lado AEO nunca cruzan al browser. El DTO cliente
    // sale por un redactor explícito, no por un import que se coló.
    const offenders = sourceFiles.filter(file => !readFileSync(file, 'utf8').includes("import 'server-only'"))

    expect(offenders.map(f => path.relative(process.cwd(), f))).toEqual([])
  })

  it('NINGÚN archivo importa @core, @menu ni @layouts (el materializador va al bundle del worker)', () => {
    // Un import de tema/UI acá revienta el arranque del ops-worker en silencio (bug class
    // documentada en los invariantes de Ops/Reliability).
    const offenders = sourceFiles.filter(file =>
      /from\s+['"]@(core|menu|layouts)\//.test(readFileSync(file, 'utf8'))
    )

    expect(offenders.map(f => path.relative(process.cwd(), f))).toEqual([])
  })

  it('el orden NUNCA se computa con el volumen estimado del proveedor', () => {
    // El invariante ●/◑ aplicado al ORDEN. `searchVolume`/`search_volume` no tiene por qué
    // aparecer en este módulo: la cola ordena por demanda medida o declara que no puede.
    const offenders = sourceFiles.filter(file => /\bsearch_?[vV]olume\b/.test(readFileSync(file, 'utf8')))

    expect(offenders.map(f => path.relative(process.cwd(), f))).toEqual([])
  })
})
