/**
 * Artifact Composer — LEDGER de bases de color del catálogo deck-axis (TASK-1393 Slice 3a/3b).
 *
 *   pnpm composer:color-ledger            # verifica: bases medidas ↔ ledger committeado (dos vías)
 *   pnpm composer:color-ledger --write    # re-mide y actualiza ocurrencias, PRESERVANDO clasificación
 *   pnpm composer:color-ledger --strict   # además falla si queda alguna base sin clasificar
 *
 * Por qué existe: la migración de color no gobierna "los 51 HEX" ni ningún número contado a mano —
 * gobierna las BASES RGB NORMALIZADAS que este tool mide mecánicamente (todo `#hex` + las bases de
 * `rgb()/rgba()` de las 25 plantillas + `deck-signature.css`). **Un solo número, y es el del ledger.**
 *
 * El contrato de dos vías (como `KNOWN_BROKEN` y `BASELINE_DELTAS`): la verificación falla si
 * aparece una base que el ledger no conoce Y TAMBIÉN si el ledger lista una base que ya no existe.
 * La lista no puede mentir.
 *
 * Clasificación (cada base tiene EXACTAMENTE una):
 *   - `ppt-primitive`   → coincide EXACTO con una de las 68 Color Primitives del snapshot
 *                         (`brand-packs/axis/axis-ppt-snapshot.json`). Nada de aproximaciones:
 *                         `#0375D9 ≠ #0375DB`.
 *   - `deck-primitive`  → alta nueva propuesta para la colección `Deck / Primitives` del MISMO
 *                         Sistema Axis - PPT.
 *   - `deck-semantic`   → alias propuesto para `Deck / Semantic`.
 *   - `recipe-token`    → color que sólo existe dentro de una gradient recipe del catálogo.
 *   - `pending`         → sin clasificar todavía. `--strict` lo convierte en error.
 *
 * Los ALPHAS no se clasifican por base×alpha (el blanco tiene 54 alphas distintos — nombrarlos
 * sería ruido): la BASE se tokeniza (`--x` + `--x-rgb`) y el alpha queda composicional; las
 * opacidades NOMBRADAS viven en las recipes (grain, glow), no acá.
 *
 * ⚠️ Toda alta `deck-primitive`/`deck-semantic` queda como PROPUESTA (`figma.status: "proposed"`)
 * hasta que la variable exista en el Sistema Axis - PPT y su node quede registrado — extender la
 * biblioteca de marca del operador es propose → confirm, no un write silencioso de agente.
 */

import fs from 'node:fs'
import path from 'node:path'

import { deckAxisCatalogDir } from '@/lib/artifact-composer/catalogs/deck-axis'

const ROOT = process.cwd()
const SNAPSHOT_PATH = path.resolve(ROOT, 'src/lib/artifact-composer/brand-packs/axis/axis-ppt-snapshot.json')
const LEDGER_PATH = path.join(deckAxisCatalogDir, 'brand', 'color-ledger.json')

type Classification = 'ppt-primitive' | 'deck-primitive' | 'deck-semantic' | 'recipe-token' | 'pending'

interface LedgerEntry {
  classification: Classification
  /** Nombre de variable (existente o propuesto) en el Sistema Axis - PPT, o del recipe token. */
  name: string | null
  figma: { collection: string; status: 'exists' | 'proposed'; nodeId: string | null } | null
  occurrences: number
  files: string[]
  /** Alphas con que la base aparece en `rgba()`/`#RRGGBBAA` (informativo; el alpha es composicional). */
  alphas: number[]
}

interface Ledger {
  $comment: string
  measuredFrom: string[]
  baseCount: number
  bases: Record<string, LedgerEntry>
}

interface Snapshot {
  checksum: string
  primitives: Record<string, string>
}

const HEX_RE = /#([0-9a-fA-F]{3,8})\b/g
const RGB_RE = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/g

const normalizeHex = (raw: string): { base: string; alpha: number | null } => {
  let hex = raw.toLowerCase()

  if (hex.length === 3 || hex.length === 4) hex = [...hex].map(c => c + c).join('')

  let alpha: number | null = null

  if (hex.length === 8) {
    alpha = Math.round((Number.parseInt(hex.slice(6, 8), 16) / 255) * 1000) / 1000
    hex = hex.slice(0, 6)
  }

  return { base: `#${hex}`, alpha }
}

interface Measured {
  files: string[]
  bases: Map<string, { occurrences: number; files: Set<string>; alphas: Set<number> }>
}

const measure = (): Measured => {
  const templateFiles = fs
    .readdirSync(deckAxisCatalogDir)
    .filter(file => (file.endsWith('.html') && !file.startsWith('_')) || file === 'deck-signature.css')
    .sort()

  const bases = new Map<string, { occurrences: number; files: Set<string>; alphas: Set<number> }>()

  const record = (base: string, alpha: number | null, file: string) => {
    const entry = bases.get(base) ?? { occurrences: 0, files: new Set<string>(), alphas: new Set<number>() }

    entry.occurrences += 1
    entry.files.add(file)
    if (alpha !== null && alpha < 1) entry.alphas.add(alpha)
    bases.set(base, entry)
  }

  for (const file of templateFiles) {
    const source = fs.readFileSync(path.join(deckAxisCatalogDir, file), 'utf8')

    for (const match of source.matchAll(HEX_RE)) {
      const { base, alpha } = normalizeHex(match[1]!)

      record(base, alpha, file)
    }

    for (const match of source.matchAll(RGB_RE)) {
      const [r, g, b] = [Number(match[1]), Number(match[2]), Number(match[3])]
      const base = `#${[r, g, b].map(channel => channel.toString(16).padStart(2, '0')).join('')}`

      record(base, match[4] ? Number.parseFloat(match[4]) : null, file)
    }
  }

  return { files: templateFiles, bases }
}

const loadLedger = (): Ledger | null => {
  try {
    return JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8')) as Ledger
  } catch {
    return null
  }
}

const main = () => {
  const args = process.argv.slice(2)
  const write = args.includes('--write')
  const strict = args.includes('--strict')

  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8')) as Snapshot
  const pptByHex = new Map<string, string>()

  for (const [name, hex] of Object.entries(snapshot.primitives)) {
    // Dos primitives PPT comparten HEX (indigo/700 y purple/700 = #4a108b): gana el primer nombre
    // alfabético para que la resolución sea determinista y explícita.
    const existing = pptByHex.get(hex.toLowerCase())

    if (!existing || name < existing) pptByHex.set(hex.toLowerCase(), name)
  }

  const measured = measure()
  const previous = loadLedger()

  if (write) {
    const bases: Record<string, LedgerEntry> = {}

    for (const base of [...measured.bases.keys()].sort()) {
      const data = measured.bases.get(base)!
      const prior = previous?.bases[base]
      const pptName = pptByHex.get(base)

      bases[base] = {
        // La clasificación es TRABAJO HUMANO/DE SLICE: --write la preserva, nunca la inventa.
        // Única auto-clasificación segura: coincidencia EXACTA con una primitive PPT del snapshot.
        classification: prior?.classification && prior.classification !== 'pending'
          ? prior.classification
          : pptName
            ? 'ppt-primitive'
            : 'pending',
        name: prior?.name ?? pptName ?? null,
        figma: prior?.figma ?? (pptName
          ? { collection: 'Color Primitives', status: 'exists', nodeId: '33:2' }
          : null),
        occurrences: data.occurrences,
        files: [...data.files].sort(),
        alphas: [...data.alphas].sort((a, b) => a - b)
      }
    }

    const ledger: Ledger = {
      $comment:
        'Ledger canónico de bases RGB del catálogo deck-axis (TASK-1393). Generado por ' +
        '`pnpm composer:color-ledger --write`; la CLASIFICACIÓN se edita a mano y el tool la preserva. ' +
        'Una base no está migrada hasta que su clasificación no sea pending y su token resuelva al valor EXACTO.',
      measuredFrom: measured.files,
      baseCount: Object.keys(bases).length,
      bases
    }

    fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true })
    fs.writeFileSync(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8')
    console.log(`✓ ledger escrito: ${Object.keys(bases).length} bases → ${path.relative(ROOT, LEDGER_PATH)}`)
  }

  const ledger = write ? loadLedger() : previous

  if (!ledger) {
    console.error('✗ No existe el ledger. Generalo con: pnpm composer:color-ledger --write')
    process.exit(1)
  }

  // POST-MIGRACIÓN (Slice 3b-ii): las plantillas ya no contienen literales — TODO color sale de
  // `deck-tokens.css`. Cualquier literal medido (esté o no en el ledger) es una REINTRODUCCIÓN de
  // HEX de marca y falla, salvo en modo --write (el flujo legítimo para ampliar la paleta:
  // agregar → --write → clasificar → tokenizar → volver a cero).
  if (!write && measured.bases.size > 0) {
    for (const [base, data] of [...measured.bases.entries()].sort()) {
      console.error(`  ✗ literal de color reintroducido: ${base} en ${[...data.files].join(', ')}`)
    }

    console.error(
      '\n✗ Una plantilla reintrodujo un HEX/rgb de marca. El color sale del brand pack ' +
        '(deck-tokens.css), nunca de un literal — es la costura que habilita el as-a-service.\n'
    )
    process.exit(1)
  }

  // El ledger sigue siendo el mapping token↔literal que consume el pack y el test 0e: una entrada
  // que desaparezca del ledger rompería la compilación/0e, así que acá sólo validamos clasificación.

  const byClass = new Map<Classification, number>()

  for (const entry of Object.values(ledger.bases)) {
    byClass.set(entry.classification, (byClass.get(entry.classification) ?? 0) + 1)
  }

  const pending = byClass.get('pending') ?? 0
  const proposed = Object.values(ledger.bases).filter(entry => entry.figma?.status === 'proposed').length

  console.log(`\ncolor-ledger · ${ledger.baseCount} bases medidas en ${ledger.measuredFrom.length} archivos`)

  for (const [classification, count] of [...byClass.entries()].sort()) {
    console.log(`  ${classification.padEnd(15)} ${count}`)
  }

  if (proposed > 0) {
    console.log(`  (${proposed} alta(s) con figma.status=proposed — pendientes de validación en Sistema Axis - PPT)`)
  }

  if (pending > 0) {
    const message = `${pending} base(s) sin clasificar — la migración de color no puede cerrar así.`

    if (strict) {
      console.error(`\n✗ ${message}\n`)
      process.exit(1)
    }

    console.log(`\n⚠️  ${message} (advisory; --strict lo hace bloqueante)\n`)

    return
  }

  console.log('\n✓ 0 bases sin mapping.\n')
}

main()
