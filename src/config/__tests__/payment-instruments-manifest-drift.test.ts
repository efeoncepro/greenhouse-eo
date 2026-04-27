import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { PROVIDER_CATALOG } from '@/config/payment-instruments'

interface ManifestEntry {
  slug: string
  brandName: string
  category: string
  logo?: string | null
  compactLogo?: string | null
}

interface Manifest {
  version: number
  entries: ManifestEntry[]
}

const PUBLIC_DIR = path.resolve(process.cwd(), 'public')
const MANIFEST_PATH = path.join(PUBLIC_DIR, 'images/logos/payment/manifest.json')

const loadManifest = (): Manifest => {
  const raw = readFileSync(MANIFEST_PATH, 'utf8')

  return JSON.parse(raw) as Manifest
}

const resolvePublicAsset = (publicPath: string): string =>
  path.join(PUBLIC_DIR, publicPath.replace(/^\/+/, ''))

describe('payment-instruments config — manifest drift guard', () => {
  const manifest = loadManifest()

  it('every PROVIDER_CATALOG slug is registered in manifest.json', () => {
    const manifestSlugs = new Set(manifest.entries.map(entry => entry.slug))

    const drift = Object.keys(PROVIDER_CATALOG).filter(slug => !manifestSlugs.has(slug))

    expect(
      drift,
      `Slugs in src/config/payment-instruments.ts but missing from manifest.json: ${drift.join(', ')}. ` +
        'Run the brand-asset-designer skill to publish + register them.'
    ).toEqual([])
  })

  it('logo/compactLogo paths in PROVIDER_CATALOG match manifest.json', () => {
    const manifestBySlug = new Map(manifest.entries.map(entry => [entry.slug, entry]))
    const mismatches: string[] = []

    for (const [slug, definition] of Object.entries(PROVIDER_CATALOG)) {
      const manifestEntry = manifestBySlug.get(slug)

      if (!manifestEntry) continue // covered by the previous test

      if (manifestEntry.logo && definition.logo !== manifestEntry.logo) {
        mismatches.push(
          `[${slug}] logo: config="${definition.logo}" manifest="${manifestEntry.logo}"`
        )
      }

      if (manifestEntry.compactLogo && definition.compactLogo !== manifestEntry.compactLogo) {
        mismatches.push(
          `[${slug}] compactLogo: config="${definition.compactLogo ?? ''}" manifest="${manifestEntry.compactLogo}"`
        )
      }
    }

    expect(
      mismatches,
      `Drift between PROVIDER_CATALOG and manifest.json:\n  ${mismatches.join('\n  ')}\n` +
        'Update src/config/payment-instruments.ts so paths match the canonical manifest entry.'
    ).toEqual([])
  })

  it('every logo and compactLogo path resolves to a file on disk', () => {
    const missing: string[] = []

    for (const [slug, definition] of Object.entries(PROVIDER_CATALOG)) {
      if (definition.logo && !existsSync(resolvePublicAsset(definition.logo))) {
        missing.push(`[${slug}] logo not found: ${definition.logo}`)
      }

      if (definition.compactLogo && !existsSync(resolvePublicAsset(definition.compactLogo))) {
        missing.push(`[${slug}] compactLogo not found: ${definition.compactLogo}`)
      }
    }

    expect(
      missing,
      `Missing assets referenced from PROVIDER_CATALOG:\n  ${missing.join('\n  ')}`
    ).toEqual([])
  })
})
