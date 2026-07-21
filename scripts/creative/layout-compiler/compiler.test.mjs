import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'
import { stringify as stringifyYaml } from 'yaml'

import { buildLayoutPlan, compileLayoutCampaign, verifyCompiledCampaign } from './compiler.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..', '..')

const buildContract = (finishStatus = 'approved') => ({
  version: 'campaign-layout-compiler.v1',
  campaign_id: 'compiler-test',
  run_root: '.',
  anchor: {
    id: 'compiler-test-anchor',
    revision: 1,
    asset: 'plate.png',
    status: 'approved',
    locks: ['one subject', 'palette', 'lighting']
  },
  brand_mode: 'branded',
  channel_mode: 'digital-static',
  message: {
    kicker: 'SYSTEM 01',
    headline: ['FAST.', 'EXACT.'],
    support: 'A deterministic campaign layout.',
    url: 'example.com'
  },
  brand: {
    logo: path.join(repoRoot, 'public', 'branding', 'logo-negative.svg'),
    fonts: {
      medium: path.join(repoRoot, 'src', 'assets', 'fonts', 'Poppins-Medium.ttf'),
      bold: path.join(repoRoot, 'src', 'assets', 'fonts', 'Poppins-Bold.ttf'),
      extra_bold: path.join(repoRoot, 'src', 'assets', 'fonts', 'Poppins-ExtraBold.ttf')
    },
    colors: {
      background: '#03142D',
      foreground: '#FFFFFF',
      support: '#F4F8FF',
      muted: '#B8C9DE',
      accent: '#7CF4D1',
      accent_secondary: '#2FD7FF'
    }
  },
  visual_system: {
    underlay: {
      color: '#03142D',
      copy_opacity_start: 0.82,
      copy_opacity_mid: 0.5,
      top_opacity: 0.4,
      vignette_opacity: 0.3
    },
    hook: { type: 'frequency-rail', colors: ['#2FD7FF', '#7CF4D1', '#9C63FF'] }
  },
  composition: {
    renderer: 'sharp-fontkit',
    output_format: 'jpeg',
    quality: 90,
    max_bytes: 1_500_000,
    contact_sheet_columns: 2
  },
  approvals: {
    layout: 'approved',
    human_release: 'pending',
    anchor_owner: 'creative-director',
    release_owner: 'campaign-owner'
  },
  artifacts: {
    plan_manifest: 'manifests/plan.json',
    composition_manifest: 'manifests/composition.json',
    qa_report: 'qa/report.json',
    contact_sheet: 'review/contact-sheet.jpg',
    editable_dir: 'work/editable'
  },
  formats: [
    {
      id: 'landscape',
      ratio: '16:9',
      canvas: { width: 640, height: 360 },
      grid: { columns: 12, margin_pct: 4, gutter_pct: 2 },
      source_plate: 'plate.png',
      finished_plate: 'plate.png',
      output: 'delivery/landscape.jpg',
      copy_field: { x: 0.02, y: 0.2, width: 0.5, height: 0.58 },
      safe_zones: { top: 0.02, right: 0.02, bottom: 0.02, left: 0.02 },
      finish: {
        status: finishStatus,
        executor: 'test/finish',
        delta: 'test only',
        input_policy: 'clean plate only; no copy or logo'
      },
      layout: {
        copy_fade_mid: 0.45,
        copy_fade_end: 0.7,
        logo: { left: 20, top: 20, width: 100 },
        kicker: { x: 30, y: 100, size: 10, tracking: 1 },
        hook: { x: 20, y: 90, width: 4, height: 100 },
        headline: { x: 30, y: 160, size: 32, gap: 38, tracking: -0.5 },
        support: { x: 30, y: 250, size: 14, max_width: 240, gap: 20, tracking: 0 },
        url: { x: 20, y: 335, size: 12, tracking: 0 },
        rule: { x: 20, y: 310, width: 120, height: 2 }
      }
    },
    {
      id: 'portrait',
      ratio: '9:16',
      canvas: { width: 360, height: 640 },
      grid: { columns: 6, margin_pct: 5, gutter_pct: 3 },
      source_plate: 'plate.png',
      finished_plate: 'plate.png',
      output: 'delivery/portrait.jpg',
      copy_field: { x: 0.04, y: 0.18, width: 0.82, height: 0.48 },
      safe_zones: { top: 0.02, right: 0.02, bottom: 0.05, left: 0.02 },
      finish: {
        status: finishStatus,
        executor: 'test/finish',
        delta: 'test only',
        input_policy: 'clean plate only; no copy or logo'
      },
      layout: {
        copy_fade_mid: 0.65,
        copy_fade_end: 0.9,
        logo: { left: 20, top: 20, width: 80 },
        kicker: { x: 30, y: 130, size: 9, tracking: 0.8 },
        hook: { x: 20, y: 120, width: 4, height: 120 },
        headline: { x: 30, y: 200, size: 28, gap: 34, tracking: -0.4 },
        support: { x: 30, y: 310, size: 13, max_width: 250, gap: 18, tracking: 0 },
        url: { x: 20, y: 590, size: 11, tracking: 0 },
        rule: { x: 20, y: 565, width: 110, height: 2 }
      }
    }
  ],
  gates: ['anchor', 'layout', 'finish', 'craft', 'format', 'technical', 'human_release']
})

const makeFixture = async (finishStatus, options = {}) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'campaign-layout-compiler-'))

  const plate = await sharp({
    create: { width: 800, height: 800, channels: 3, background: '#164468' }
  })
    .composite([
      {
        input: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><circle cx="700" cy="380" r="80" fill="#7CF4D1"/><circle cx="750" cy="320" r="35" fill="#9C63FF"/></svg>'
        )
      }
    ])
    .png()
    .toBuffer()

  await writeFile(path.join(root, 'plate.png'), plate)
  const contract = buildContract(finishStatus)

  if (options.baselineThreshold !== undefined) {
    const baseline = await sharp({
      create: { width: 640, height: 360, channels: 3, background: '#000000' }
    })
      .jpeg()
      .toBuffer()

    await writeFile(path.join(root, 'baseline.jpg'), baseline)
    contract.formats[0].baseline = {
      output: 'baseline.jpg',
      max_normalized_mae: options.baselineThreshold
    }
  }

  const contractPath = path.join(root, 'contract.yaml')

  await writeFile(contractPath, stringifyYaml(contract))

  return { root, contractPath }
}

test('compiles approved formats into editable sources, masters, manifest, contact sheet and QA', async () => {
  const fixture = await makeFixture('approved')

  try {
    const compiled = await compileLayoutCampaign(fixture.contractPath)

    assert.equal(compiled.plan.status, 'ready_to_compile')
    assert.equal(compiled.plan.runRoot, '.')
    assert.equal(path.isAbsolute(compiled.plan.contract.path), false)
    assert.equal(path.isAbsolute(compiled.plan.anchor.evidence.path), false)
    assert.equal(path.isAbsolute(compiled.plan.formats[0].output), false)
    assert.equal(compiled.manifest.status, 'masters_compiled_human_release_pending')
    assert.equal(compiled.manifest.results.length, 2)
    assert.equal(compiled.qa.pass, true)
    const checked = await verifyCompiledCampaign(fixture.contractPath)

    assert.equal(checked.pass, true)

    for (const result of compiled.manifest.results) {
      assert.ok(result.sourcePlateSha256)
      assert.ok(result.finishedPlateSha256)
      const output = await sharp(path.join(fixture.root, result.output)).metadata()

      assert.equal(output.space, 'srgb')
      const editable = await readFile(path.join(fixture.root, result.editableSource), 'utf8')

      assert.match(editable, /data-layer="clean_plate"/)
      assert.match(editable, /data-layer="type"/)
      assert.match(editable, /data-layer="brand"/)
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('plan remains available but compile blocks when a finish is pending', async () => {
  const fixture = await makeFixture('pending')

  try {
    const planned = await buildLayoutPlan(fixture.contractPath)

    assert.equal(planned.plan.status, 'plan_only_pending_inputs_or_approvals')
    await assert.rejects(() => compileLayoutCampaign(fixture.contractPath), /not ready/)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('baseline gate blocks a visually divergent migration', async () => {
  const fixture = await makeFixture('approved', { baselineThreshold: 0 })

  try {
    await assert.rejects(() => compileLayoutCampaign(fixture.contractPath), /QA failed/)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('check detects a master modified after compilation', async () => {
  const fixture = await makeFixture('approved')

  try {
    const compiled = await compileLayoutCampaign(fixture.contractPath)
    const outputPath = path.join(fixture.root, compiled.manifest.results[0].output)

    await sharp({ create: { width: 640, height: 360, channels: 3, background: '#000000' } })
      .jpeg()
      .toFile(outputPath)
    await assert.rejects(() => verifyCompiledCampaign(fixture.contractPath), /QA failed/)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})
