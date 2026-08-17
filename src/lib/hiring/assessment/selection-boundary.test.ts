import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1719 — Boundary de gobernanza de selección.
 *
 * La automatización de esta task dispara desde la ETAPA, nunca desde un score. Ese invariante
 * es exactamente lo que la mantiene fuera de la categoría de "IA de alto riesgo" que decide
 * sobre personas: el sistema entrega instrumentos, una persona decide.
 *
 * El riesgo no es que alguien lo rompa a propósito. Es que alguien agregue, con toda buena
 * intención, un "si sacó menos de X, muévelo a rechazado" dentro del scoring — y que eso pase
 * lint, tipos y tests, porque no hay nada que lo prohíba. Este test es ese algo.
 *
 * Verifica ESTÁTICAMENTE que ningún archivo del dominio assessment importe o invoque los
 * commands que mueven etapa o deciden la postulación. Si alguna vez hiciera falta de verdad,
 * el camino correcto es una decisión de arquitectura nueva, no una excepción acá.
 */

const ROOT = join(process.cwd(), 'src/lib/hiring/assessment')

/** Commands que SÓLO puede invocar una persona a través de su propio camino gobernado. */
const SELECTION_COMMANDS = ['updateHiringApplicationStage', 'decideHiringApplication']

const collectSourceFiles = (dir: string): string[] => {
  const out: string[] = []

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)

    if (statSync(full).isDirectory()) out.push(...collectSourceFiles(full))
    else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) out.push(full)
  }

  return out
}

describe('boundary de gobernanza de selección (TASK-1719)', () => {
  const files = collectSourceFiles(ROOT)

  it('recorre un set no trivial del dominio assessment', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it.each(SELECTION_COMMANDS)(
    'ningún archivo del dominio assessment invoca %s',
    command => {
      const offenders = files.filter(file => readFileSync(file, 'utf8').includes(command))

      expect(
        offenders.map(f => f.replace(process.cwd(), '')),
        `Un score, una entrega o una asignación NO pueden mover la etapa ni decidir sobre una persona. ` +
          `Si esto se vuelve necesario, exige una decisión de arquitectura nueva — no una excepción acá.`,
      ).toEqual([])
    },
  )

  it('el trigger de la automatización es la etapa, nunca un score o match', () => {
    // El command de asignación recibe la etapa; jamás lee score/matchScore para decidir.
    const assign = readFileSync(join(ROOT, 'assignment-policy/assign.ts'), 'utf8')

    expect(assign).toContain('triggerStage')
    expect(assign).not.toMatch(/\bmatch_score\b|\bmatchScore\b/)
  })
})
