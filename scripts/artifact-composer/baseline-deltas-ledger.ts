/**
 * Parser y regla de promoción de `BASELINE_DELTAS.md` (ledger del gate visual del Artifact Composer).
 *
 * Módulo puro (sin fs ni Playwright) para que la regla se pueda probar sin renderizar nada; lo usa
 * `visual-gate.ts --freeze`.
 *
 * La unidad de promoción es la **sección sin sellar**: una entrada `## ` que todavía no lleva el
 * marcador `<!-- sealed-by-freeze: … -->`. Cada `--freeze` exitoso sella exactamente esa sección, así
 * que las declaraciones viejas quedan cerradas y ya no autorizan nada.
 *
 * Por qué: antes el freeze buscaba el nombre del frame en TODO el archivo. Un frame declarado hace
 * meses por otra task seguía "declarado" para siempre, y un cambio que lo movía se re-promovía sin
 * que la sección nueva lo nombrara (caso 2026-09-27, TASK-1928 · 2c7c67c5d: el hook de selección
 * movió 10 frames ya aprobados y el freeze los selló sin error).
 */

export const SEAL_MARKER_PATTERN = /^<!-- sealed-by-freeze: ([^\s]+) -->$/m

export const sealMarker = (digest: string): string => `<!-- sealed-by-freeze: ${digest} -->`

/** Nombre de frame dentro del texto del ledger: `templates-x/Foo.png`, `sky/18-equipo.png`, … */
const FRAME_TOKEN = /[A-Za-z0-9_][A-Za-z0-9_./-]*\.png/g

export interface LedgerSection {
  /** Línea `## …` completa. */
  heading: string
  /** Índice (0-based) de la línea del heading en el archivo. */
  headingLine: number
  /** Texto de la sección sin el heading (hasta el próximo `## `). */
  body: string
  sealed: boolean
  declaredFrames: Set<string>
}

export const parseLedgerSections = (raw: string): LedgerSection[] => {
  const lines = raw.split('\n')
  const sections: LedgerSection[] = []
  let current: { heading: string; headingLine: number; bodyLines: string[] } | null = null

  const flush = () => {
    if (!current) return
    const body = current.bodyLines.join('\n')

    sections.push({
      heading: current.heading,
      headingLine: current.headingLine,
      body,
      sealed: SEAL_MARKER_PATTERN.test(body),
      declaredFrames: new Set(body.match(FRAME_TOKEN) ?? [])
    })
  }

  lines.forEach((line, index) => {
    if (line.startsWith('## ')) {
      flush()
      current = { heading: line, headingLine: index, bodyLines: [] }
    } else if (current) {
      current.bodyLines.push(line)
    }
  })

  flush()

  return sections
}

export type PromotionVerdict =
  | { ok: true; section: LedgerSection; declaredButUnchanged: string[] }
  | { ok: false; reason: 'no-unsealed-section' | 'multiple-unsealed-sections' | 'undeclared-frames'; message: string; undeclared: string[] }

/**
 * ¿Puede `--freeze` re-promover estos frames cambiados?
 *
 * - Debe existir EXACTAMENTE UNA sección sin sellar (la declaración de esta promoción).
 * - Cada frame cambiado/nuevo/removido debe estar nombrado en ESA sección. Estar nombrado en una
 *   sección ya sellada no cuenta: esa declaración ya se consumió.
 * - `inScope` filtra los frames declarados que se reportan como "declarados pero sin cambio" (sólo
 *   aviso: en un freeze por catálogo, un frame de otro scope declarado en la sección no es mentira).
 */
export const evaluatePromotion = (
  raw: string,
  changed: string[],
  inScope: (frame: string) => boolean = () => true
): PromotionVerdict => {
  const sections = parseLedgerSections(raw)
  const unsealed = sections.filter(section => !section.sealed)

  if (unsealed.length === 0) {
    return {
      ok: false,
      reason: 'no-unsealed-section',
      undeclared: [...changed],
      message:
        '✗ Rebaseline NO declarado: BASELINE_DELTAS.md no tiene una sección nueva sin sellar.\n' +
        '  Todas las secciones existentes ya fueron consumidas por un --freeze anterior y no autorizan frames nuevos.\n' +
        '  Agrega una entrada `## <fecha> — <task>: <qué cambió>` que nombre cada frame:\n' +
        changed.map(frame => `  - ${frame}`).join('\n') +
        '\n'
    }
  }

  if (unsealed.length > 1) {
    return {
      ok: false,
      reason: 'multiple-unsealed-sections',
      undeclared: [...changed],
      message:
        '✗ BASELINE_DELTAS.md tiene más de una sección sin sellar; una promoción sella UNA sola:\n' +
        unsealed.map(section => `  - ${section.heading}`).join('\n') +
        '\n  Une las declaraciones en una entrada, o marca como sellada la que ya fue promovida (y commiteada).\n'
    }
  }

  const [section] = unsealed
  const undeclared = changed.filter(frame => !section.declaredFrames.has(frame))

  if (undeclared.length > 0) {
    const sealedElsewhere = (frame: string) =>
      sections.filter(other => other.sealed && other.declaredFrames.has(frame)).map(other => other.heading.slice(3))

    return {
      ok: false,
      reason: 'undeclared-frames',
      undeclared,
      message:
        `✗ Rebaseline NO declarado. Estos frames cambian y no aparecen en la sección que se está sellando\n` +
        `  (${section.heading.slice(3)}):\n` +
        undeclared
          .map(frame => {
            const older = sealedElsewhere(frame)

            return older.length > 0
              ? `  - ${frame}   (sólo en secciones ya selladas: ${older.join(' · ')})`
              : `  - ${frame}`
          })
          .join('\n') +
        '\n\n  Si el cambio es intencional, declara cada lámina en ESA sección (qué cambió, por qué, quién lo aprobó).\n' +
        '  Si no lo es, acabas de atrapar una regresión: arregla el código, no el baseline.\n'
    }
  }

  const changedSet = new Set(changed)
  const declaredButUnchanged = [...section.declaredFrames].filter(frame => inScope(frame) && !changedSet.has(frame)).sort()

  return { ok: true, section, declaredButUnchanged }
}

/** Sella toda sección sin sellar con el digest de la promoción (inserta el marcador bajo su heading). */
export const sealUnsealedSections = (raw: string, digest: string): string => {
  const lines = raw.split('\n')
  const unsealed = parseLedgerSections(raw).filter(section => !section.sealed)

  // De abajo hacia arriba: insertar no corre los índices de las secciones que faltan.
  for (const section of [...unsealed].sort((a, b) => b.headingLine - a.headingLine)) {
    lines.splice(section.headingLine + 1, 0, '', sealMarker(digest))
  }

  return lines.join('\n')
}
