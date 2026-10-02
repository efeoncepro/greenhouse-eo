/**
 * Compila los tokens de «La órbita» (`@efeoncepro/axis-tokens` → `efeonceGraphicLine`) a los artefactos que
 * consumen los catálogos `graphic-line-*` del Artifact Composer.
 *
 * El motor no importa paquetes de AXIS (`package-boundary.test.ts`): por eso el catálogo lee un SNAPSHOT
 * generado y versionado —un JSON para los resolvers y un CSS de custom properties para las plantillas—,
 * igual que el brand pack `axis` hace con Figma. `pnpm brand:tokens --check` (y su test) detectan el drift
 * cuando AXIS publica una versión nueva y nadie recompiló.
 *
 * Qué NO hace: no decide valores. Si un valor no está en AXIS, la plantilla no lo tiene.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import { efeonceGraphicLine as GL } from '@efeoncepro/axis-tokens'

/** Versión instalada del paquete: se lee del package.json que está junto a su entrada. */
const axisTokensVersion = (): string => {
  let dir = path.dirname(createRequire(path.join(process.cwd(), 'package.json')).resolve('@efeoncepro/axis-tokens'))

  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, 'package.json')

    if (fs.existsSync(candidate)) {
      const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8')) as { name?: string; version?: string }

      if (pkg.name === '@efeoncepro/axis-tokens' && pkg.version) return pkg.version
    }

    dir = path.dirname(dir)
  }

  throw new Error('No encontré el package.json de @efeoncepro/axis-tokens.')
}

const AXIS_TOKENS_VERSION = axisTokensVersion()

type Theme = { ink: string; text: string; soft: string; rule: string; accent: string; background: string }

const resolveThemeColor = (value: string): string => {
  const palette = GL.color as Record<string, string>

  if (value.startsWith('#')) return value

  if (value === 'navy') return palette.navy
  if (value === 'paper') return palette.paper
  if (value === 'dark') return palette.dark

  return value
}

export interface GraphicLineTokenArtifacts {
  json: string
  css: string
}

export const buildGraphicLineTokenArtifacts = (): GraphicLineTokenArtifacts => {
  const lines = GL.lines.map(line => ({
    key: line.key,
    name: line.name,
    accentOnDark: line.accentOnDark,
    accentOnLight: line.accentOnLight
  }))

  const deck = GL.surfaces.deck as unknown as { themes: Record<'dark' | 'light', Theme>; base: Record<string, unknown> }

  const snapshot = {
    $comment:
      'GENERADO por `pnpm brand:tokens` desde @efeoncepro/axis-tokens (efeonceGraphicLine). NO EDITAR A MANO: se regenera y el test de sincronía detecta el drift.',
    source: { package: '@efeoncepro/axis-tokens', version: AXIS_TOKENS_VERSION },
    color: GL.color,
    lines,
    sphere: {
      diameterEm: GL.sphere.diameterEm,
      defaultGapEm: GL.sphere.defaultGapEm,
      opticalGapEm: GL.sphere.opticalGapEm
    },
    type: GL.type,
    softOnDark: GL.slogan.leadColor.onDark,
    softOnLight: GL.slogan.leadColor.onLight,
    themes: deck.themes
  }

  const dark = deck.themes.dark
  const light = deck.themes.light
  const color = GL.color as Record<string, string>

  const css: string[] = [
    '/**',
    ' * GENERADO — NO EDITAR A MANO.',
    ` * Tokens de «La órbita» desde @efeoncepro/axis-tokens ${AXIS_TOKENS_VERSION} (efeonceGraphicLine),`,
    ' * compilados por `pnpm brand:tokens`. Una plantilla de La órbita sólo usa estas variables:',
    ' * un HEX o una medida escrita a mano en el HTML es una regresión.',
    ' */',
    ':root {',
    `  --gl-bg-dark: ${color.dark};`,
    `  --gl-bg-paper: ${color.paper};`,
    `  --gl-navy: ${color.navy};`,
    `  --gl-teal: ${color.teal};`,
    `  --gl-teal-dark: ${color.tealDark};`,
    `  --gl-ink-dark: ${resolveThemeColor(dark.ink)};`,
    `  --gl-text-dark: ${resolveThemeColor(dark.text)};`,
    `  --gl-soft-dark: ${resolveThemeColor(dark.soft)};`,
    `  --gl-rule-dark: ${resolveThemeColor(dark.rule)};`,
    `  --gl-ink-light: ${resolveThemeColor(light.ink)};`,
    `  --gl-text-light: ${resolveThemeColor(light.text)};`,
    `  --gl-soft-light: ${resolveThemeColor(light.soft)};`,
    `  --gl-rule-light: ${resolveThemeColor(light.rule)};`,
    `  --gl-answer-family: '${GL.type.answer.family}';`,
    `  --gl-answer-weight: ${GL.type.answer.weight};`,
    `  --gl-question-family: '${GL.type.question.family}';`,
    `  --gl-question-weight: ${GL.type.question.weight};`,
    `  --gl-text-family: '${GL.type.text.family}';`,
    `  --gl-sphere-diameter: ${GL.sphere.diameterEm}em;`,
    `  --gl-sphere-gap: ${GL.sphere.defaultGapEm}em;`,
    `  --gl-accent: ${GL.lines[0].accentOnDark};`,
    `  --gl-accent-light: ${GL.lines[0].accentOnLight};`,
    '}',
    ''
  ]

  for (const line of lines) {
    css.push(
      `.gl-line-${line.key} {`,
      `  --gl-accent: ${line.accentOnDark};`,
      `  --gl-accent-light: ${line.accentOnLight};`,
      '}',
      ''
    )
  }

  return { json: `${JSON.stringify(snapshot, null, 2)}\n`, css: css.join('\n') }
}
