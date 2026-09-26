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
    create: { width: 800, height: 800, channels: 3, background: options.plateBackground ?? '#164468' }
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

  if (options.axisAdvertising) {
    const targetId = 'campaign-headline-primary'
    const targetBinding = options.axisAdvertisingBinding ?? 'headline'
    const targetKinds = { headline: 'text', support: 'text', hook: 'object', lockup: 'group' }

    contract.message.headline = ['WORKFLOWS']
    contract.message.url = 'efeoncepro.com'
    contract.message.support = {
      composition: 'supportingTagline',
      reference: 'primary-lockup-inline-size',
      segments: [
        { text: 'Cómo', role: 'base' },
        { text: 'escalar', role: 'growth' },
        { text: 'la creatividad sin', role: 'base' },
        { text: 'automatizar', role: 'intervention' },
        { text: 'el criterio', role: 'base' }
      ]
    }
    contract.brand.fonts.regular = path.join(repoRoot, 'src', 'assets', 'fonts', 'Poppins-Regular.ttf')
    contract.brand.fonts.bold_italic = path.join(repoRoot, 'src', 'assets', 'fonts', 'Poppins-BoldItalic.ttf')
    contract.brand.url_bubble = path.join(
      repoRoot,
      'src',
      'lib',
      'artifact-composer',
      'catalogs',
      'deck-axis',
      'assets',
      'url-lum.svg'
    )
    contract.collaboration_selection = {
      intent: 'collaboration-intent.json',
      target_binding: targetBinding
    }
    contract.formats.forEach((format, index) => {
      format.layout.support.min_size = 8
      format.layout.support.max_size = 18
      format.layout.url =
        index === 0
          ? { x: 200, y: 300, width: 240, size: 12, tracking: 0 }
          : { x: 80, y: 560, width: 200, size: 11, tracking: 0 }
      format.layout.rule.visible = false
    })
    await writeFile(
      path.join(root, contract.collaboration_selection.intent),
      `${JSON.stringify(
        {
          targetId,
          targetKind: targetKinds[targetBinding],
          variant: 'eight-handles',
          padding: 'standard',
          overlay: 'subtle',
          cursors: [
            {
              id: 'local',
              kind: 'local',
              targetId,
              anchor: 'bottom-center',
              action: 'select'
            },
            {
              id: 'creative-team',
              kind: 'collaborator',
              targetId,
              anchor: 'top-end',
              action: 'resize',
              label: 'Equipo creativo',
              participantKind: 'department'
            },
            {
              id: 'camila-moving',
              kind: 'collaborator',
              state: 'moving',
              canvasRegion: 'lower-end',
              direction: 'east',
              action: 'move',
              label: 'Camila',
              participantKind: 'person'
            }
          ]
        },
        null,
        2
      )}\n`
    )
  }

  if (options.signature) {
    contract.brand.signature = options.signature
    if (options.brandBackground) contract.brand.colors.background = options.brandBackground
    // The bubble signature is centered; in portrait it signs wider (its thin strokes lose contrast when small).
    if (options.signature.brand_in_scene) contract.formats[1].layout.url = { ...contract.formats[1].layout.url, x: 60, width: 240 }

    if (options.centerLogo !== false)
      for (const format of contract.formats) format.layout.logo.left = (format.canvas.width - format.layout.logo.width) / 2
  }

  if (options.graphicLine) {
    const format = contract.formats[0]

    await writeFile(
      path.join(root, 'graphic-line-intent.json'),
      JSON.stringify({ canvas: { ...format.canvas, channel: 'social' }, elements: options.graphicLine })
    )
    format.graphic_line = { intent: 'graphic-line-intent.json', protect: [] }
  }

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

test('compiles AXIS supporting tagline and semantic collaboration selection without free coordinates', async () => {
  const fixture = await makeFixture('approved', { axisAdvertising: true })

  try {
    const compiled = await compileLayoutCampaign(fixture.contractPath)

    assert.equal(compiled.qa.pass, true)
    assert.equal(compiled.manifest.collaborationSelection.contract.version, '0.2.0')

    for (const result of compiled.manifest.results) {
      assert.equal(result.supportLayout.copy, 'Cómo escalar la creatividad sin automatizar el criterio')
      assert.ok(['single-line', 'balanced-wrap'].includes(result.supportLayout.mode))
      assert.ok(result.supportLayout.referenceWidth > 0)
      assert.ok(result.supportLayout.lines.every(line => line.width <= result.supportLayout.referenceWidth + 0.01))
      assert.equal(result.collaborationSelection.noFreeCoordinates, true)
      assert.equal(result.collaborationSelection.targetGeometrySource, 'rendered-content-bounds')
      assert.equal(result.collaborationSelection.withinCanvas, true)
      assert.equal(result.urlBubbleRasterEvidence.method, 'non-separable-luminosity')
      assert.equal(result.urlBubbleRasterEvidence.opacity, 0.72)
      assert.equal(result.urlBubbleRasterEvidence.visible, true)
      assert.equal(
        result.collaborationSelection.cursorEvidence.find(cursor => cursor.id === 'local').touchesTarget,
        true
      )
      assert.equal(
        result.collaborationSelection.cursorEvidence.find(cursor => cursor.id === 'creative-team').touchesTarget,
        true
      )
      assert.equal(
        result.collaborationSelection.cursorEvidence.find(cursor => cursor.id === 'camila-moving').clearOfTarget,
        true
      )

      const overlay = await readFile(path.join(fixture.root, result.vectorOverlay), 'utf8')

      assert.match(overlay, /data-axis-ad-composition="supportingTagline"/)
      assert.match(overlay, /data-axis-ad-emphasis="growth"/)
      assert.match(overlay, /data-axis-ad-emphasis="intervention"/)
      assert.match(overlay, /data-axis-selection-target="campaign-headline-primary"/)
      assert.match(overlay, /data-axis-cursor-state="acting"/)
      assert.match(overlay, /data-axis-cursor-state="moving"/)
      assert.match(overlay, /data-axis-cursor-action="select"/)
      assert.match(overlay, /data-axis-cursor-action="resize"/)
      assert.match(overlay, /data-axis-cursor-action="move"/)
      assert.match(overlay, /data-axis-collaborator="Equipo creativo"/)
      assert.match(overlay, /data-axis-collaborator="Camila"/)
      assert.match(overlay, /data-axis-brand-primitive="url-bubble"/)
      assert.match(overlay, /mix-blend-mode:luminosity/)
      assert.match(overlay, /opacity="0.72"/)

      const bubbleRegion =
        result.id === 'landscape'
          ? { left: 200, top: 300, width: 240, height: 47 }
          : { left: 80, top: 560, width: 200, height: 39 }

      const outputPixels = await sharp(path.join(fixture.root, result.output))
        .extract(bubbleRegion)
        .removeAlpha()
        .raw()
        .toBuffer()

      const underlayPixels = await sharp(path.join(fixture.root, result.underlay))
        .extract(bubbleRegion)
        .removeAlpha()
        .raw()
        .toBuffer()

      let changedChannels = 0

      for (let index = 0; index < outputPixels.length; index += 1) {
        if (Math.abs(outputPixels[index] - underlayPixels[index]) > 10) changedChannels += 1
      }

      assert.ok(changedChannels > 500, 'canonical URL Bubble must paint visible pixels in the master')
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('binds collaboration selection to a rendered object rather than only text', async () => {
  const fixture = await makeFixture('approved', { axisAdvertising: true, axisAdvertisingBinding: 'hook' })

  try {
    const compiled = await compileLayoutCampaign(fixture.contractPath)

    assert.equal(compiled.qa.pass, true)
    assert.equal(compiled.manifest.collaborationSelection.target.kind, 'object')

    for (const result of compiled.manifest.results) {
      const overlay = await readFile(path.join(fixture.root, result.vectorOverlay), 'utf8')

      assert.match(overlay, /data-axis-layout-element="hook" data-axis-selection-target="campaign-headline-primary"/)
      assert.equal(result.collaborationSelection.withinCanvas, true)
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

test('the graphic line layer never crosses the copy field: the photographic composition wins', async () => {
  const fixture = await makeFixture('approved', { graphicLine: [{ kind: 'orbit', id: 'orbit', region: 'center-end' }] })

  try {
    await assert.rejects(() => compileLayoutCampaign(fixture.contractPath), /QA failed/)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('a graphic line intent never signs or writes copy inside a campaign piece', async () => {
  const fixture = await makeFixture('approved', { graphicLine: [{ kind: 'signature', id: 'firma' }] })

  try {
    await assert.rejects(() => compileLayoutCampaign(fixture.contractPath), /this compiler owns copy and signature/)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('signature rule: a logo-signed piece carries the centered logo and no URL at all', async () => {
  const fixture = await makeFixture('approved', { signature: { brand_in_scene: false } })

  try {
    const compiled = await compileLayoutCampaign(fixture.contractPath)

    assert.equal(compiled.qa.pass, true)

    for (const result of compiled.manifest.results) {
      const editable = await readFile(path.join(fixture.root, result.editableSource), 'utf8')

      assert.equal(result.signature.mode, 'logo')
      assert.match(editable, /data-layer="brand"/)
      assert.doesNotMatch(editable, /data-axis-brand-primitive="url-bubble"/)
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

// Measured on the fixture: on the brand navy bed (#03142D) the blended bubble lands at 4.42–4.58:1, right at the edge;
// on a near-black bed it reads. The rule is the contrast gate, not the color.
test('signature rule: with the logo in the image, the centered URL bubble signs alone and must read', async () => {
  const fixture = await makeFixture('approved', { axisAdvertising: true, signature: { brand_in_scene: true }, centerLogo: false, plateBackground: '#030507', brandBackground: '#020304' })

  try {
    const compiled = await compileLayoutCampaign(fixture.contractPath)

    assert.equal(compiled.qa.pass, true)

    for (const result of compiled.manifest.results) {
      const editable = await readFile(path.join(fixture.root, result.editableSource), 'utf8')

      assert.equal(result.signature.mode, 'url-bubble')
      assert.ok(result.signature.contrast >= 4.5, `bubble ${result.signature.contrast}`)
      assert.doesNotMatch(editable, /data-layer="brand"/)
      assert.match(editable, /data-axis-brand-primitive="url-bubble"[^>]*opacity="1"/)
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('signature rule: a URL bubble over a bed that is not dark enough fails QA instead of shipping faint', async () => {
  const fixture = await makeFixture('approved', { axisAdvertising: true, signature: { brand_in_scene: true }, centerLogo: false, plateBackground: '#6a6a6a' })

  try {
    await assert.rejects(() => compileLayoutCampaign(fixture.contractPath), /QA failed/)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('signature rule: the contract rejects an off-center signature', async () => {
  const fixture = await makeFixture('approved', { signature: { brand_in_scene: false }, centerLogo: false })

  try {
    await assert.rejects(() => buildLayoutPlan(fixture.contractPath), /centered/)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})
