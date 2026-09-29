/**
 * Compila el token de franquicia `glitchLine` (@efeoncepro/axis-tokens) a los artefactos del catálogo `glitch` del
 * Artifact Composer (TASK-1923). Sólo Glitch.
 *
 * El motor no importa paquetes de AXIS: el catálogo lee un SNAPSHOT generado y versionado —un CSS de custom properties
 * (`--gx-*`) para las plantillas y un JSON para los tests—, igual que `graphic-line-tokens.*` de La órbita.
 * `pnpm glitch:tokens --check` detecta el drift cuando AXIS publica y nadie recompiló. No decide valores: si un valor
 * no está en el token, la plantilla no lo tiene.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import { glitchLine as G } from '@efeoncepro/axis-tokens'

const packageVersion = (name: string): string => {
  let dir = path.dirname(createRequire(path.join(process.cwd(), 'package.json')).resolve(name))

  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, 'package.json')

    if (fs.existsSync(candidate)) {
      const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8')) as { name?: string; version?: string }

      if (pkg.name === name && pkg.version) return pkg.version
    }

    dir = path.dirname(dir)
  }

  throw new Error(`No encontré el package.json de ${name}.`)
}

export const GLITCH_AXIS_PACKAGES = ['@efeoncepro/axis-tokens', '@efeoncepro/axis-brand-assets', '@efeoncepro/axis-graphic-line', '@efeoncepro/axis-ui-contracts'] as const

export const glitchAxisVersions = (): Record<string, string> =>
  Object.fromEntries(GLITCH_AXIS_PACKAGES.map((name) => [name, packageVersion(name)]))

const px = (n: number) => `${n}px`
const q = (s: string) => `'${s}'`

/** Las custom properties que consumen las plantillas. Nombres estables: renombrar uno es un cambio de contrato. */
export const buildGlitchTokenProperties = (): [string, string][] => {
  const c = G.color
  const t = G.type
  const m = G.masthead
  const reel = G.safeZones['reel-9x16']
  const band = G.safeZones['linkedin-4x5'].photoBand
  const trail = G.editions.flash.masthead.trail

  return [
    ['--gx-ground', c.ground],
    ['--gx-accent', c.accent],
    ['--gx-navy', c.navy],
    ['--gx-text', c.text],
    ['--gx-text-strong', c.textStrong],
    ['--gx-sub', c.sub],
    ['--gx-line', c.line],
    ['--gx-on-light', c.onLight],
    ['--gx-duotone-from', G.bytes.duotone.from],
    ['--gx-duotone-to', G.bytes.duotone.to],
    ['--gx-font-headline', q(t.headlineEntry.family)],
    ['--gx-font-text', q(t.body.family)],
    ['--gx-font-narrator', q(t.narrator.family)],
    ['--gx-entry-weight', String(t.headlineEntry.weight)],
    ['--gx-entry-width', String(t.headlineEntry.width)],
    ['--gx-entry-size', `${t.headlineEntry.sizeEm}em`],
    ['--gx-close-weight', String(t.headlineClose.weight)],
    ['--gx-close-width', String(t.headlineClose.width)],
    ['--gx-close-stretch', t.headlineClose.fontStretch],
    ['--gx-headline-tracking', t.headlineTracking],
    ['--gx-label-weight', String(t.label.weight)],
    ['--gx-subtitle-weight', String(t.subtitle.weight)],
    ['--gx-narrator-rotation', `${t.narrator.rotationDeg[0]}deg`],
    ['--gx-wordmark-width', px(m.wordmarkWidthPx)],
    ['--gx-edition-label-size', px(m.editionLabel.sizePx)],
    ['--gx-edition-label-weight', String(m.editionLabel.weight)],
    ['--gx-edition-label-tracking', m.editionLabel.tracking],
    ['--gx-edition-number-size', px(m.editionNumber.sizePx)],
    ['--gx-edition-hash-weight', String(m.editionNumber.hash.weight)],
    ['--gx-edition-number-weight', String(m.editionNumber.number.weight)],
    ['--gx-edition-number-width', String(m.editionNumber.number.width)],
    // Glitch Flash: la etiqueta y la palabra usan la tipografía de «EDICIÓN» y del número (por referencia en AXIS); la
    // estela es un asset (`assets/flash-trail.svg`) y aquí van su ancho y su separación POR CONTEXTO
    // (`trail.contexts`, axis-tokens ≥ 0.3.25): cabecera grande, cabecera compacta y pie del banner de noticia.
    ['--gx-flash-trail-gap', px(trail.contexts.large.gapPx)],
    ['--gx-flash-trail-width-large', px(trail.contexts.large.widthPx)],
    ['--gx-flash-trail-gap-compact', px(trail.contexts.compact.gapPx)],
    ['--gx-flash-trail-width-compact', px(trail.contexts.compact.widthPx)],
    ['--gx-flash-trail-gap-news', px(trail.contexts.news.gapPx)],
    ['--gx-flash-trail-width-news', px(trail.contexts.news.widthPx)],
    ['--gx-photo-band-top', px(band[0])],
    ['--gx-photo-band-height', px(band[1] - band[0])],
    ['--gx-reel-ui-top', px(reel.appUiTop[1])],
    ['--gx-reel-ui-bottom', px(reel.appUiBottomFrom)],
    ['--gx-reel-buttons', px(reel.buttonsFromX)],
    ['--gx-reel-masthead-top', px(reel.masthead[0])],
    ['--gx-reel-text-top', px(reel.text[0])]
  ]
}

export interface GlitchTokenArtifacts {
  css: string
  json: string
}

export const buildGlitchTokenArtifacts = (): GlitchTokenArtifacts => {
  const versions = glitchAxisVersions()
  const tokensVersion = versions['@efeoncepro/axis-tokens']
  const header = `/* GENERADO por \`pnpm glitch:tokens\` desde @efeoncepro/axis-tokens ${tokensVersion} (glitchLine). NO EDITAR A MANO. Sólo Glitch. */`
  const css = `${header}\n:root {\n${buildGlitchTokenProperties().map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}\n`

  const json = `${JSON.stringify(
    {
      $comment: 'GENERADO por `pnpm glitch:tokens` desde @efeoncepro/axis-tokens (glitchLine). NO EDITAR A MANO: el test de sincronía detecta el drift.',
      source: { package: '@efeoncepro/axis-tokens', version: tokensVersion },
      status: G.status,
      franchise: G.franchise,
      color: G.color,
      bytes: G.bytes,
      apple: { assetId: G.apple.assetId, viewBox: G.apple.viewBox, perPiece: G.apple.perPiece },
      formats: G.formats,
      pieces: G.pieces,
      editions: G.editions,
      coverRotation: G.coverRotation,
      icons: G.icons,
      signature: G.signature
    },
    null,
    2
  )}\n`

  return { css, json }
}
