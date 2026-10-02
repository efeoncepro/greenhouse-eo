#!/usr/bin/env node
/**
 * Exporta TODOS los glifos Trazo del catálogo AXIS (`@efeoncepro/axis-graphic-line/icons`) a Think, en superficie
 * oscura (portada) y clara (tarjetas), para que cualquier alcance o métrica de Insights tenga su ícono sin dibujarlo a
 * mano. Uso: `pnpm insights:think-icons [--out ../efeonce-think/public/branding/icons]`.
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const { ICON_CATALOG, resolveIcon } = await import('@efeoncepro/axis-graphic-line/icons')
const outArg = process.argv.indexOf('--out')
const out = resolve(outArg > -1 ? process.argv[outArg + 1] : '../efeonce-think/public/branding/icons')
const version = JSON.parse(readFileSync(new URL('../../node_modules/@efeoncepro/axis-graphic-line/package.json', import.meta.url))).version

mkdirSync(out, { recursive: true })

let count = 0

for (const icon of ICON_CATALOG.filter(item => item.voice === 'stroke')) {
  for (const [surface, size, suffix] of [['dark', 20, '-dark'], ['light', 28, '']]) {
    const { svg } = resolveIcon({ glyph: icon.key, size, line: 'growth', surface, state: 'rest' })

    writeFileSync(`${out}/trazo-${icon.key}${suffix}.svg`, svg)
    count += 1
  }
}

console.log(`OK ${count} íconos Trazo (axis-graphic-line ${version}) → ${out}`)
