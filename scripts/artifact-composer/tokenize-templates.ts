/**
 * Tokenizador de plantillas deck-axis — literales → custom properties (TASK-1393 Slice 3b-ii).
 *
 *   pnpm tsx scripts/artifact-composer/tokenize-templates.ts [--dry-run]
 *
 * Reescritura MECÁNICA dirigida por el ledger: cada literal de color de las 25 plantillas +
 * `deck-signature.css` se reemplaza por su token de `deck-tokens.css`, SIN cambiar el valor
 * calculado (la igualdad la prueban el test 0e y el gate visual a 0 píxeles):
 *
 *   #rrggbb / #rgb          → var(--nombre)
 *   rgba(R, G, B, a)        → rgba(var(--nombre-rgb), a)        (alpha VERBATIM: exacto)
 *   rgb(R, G, B)            → rgb(var(--nombre-rgb))
 *   #rrggbbaa               → rgba(var(--nombre-rgb), calc(AA / 255))  (alpha EXACTO, no decimal redondeado)
 *   fill|stroke|stop-color="#…"  → se mueve a style="" (una presentation attribute no resuelve var())
 *
 * Un literal que NO esté en el ledger se deja intacto y se reporta — el tool no inventa mappings.
 * El script es idempotente: en una segunda corrida no queda nada que reemplazar.
 */

import fs from 'node:fs'
import path from 'node:path'

import { pptCssVar } from '@/lib/artifact-composer/brand-packs/axis'
import { deckAxisCatalogDir } from '@/lib/artifact-composer/catalogs/deck-axis'

const LEDGER_PATH = path.join(deckAxisCatalogDir, 'brand', 'color-ledger.json')
const TOKENS_LINK = '<link rel="stylesheet" href="deck-tokens.css">'

interface LedgerFile {
  bases: Record<string, { classification: string; name: string | null }>
}

const buildVarMap = (): Map<string, string> => {
  const ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8')) as LedgerFile
  const map = new Map<string, string>()

  for (const [hex, entry] of Object.entries(ledger.bases)) {
    const cssVar = entry.classification === 'ppt-primitive' ? pptCssVar(entry.name!) : entry.name!

    map.set(hex, cssVar)
  }

  return map
}

const normalizeHex = (raw: string): { base: string; alphaHex: string | null } => {
  let hex = raw.toLowerCase()

  if (hex.length === 3 || hex.length === 4) hex = [...hex].map(c => c + c).join('')

  const alphaHex = hex.length === 8 ? hex.slice(6, 8) : null

  return { base: `#${hex.slice(0, 6)}`, alphaHex }
}

const main = () => {
  const dryRun = process.argv.includes('--dry-run')
  const varMap = buildVarMap()
  const unmapped = new Map<string, string[]>()

  const files = fs
    .readdirSync(deckAxisCatalogDir)
    .filter(file => (file.endsWith('.html') && !file.startsWith('_')) || file === 'deck-signature.css')
    .sort()

  let totalReplacements = 0

  for (const file of files) {
    const filePath = path.join(deckAxisCatalogDir, file)
    let source = fs.readFileSync(filePath, 'utf8')
    let replacements = 0

    const lookup = (rawHex: string): { cssVar: string; alphaHex: string | null } | null => {
      const { base, alphaHex } = normalizeHex(rawHex)
      const cssVar = varMap.get(base)

      if (!cssVar) {
        const bucket = unmapped.get(base) ?? []

        bucket.push(file)
        unmapped.set(base, bucket)

        return null
      }

      return { cssVar, alphaHex }
    }

    // 1 · Presentation attributes de SVG (fill/stroke/stop-color): no resuelven var() — el color se
    //     muda al style="" del mismo tag (mergeando si ya existe), preservando el resto de attrs.
    source = source.replace(/<[a-zA-Z][^>]*>/g, tag => {
      if (!/(?:fill|stroke|stop-color)="#/.test(tag)) return tag

      const styleProps: string[] = []
      let next = tag.replace(/\s(fill|stroke|stop-color)="#([0-9a-fA-F]{3,8})"/g, (whole, attr: string, hex: string) => {
        const hit = lookup(hex)

        if (!hit || hit.alphaHex) return whole

        styleProps.push(`${attr}: var(${hit.cssVar})`)
        replacements += 1

        return ''
      })

      if (styleProps.length === 0) return tag

      const styleMatch = next.match(/\sstyle="([^"]*)"/)

      if (styleMatch) {
        next = next.replace(/\sstyle="([^"]*)"/, ` style="$1; ${styleProps.join('; ')}"`)
      } else {
        next = next.replace(/(\/?>)$/, ` style="${styleProps.join('; ')}"$1`)
      }

      return next
    })

    // 2 · rgba()/rgb() — la base se tokeniza, el alpha queda VERBATIM (composicional y exacto).
    source = source.replace(
      /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/g,
      (whole, r: string, g: string, b: string, alpha?: string) => {
        const base = `#${[r, g, b].map(channel => Number(channel).toString(16).padStart(2, '0')).join('')}`
        const cssVar = varMap.get(base)

        if (!cssVar) {
          const bucket = unmapped.get(base) ?? []

          bucket.push(file)
          unmapped.set(base, bucket)

          return whole
        }

        replacements += 1

        return alpha !== undefined ? `rgba(var(${cssVar}-rgb), ${alpha})` : `rgb(var(${cssVar}-rgb))`
      }
    )

    // 3 · Literales hex (8 → 6/4 → 3, el más largo primero para no partir un #rrggbbaa).
    source = source.replace(/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g, (whole, raw: string) => {
      const hit = lookup(raw)

      if (!hit) return whole

      replacements += 1

      if (hit.alphaHex) {
        // Alpha EXACTO: calc(AA/255) reproduce el mismo float que el parser de #rrggbbaa —
        // un decimal redondeado podría correr un canal de blending.
        return `rgba(var(${hit.cssVar}-rgb), calc(${Number.parseInt(hit.alphaHex, 16)} / 255))`
      }

      return `var(${hit.cssVar})`
    })

    // 4 · El HTML importa el CSS compilado del pack (primer stylesheet del head).
    if (file.endsWith('.html') && !source.includes(TOKENS_LINK)) {
      source = source.replace(/<head>\s*\n?/, match => `${match}  ${TOKENS_LINK}\n`)
      replacements += 1
    }

    totalReplacements += replacements

    if (!dryRun && replacements > 0) fs.writeFileSync(filePath, source, 'utf8')

    console.log(`  ${file.padEnd(36)} ${replacements} reemplazo(s)`)
  }

  if (unmapped.size > 0) {
    console.error('\n⚠️  Literales SIN mapping en el ledger (se dejaron intactos):')

    for (const [base, inFiles] of unmapped) console.error(`  ${base} — ${[...new Set(inFiles)].join(', ')}`)
  }

  console.log(`\n${dryRun ? '[dry-run] ' : ''}${totalReplacements} reemplazos en ${files.length} archivos.\n`)
}

main()
