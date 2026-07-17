#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import process from 'node:process'

const allowed = {
  viewport: new Set(['art_directed', 'single_composition', 'crop_safe']),
  theme: new Set(['light_dark', 'single_theme']),
  canvas: new Set(['transparent', 'opaque']),
  skin: new Set(['efeonce_core', 'contextual_platform', 'contextual_client', 'campaign_specific'])
}

function validate(manifest) {
  const errors = []

  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) return ['manifest.assets must be a non-empty array']

  for (const [index, asset] of manifest.assets.entries()) {
    const id = asset.conceptId || `assets[${index}]`
    const contract = asset.deliveryContract

    if (!contract || typeof contract !== 'object') {
      errors.push(`${id}: missing deliveryContract`)
      continue
    }

    for (const field of ['viewport', 'theme', 'canvas', 'skin']) {
      if (!allowed[field].has(contract[field])) errors.push(`${id}: invalid deliveryContract.${field}`)
    }

    if (typeof contract.rationale !== 'string' || contract.rationale.trim().length < 12) {
      errors.push(`${id}: deliveryContract.rationale must explain the decision`)
    }

    const variants = asset.variants || asset.derivatives || {}

    if (contract.viewport === 'art_directed') {
      for (const key of ['desktopLight', 'mobileLight']) {
        if (!variants[key]) errors.push(`${id}: art_directed requires variants.${key}`)
      }
    }

    if (contract.theme === 'light_dark') {
      if (!variants.desktopDark) errors.push(`${id}: light_dark requires variants.desktopDark`)

      if (contract.viewport === 'art_directed' && !variants.mobileDark) {
        errors.push(`${id}: art_directed + light_dark requires variants.mobileDark`)
      }
    }

    if (contract.canvas === 'transparent' && asset.qa?.alpha !== true) {
      errors.push(`${id}: transparent canvas requires qa.alpha=true after technical verification`)
    }
  }

  
return errors
}

function selfTest() {
  const valid = {
    assets: [{
      conceptId: 'TEST-01',
      deliveryContract: { viewport: 'art_directed', theme: 'light_dark', canvas: 'transparent', skin: 'contextual_platform', rationale: 'Text needs a vertical mobile composition.' },
      variants: { desktopLight: 'a', mobileLight: 'b', desktopDark: 'c', mobileDark: 'd' },
      qa: { alpha: true }
    }]
  }

  const invalid = { assets: [{ conceptId: 'TEST-02', variants: {} }] }

  if (validate(valid).length !== 0 || validate(invalid).length === 0) throw new Error('self-test failed')
  console.log('visual manifest validator self-test: PASS')
}

if (process.argv.includes('--self-test')) {
  selfTest()
  process.exit(0)
}

const manifestPath = process.argv.slice(2).find(argument => argument !== '--')

if (!manifestPath) {
  console.error('Usage: validate-visual-manifest.mjs <manifest.json>')
  process.exit(2)
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const errors = validate(manifest)

if (errors.length) {
  console.error(`Visual manifest gate: FAIL (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Visual manifest gate: PASS (${manifest.assets.length} assets)`)
