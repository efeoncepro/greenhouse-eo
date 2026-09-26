#!/usr/bin/env node
// pnpm creative:orbit:render -- --intent <intent.json> --bindings <bindings.json> --out-dir <dir>
//
// Resolves the intent through the AXIS contract `efeonce.graphic-line-orbit`, paints it with the Greenhouse adapter,
// rasterizes it and runs the contract's adapterChecks. Writes manifest.json, piece.svg, piece.png and qa.json.
// Exits 1 when a check fails. It does not call a model, publish or approve.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import { paintGraphicLine, resolveGraphicLine, runAdapterChecks } from './graphic-line.mjs'

const args = process.argv.slice(2)
const arg = name => (args.includes(name) ? args[args.indexOf(name) + 1] : null)

const usage = `AXIS Graphic Line «La órbita» — Greenhouse render

Usage:
  pnpm creative:orbit:render -- --intent <intent.json> --bindings <bindings.json> --out-dir <dir>

bindings.json: { "targets": { "<id>": { "cx", "cy", "r" } }, "photos": { "<photoId>": "<path>" },
                 "urlBubble": { "x", "y", "height" }, "texts": [{ "id", "x", "y", "w", "h", "content", "svg" }] }
Paths in bindings resolve relative to the bindings file.
`

if (args.includes('--help') || !arg('--intent') || !arg('--out-dir')) {
  process.stdout.write(usage)
  process.exit(args.includes('--help') ? 0 : 2)
}

try {
  const intent = JSON.parse(await readFile(path.resolve(arg('--intent')), 'utf8'))
  const bindingsPath = arg('--bindings') ? path.resolve(arg('--bindings')) : null
  const bindings = bindingsPath ? JSON.parse(await readFile(bindingsPath, 'utf8')) : {}

  if (bindingsPath && bindings.photos)
    for (const [id, file] of Object.entries(bindings.photos)) bindings.photos[id] = path.resolve(path.dirname(bindingsPath), file)

  const manifest = resolveGraphicLine(intent)
  const { svg, rings } = paintGraphicLine(manifest, bindings)
  const checks = runAdapterChecks(manifest, bindings, rings)
  const outDir = path.resolve(arg('--out-dir'))

  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  await writeFile(path.join(outDir, 'piece.svg'), svg)
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, 'piece.png'))

  const failed = checks.filter(check => check.status === 'fail')
  const qa = { schema: manifest.schema, contract: manifest.contract, rings, checks, status: failed.length ? 'fail' : 'pass' }

  await writeFile(path.join(outDir, 'qa.json'), `${JSON.stringify(qa, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify({ status: qa.status, outDir, failed: failed.map(check => check.check) })}\n`)

  if (failed.length) process.exit(1)
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}
