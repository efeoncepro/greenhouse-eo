/**
 * `pnpm manzanitas:tokens [--check]` — TASK-1939. Sólo Marketing con Manzanitas.
 *
 * Escribe, desde los paquetes AXIS fijados en package.json:
 *   - catalogs/manzanitas/manzanitas-tokens.css   custom properties `--mcm-*` y clases `.mcm-line-<línea>`
 *   - catalogs/manzanitas/manzanitas-tokens.json  snapshot para los tests (piezas, lienzos, líneas, voz)
 *   - catalogs/manzanitas/assets/*               los wordmarks y el logo de Efeonce copiados BYTE A BYTE
 *                                                (@efeoncepro/axis-brand-assets); el logo y la manzana PRECOLOREADOS
 *                                                por línea (un `<img>` no hereda el acento: se pinta el grupo
 *                                                `[data-axis-accent="topic-line"]` y nada más), y la mano «Desliza» por
 *                                                línea y tono desde `iconSvg` (@efeoncepro/axis-graphic-line/icons)
 *
 * `--check` no escribe nada y sale 1 si algún archivo difiere (AXIS publicó y nadie recompiló).
 */

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import { efeonceGraphicLine as GL, manzanitasRegister as M } from '@efeoncepro/axis-tokens'
import { iconSvg } from '@efeoncepro/axis-graphic-line/icons'

import { manzanitasCatalogDir } from '../../src/lib/artifact-composer/catalogs/manzanitas/brand'
import { buildManzanitasTokenArtifacts } from './manzanitas-tokens'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const brandAssetsDir = path.join(path.dirname(require.resolve('@efeoncepro/axis-brand-assets/package.json')), 'assets')

type Tone = 'paper' | 'navy'

/** Archivos oficiales copiados tal cual: destino en el catálogo ← origen en axis-brand-assets. */
const BRAND_ASSETS: [string, string][] = [
  ['manzanitas-wordmark-positive.svg', 'manzanitas/manzanitas-wordmark-positive.svg'],
  ['manzanitas-wordmark-negative.svg', 'manzanitas/manzanitas-wordmark-negative.svg'],
  ['efeonce-logo-positive.svg', 'efeonce-logo-positive.svg'],
  ['efeonce-logo-negative.svg', 'efeonce-logo-negative.svg']
]

const ACCENT_GROUP = /<g data-axis-accent="topic-line">([\s\S]*?)<\/g>/

/** Pinta sólo el grupo de acento del SVG oficial; el resto (el texto del logo) queda en su tinta. */
export const recolorAccentGroup = (svg: string, color: string): string => {
  const match = svg.match(ACCENT_GROUP)

  if (!match) throw new Error('El SVG no trae el grupo [data-axis-accent="topic-line"]: revisa axis-brand-assets antes de compilar.')

  const painted = match[1].replace(/fill="#[0-9a-fA-F]{3,8}"/g, `fill="${color}"`)

  return svg.replace(match[0], `<g data-axis-accent="topic-line">${painted}</g>`)
}

const accentOf = (line: (typeof GL.lines)[number], tone: Tone) => (tone === 'paper' ? line.accentOnLight : line.accentOnDark)

/** El logo con la manzana: positivo sobre papel con el acento oscuro de la línea; negativo sobre navy con el claro. */
const logos = (): [string, string][] => {
  const positive = fs.readFileSync(path.join(brandAssetsDir, 'manzanitas/manzanitas-logo-positive.svg'), 'utf8')
  const negative = fs.readFileSync(path.join(brandAssetsDir, 'manzanitas/manzanitas-logo-negative.svg'), 'utf8')

  return GL.lines.flatMap((l): [string, string][] => [
    [`manzanitas-logo-positive-${l.key}.svg`, recolorAccentGroup(positive, accentOf(l, 'paper'))],
    [`manzanitas-logo-negative-${l.key}.svg`, recolorAccentGroup(negative, accentOf(l, 'navy'))]
  ])
}

/** La manzana grande (portada, contraportada) y las diez manzanas del dato: en el acento de la línea o en el neutro. */
const apples = (): [string, string][] => {
  const apple = fs.readFileSync(path.join(brandAssetsDir, 'manzanitas/manzanitas-apple.svg'), 'utf8')

  return [
    ...GL.lines.flatMap((l): [string, string][] => [
      [`manzanitas-apple-paper-${l.key}.svg`, recolorAccentGroup(apple, accentOf(l, 'paper'))],
      [`manzanitas-apple-navy-${l.key}.svg`, recolorAccentGroup(apple, accentOf(l, 'navy'))]
    ]),
    ['manzanitas-apple-neutral-paper.svg', recolorAccentGroup(apple, M.surfaces.neutralOnPaper)]
  ]
}

/** La voz del ícono «Desliza» por línea: la de La órbita y, donde no hay, la del registro (Voice = Trazo). */
export const swipeVoiceOf = (line: string): 'stroke' | 'plastilina' => {
  const declared = (M.swipe.voiceByLine as Record<string, 'stroke' | 'plastilina' | null>)[line] ?? null

  return declared ?? (M.swipe.lineOverrides as Record<string, 'stroke' | 'plastilina'>)[line] ?? 'stroke'
}

/** La mano «Desliza» en reposo sobre papel y sobre navy, y en respuesta sólo sobre navy (la portada Pizarra). */
const swipeIcons = (): [string, string][] =>
  GL.lines.flatMap((l): [string, string][] => {
    const glyph = swipeVoiceOf(l.key) === 'plastilina' ? M.swipe.glyphs.plastilina : M.swipe.glyphs.stroke
    const icon = (state: 'rest' | 'response', tone: Tone) => `${iconSvg({ glyph, state, size: M.swipe.sizePx, line: l.key, surface: tone === 'paper' ? 'light' : 'dark' })}\n`

    return [
      [`swipe-rest-paper-${l.key}.svg`, icon('rest', 'paper')],
      [`swipe-rest-navy-${l.key}.svg`, icon('rest', 'navy')],
      [`swipe-response-navy-${l.key}.svg`, icon('response', 'navy')]
    ]
  })

export const buildManzanitasOutputs = (): [string, Buffer][] => {
  const { css, json } = buildManzanitasTokenArtifacts()
  const asset = (dest: string) => path.join(manzanitasCatalogDir, 'assets', dest)

  return [
    [path.join(manzanitasCatalogDir, 'manzanitas-tokens.css'), Buffer.from(css)],
    [path.join(manzanitasCatalogDir, 'manzanitas-tokens.json'), Buffer.from(json)],
    ...BRAND_ASSETS.map(([dest, src]): [string, Buffer] => [asset(dest), fs.readFileSync(path.join(brandAssetsDir, src))]),
    ...[...logos(), ...apples(), ...swipeIcons()].map(([dest, svg]): [string, Buffer] => [asset(dest), Buffer.from(svg)])
  ]
}

const main = () => {
  const check = process.argv.includes('--check')
  const outputs = buildManzanitasOutputs()
  let drift = 0

  for (const [file, bytes] of outputs) {
    const rel = path.relative(process.cwd(), file)

    if (check) {
      if (!fs.existsSync(file) || !fs.readFileSync(file).equals(bytes)) {
        drift++
        console.error(`✗ ${rel} no está sincronizado con AXIS`)
      }

      continue
    }

    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, bytes)
  }

  if (check) {
    if (drift > 0) {
      console.error(`\n${drift} archivo(s) desincronizados. Corre \`pnpm manzanitas:tokens\`.`)
      process.exit(1)
    }

    console.log(`✓ manzanitas:tokens sin drift (${outputs.length} archivos)`)

    return
  }

  console.log(`✓ manzanitas:tokens escribió ${outputs.length} archivos en ${path.relative(process.cwd(), manzanitasCatalogDir)}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main()
