// TASK-629 — Convert sub-brand SVGs to PNG for @react-pdf/renderer.
//
// React-PDF's <Image> only accepts PNG/JPG. Sub-brand logos live as SVG in
// public/branding/SVG/ which works fine in browser but breaks PDF render
// with "Not valid image extension" warnings.
//
// This script reads the canonical SVGs and renders them as PNG (300dpi
// equivalent at PDF rendering size) into public/branding/pdf/ so the
// runtime can <Image src=...> them.
//
// Run on demand: pnpm tsx scripts/build-pdf-brand-assets.ts
//
// Re-run only when sub-brand logos change. Output is committed.

import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

import sharp from 'sharp'

const ROOT = resolve(process.cwd(), 'public/branding')
const OUT = resolve(ROOT, 'pdf')

interface AssetSpec {
  source: string
  output: string
  width: number
}

const ASSETS: AssetSpec[] = [
  { source: 'SVG/globe-full.svg', output: 'globe-full.png', width: 240 },
  { source: 'SVG/wave-full.svg', output: 'wave-full.png', width: 240 },
  { source: 'SVG/reach-full.svg', output: 'reach-full.png', width: 240 },
  { source: 'SVG/isotipo-full-efeonce.svg', output: 'isotipo-efeonce.png', width: 80 },
  { source: 'SVG/isotipo-goble-full.svg', output: 'isotipo-globe.png', width: 80 },
  { source: 'SVG/isotipo-wave.svg', output: 'isotipo-wave.png', width: 80 },
  { source: 'SVG/isotipo-reach-full.svg', output: 'isotipo-reach.png', width: 80 }
]

const main = async () => {
  mkdirSync(OUT, { recursive: true })

  console.log('[brand-assets] Converting sub-brand SVGs to PNG...')

  for (const asset of ASSETS) {
    const sourcePath = resolve(ROOT, asset.source)
    const outputPath = resolve(OUT, asset.output)

    try {
      await sharp(sourcePath, { density: 600 })
        .resize({ width: asset.width })
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outputPath)

      console.log(`  ✓ ${asset.source} → ${asset.output}`)
    } catch (error) {
      console.error(`  ✗ ${asset.source}:`, error instanceof Error ? error.message : error)
    }
  }

  console.log('[brand-assets] Done.')
}

main().catch(error => {
  console.error('[brand-assets] FAILED:', error)
  process.exit(1)
})
