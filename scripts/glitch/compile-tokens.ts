/**
 * `pnpm glitch:tokens [--check]` — TASK-1923. Sólo Glitch.
 *
 * Escribe, desde los paquetes AXIS fijados en package.json:
 *   - catalogs/glitch/glitch-tokens.css   custom properties `--gx-*` desde `glitchLine`
 *   - catalogs/glitch/glitch-tokens.json  snapshot para los tests (estados de pieza, formatos, rotación)
 *   - catalogs/glitch/assets/*            copia BYTE A BYTE del wordmark, la manzana y el logo de Efeonce
 *                                         (@efeoncepro/axis-brand-assets) y los 5 glifos Plastilina de Glitch
 *                                         PLANOS (@efeoncepro/axis-graphic-line, estado reposo: nunca el volumen)
 *                                         y la estela de bytes del Glitch Flash (`flash-trail.svg`, generada desde
 *                                         `glitchLine.editions.flash.masthead.trail` en el acento)
 *
 * `--check` no escribe nada y sale 1 si algún archivo difiere (AXIS publicó y nadie recompiló).
 */

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import { glitchLine } from '@efeoncepro/axis-tokens'
import { iconSvg } from '@efeoncepro/axis-graphic-line/icons'

import { glitchCatalogDir } from '../../src/lib/artifact-composer/catalogs/glitch/brand'
import { buildGlitchFlashTrailSvg } from '../../src/lib/glitch-composition/flash-trail'
import { buildAppleBytesSvg } from './apple-bytes'
import { buildGlitchTokenArtifacts } from './glitch-tokens'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const brandAssetsDir = path.join(path.dirname(require.resolve('@efeoncepro/axis-brand-assets/package.json')), 'assets')

/** Archivos oficiales copiados tal cual: destino en el catálogo ← origen en axis-brand-assets. */
const BRAND_ASSETS: [string, string][] = [
  ['glitch-logo-negative.svg', 'glitch/glitch-logo-negative.svg'],
  ['glitch-logo-positive.svg', 'glitch/glitch-logo-positive.svg'],
  ['glitch-apple.svg', 'glitch/glitch-apple.svg'],
  ['efeonce-logo-negative.svg', 'efeonce-logo-negative.svg']
]

/** Íconos de acción de Glitch: Plastilina plana en reposo, tinta sobre oscuro, sin esfera de línea (glitchLine.icons.actions). */
const actionIcons = (): [string, string][] => {
  if (glitchLine.icons.actions.rendering !== 'flat') throw new Error('glitchLine.icons.actions.rendering dejó de ser flat: revisa la decisión antes de compilar.')

  return glitchLine.icons.glitchGlyphs.map((glyph) => [`icon-${glyph}.svg`, `${iconSvg({ glyph, state: 'rest', size: 48, surface: 'dark' })}\n`])
}

/** La manzana en bytes, generada desde el path oficial: en el acento (portada B) y en la línea (textura de la contraportada). */
const appleBytes = async (): Promise<[string, string][]> => {
  const appleSvg = fs.readFileSync(path.join(brandAssetsDir, 'glitch/glitch-apple.svg'), 'utf8')

  return [
    ['apple-bytes-accent.svg', await buildAppleBytesSvg({ appleSvg, color: glitchLine.color.accent })],
    ['apple-bytes-texture.svg', await buildAppleBytesSvg({ appleSvg, color: glitchLine.color.line, seed: 0x1d3a57 })]
  ]
}

/** La estela de bytes del Glitch Flash, en el acento del token (un `<img>` no hereda `currentColor`). */
const flashTrail = (): string => {
  const trail = glitchLine.editions.flash.masthead.trail

  if (trail.color !== 'accent' || trail.cell !== 'square') throw new Error('La estela del Flash dejó de ser de celdas cuadradas en el acento: revisa la decisión antes de compilar.')

  return buildGlitchFlashTrailSvg(glitchLine.color.accent, trail)
}

const main = async () => {
  const check = process.argv.includes('--check')
  const { css, json } = buildGlitchTokenArtifacts()

  const outputs: [string, Buffer][] = [
    [path.join(glitchCatalogDir, 'glitch-tokens.css'), Buffer.from(css)],
    [path.join(glitchCatalogDir, 'glitch-tokens.json'), Buffer.from(json)],
    ...BRAND_ASSETS.map(([dest, src]): [string, Buffer] => [path.join(glitchCatalogDir, 'assets', dest), fs.readFileSync(path.join(brandAssetsDir, src))]),
    ...actionIcons().map(([dest, svg]): [string, Buffer] => [path.join(glitchCatalogDir, 'assets', dest), Buffer.from(svg)]),
    ...(await appleBytes()).map(([dest, svg]): [string, Buffer] => [path.join(glitchCatalogDir, 'assets', dest), Buffer.from(svg)]),
    [path.join(glitchCatalogDir, 'assets', 'flash-trail.svg'), Buffer.from(flashTrail())]
  ]

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
    console.log(`✓ ${rel}`)
  }

  if (check) {
    if (drift > 0) {
      console.error(`\n${drift} archivo(s) desincronizados. Corre \`pnpm glitch:tokens\`.`)
      process.exit(1)
    }

    console.log(`✓ glitch:tokens sin drift (${outputs.length} archivos)`)
  }
}

void main()
