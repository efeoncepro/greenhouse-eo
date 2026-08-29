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

  /*
   * El invariante real es "el ORDEN no se computa con volumen estimado", no "la palabra
   * `searchVolume` no aparece". El adapter de la lente SÍ la transporta —es una columna que
   * la pantalla muestra desde antes de esta task, y no servirla cambiaría la forma— pero no
   * ordena nada: su trabajo es mapear.
   *
   * Por eso el gate se parte en dos asserts en vez de relajarse: quién puede NOMBRAR el
   * volumen, y la prueba de que ese único archivo no ORDENA.
   */
  const ORDERING_FILES = sourceFiles.filter(file => !file.endsWith('opportunities-adapter.ts'))

  it('ningún archivo que participa del ORDEN nombra el volumen estimado', () => {
    const offenders = ORDERING_FILES.filter(file => /\bsearch_?[vV]olume\b/.test(readFileSync(file, 'utf8')))

    expect(offenders.map(f => path.relative(process.cwd(), f))).toEqual([])
  })

  it('el adapter transporta el volumen pero NO ordena (por eso puede nombrarlo)', () => {
    // Si el adapter alguna vez ordena, la exención de arriba deja de ser válida y este
    // assert es el que lo dice — antes de que alguien ordene por volumen sin darse cuenta.
    const adapter = sourceFiles.find(file => file.endsWith('opportunities-adapter.ts'))

    expect(adapter).toBeDefined()

    const content = readFileSync(adapter!, 'utf8')

    expect(content).not.toMatch(/\.sort\(/)
    expect(content).not.toMatch(/localeCompare/)
    expect(content).not.toMatch(/compareWorkQueueItems/)
  })
})

/**
 * TASK-1700 — 🔴 "La cola PROPONE, no ejecuta" convertido en hecho mecánico.
 *
 * Es la clase de invariante que se erosiona por conveniencia: alguien va a querer que
 * aceptar una recomendación "haga la acción de una vez". Eso convertiría "acepté esta
 * recomendación" y "comprometí gasto recurrente del proveedor" en el mismo click, sin que
 * nadie declarara el segundo — el rank capture le paga al proveedor por cada keyword
 * vigente, en cada ciclo, hasta que alguien la deje de seguir.
 *
 * El gate mira el árbol de imports del módulo, no la intención del autor.
 */
describe('TASK-1700 — la cola propone, NUNCA ejecuta', () => {
  /** Commands de escritura de otros dominios que este módulo no puede alcanzar. */
  const FORBIDDEN_WRITES = [
    'trackKeywords',
    'untrackKeywords',
    'createGroundedQueryDraft',
    'declareCompetitors',
    'retireCompetitors',
    'queueKeywordDiscovery',
    'queueSiteAudit',
    'captureRankSnapshot',
    'runProspectDiagnostic'
  ]

  it('ningún archivo del módulo importa un command de escritura de otro dominio', () => {
    const offenders: string[] = []

    for (const file of sourceFiles) {
      const content = readFileSync(file, 'utf8')

      // Sólo las líneas de import: nombrar un command en un comentario para explicar por
      // qué NO se llama es exactamente lo que este módulo hace, y no puede romper el gate.
      const imports = content
        .split('\n')
        .filter(line => /^\s*import\b/.test(line) || /^\s+[A-Za-z]/.test(line))
        .join('\n')

      const importBlocks = content.match(/import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"]/gs) ?? []

      for (const command of FORBIDDEN_WRITES) {
        if (importBlocks.some(block => new RegExp(`\\b${command}\\b`).test(block))) {
          offenders.push(`${path.relative(process.cwd(), file)} → ${command}`)
        }
      }

      void imports
    }

    expect(offenders).toEqual([])
  })

  it('el command de decisión no publica evento outbox (V1: no dispara nada downstream)', () => {
    // Un evento sin consumer invita a que alguien le cuelgue la ejecución automática, que es
    // justo lo que este command existe para no hacer.
    const recordDecision = sourceFiles.find(file => file.endsWith('record-decision.ts'))

    expect(recordDecision).toBeDefined()
    expect(readFileSync(recordDecision!, 'utf8')).not.toContain('publishOutboxEvent(')
  })
})
