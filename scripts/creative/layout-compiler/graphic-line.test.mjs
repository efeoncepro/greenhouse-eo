import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import sharp from 'sharp'

import { paintGraphicLine, resolveGraphicLine, runAdapterChecks, textCrossesRing } from './graphic-line.mjs'

const execFileAsync = promisify(execFile)
const scriptDir = path.dirname(fileURLToPath(import.meta.url))

const intent = {
  canvas: { width: 1080, height: 1350, brand: 'efeonce', surface: 'dark', channel: 'social' },
  elements: [
    { kind: 'lens', id: 'lens', photoId: 'photo', alt: 'Manos ajustando una curva de color', region: 'upper-center' },
    { kind: 'voice', id: 'voice', questionId: 'q', answerId: 'a', answerText: 'Hacer' },
    { kind: 'url-bubble', id: 'url', medium: 'pdf' }
  ]
}

const withPhoto = async fn => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'axis-orbit-'))
  const photo = path.join(root, 'photo.png')

  await sharp({ create: { width: 64, height: 80, channels: 3, background: '#8a7a6a' } }).png().toFile(photo)

  try {
    return await fn(root, photo)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test('resolves through the pinned AXIS contract and paints a raster-safe piece', async () => {
  await withPhoto(async (root, photo) => {
    const manifest = resolveGraphicLine(intent)
    const bindings = { photos: { photo }, urlBubble: { x: 96, y: 1250, height: 40 }, texts: [{ id: 'a', x: 96, y: 980, w: 370, h: 160, fontSize: 150, baseline: 1110, lastChar: 'r' }] }
    const { svg, rings } = paintGraphicLine(manifest, bindings)

    assert.equal(manifest.contract.id, 'efeonce.graphic-line-orbit')
    assert.match(svg, /clip-path="url\(#gh-lens-/)
    assert.match(svg, /data:image\/svg\+xml;base64/)
    assert.equal(rings.length, 1)
    assert.deepEqual(runAdapterChecks(manifest, bindings, rings).filter(check => check.status === 'fail'), [])

    const png = await sharp(Buffer.from(svg)).png().toBuffer()

    assert.equal((await sharp(png).metadata()).width, 1080)
  })
})

test('text that crosses the ring fails the render and the command exits 1', async () => {
  await withPhoto(async (root, photo) => {
    const manifest = resolveGraphicLine(intent)
    const { rings } = paintGraphicLine(manifest, { photos: { photo } })
    const ring = rings[0]

    assert.equal(textCrossesRing({ x: ring.cx - 10, y: ring.cy + ring.r - 5, w: 200, h: 40 }, ring), true)
    assert.equal(textCrossesRing({ x: 20, y: ring.cy + ring.r + 40, w: 200, h: 40 }, ring), false)

    const intentPath = path.join(root, 'intent.json')
    const bindingsPath = path.join(root, 'bindings.json')

    await writeFile(intentPath, JSON.stringify(intent))
    await writeFile(bindingsPath, JSON.stringify({ photos: { photo: 'photo.png' }, texts: [{ id: 'a', x: ring.cx - 10, y: ring.cy + ring.r - 5, w: 200, h: 40 }] }))

    await assert.rejects(
      execFileAsync(process.execPath, [path.join(scriptDir, 'render-graphic-line.mjs'), '--intent', intentPath, '--bindings', bindingsPath, '--out-dir', path.join(root, 'out')]),
      error => error.code === 1
    )

    const qa = JSON.parse(await readFile(path.join(root, 'out', 'qa.json'), 'utf8'))

    assert.equal(qa.status, 'fail')
  })
})

test('the URL is a bubble: a text node carrying the domain fails the check', async () => {
  await withPhoto(async (root, photo) => {
    const manifest = resolveGraphicLine(intent)
    const bindings = { photos: { photo }, texts: [{ id: 'footer', x: 10, y: 1300, w: 200, h: 20, content: 'efeoncepro.com' }] }
    const { rings } = paintGraphicLine(manifest, bindings)
    const bubble = runAdapterChecks(manifest, bindings, rings).find(check => check.check === 'url-as-bubble-never-text')

    assert.equal(bubble.status, 'fail')
  })
})

test('an invalid intent never reaches the painter', () => {
  assert.throws(() => resolveGraphicLine({ canvas: { width: 1080, height: 1350 }, elements: [{ kind: 'measure', id: 'm', targetId: 'k', value: 0.4, source: '' }] }), /measure-source-required/)
})
