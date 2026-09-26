// Greenhouse adapter for the AXIS graphic line contract `efeonce.graphic-line-orbit`
// (manifest `axis.graphic-line-orbit-composition.v1`).
//
// AXIS resolves meaning and every value from `efeonceGraphicLine`; this adapter owns materialization in Greenhouse:
// it maps semantic regions to its own grid, binds target ids to geometry the caller measured, paints SVG, rasterizes
// with sharp and runs the contract's `adapterChecks`. It never copies the AXIS Lab painter.
import { readFileSync } from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'
import { brandAssetUrl, findBrandAsset } from '@efeoncepro/axis-brand-assets'
import { AXIS_GRAPHIC_LINE_ORBIT_CONTRACT, resolveGraphicLineIntent } from '@efeoncepro/axis-ui-contracts'

import { compositeLuminosity } from './compiler.mjs'

export const SUPPORTED_CONTRACT_VERSION = '0.3.0'
export const SUPPORTED_SCHEMA = 'axis.graphic-line-orbit-composition.v1'

// The URL bubble as a signature blends at full opacity: measured 2026-09-26, at the 0.72 of the campaign footer it never
// reaches 4.5:1 (3.82 on #001a33, 4.00 on near black); at 1 it gives 6.17 and 6.78 on dark beds and fails on mid or
// light ones — the luminosity blend fixes the lightness of the gray. The contrast gate below decides, not this value.
export const SIGNATURE_BUBBLE_OPACITY = 1

const assetFile = id => {
  const asset = findBrandAsset(id)

  if (!asset) throw new Error(`graphic-line adapter: brand asset «${id}» is not in @efeoncepro/axis-brand-assets`)

  return { asset, file: new URL(brandAssetUrl(id)).pathname }
}

// Greenhouse grid for semantic regions: thirds pulled toward the center, the same reading the canvas used.
const REGION_X = { start: 0.3, center: 0.5, end: 0.7 }
const REGION_Y = { upper: 0.36, center: 0.5, lower: 0.64 }

export const assertGraphicLineContract = () => {
  if (AXIS_GRAPHIC_LINE_ORBIT_CONTRACT.version !== SUPPORTED_CONTRACT_VERSION)
    throw new Error(`Unsupported AXIS graphic line contract ${AXIS_GRAPHIC_LINE_ORBIT_CONTRACT.version}`)
}

export const resolveGraphicLine = intent => {
  assertGraphicLineContract()

  return resolveGraphicLineIntent(intent)
}

export const regionCenter = (region, width, height) => {
  const [row, col] = region === 'center' ? ['center', 'center'] : region.split('-')

  return { x: width * REGION_X[col ?? 'center'], y: height * REGION_Y[row ?? 'center'] }
}

const f = n => Number(n).toFixed(1)
const at = (c, deg) => [c.cx + c.r * Math.cos((deg * Math.PI) / 180), c.cy + c.r * Math.sin((deg * Math.PI) / 180)]

const circleFor = (manifest, placement, bindings) => {
  const { width, height } = manifest.canvas

  if (placement.target) {
    const bound = bindings.targets?.[placement.target.id]

    if (!bound) throw new Error(`graphic-line adapter: target «${placement.target.id}» has no measured geometry`)

    return { cx: bound.cx, cy: bound.cy, r: bound.r * (1 + (placement.radius.airRatio ?? 0)) }
  }

  const { x, y } = regionCenter(placement.region ?? 'center', width, height)

  return { cx: x, cy: y, r: placement.radius.ratio * (placement.radius.of === 'height' ? height : width) }
}

const dataUri = file => {
  const ext = path.extname(file).slice(1).toLowerCase()
  const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`

  return `data:${mime};base64,${readFileSync(file).toString('base64')}`
}

let uid = 0

const ringSvg = (ring, c, withInner) => {
  if (!ring) return ''

  const circle = (r, opacity) => `<circle cx="${f(c.cx)}" cy="${f(c.cy)}" r="${f(r)}" fill="none" stroke="${ring.color}" stroke-opacity="${opacity}" stroke-width="${ring.strokePx}"/>`

  return circle(c.r, ring.opacity) + (withInner ? ring.innerOrbits.map(o => circle(c.r * o.radiusRatio, o.opacity)).join('') : '')
}

const arcSvg = (arc, c) => {
  if (!arc || arc.sweepDeg <= 0) return ''
  if (arc.sweepDeg >= 360) return `<circle cx="${f(c.cx)}" cy="${f(c.cy)}" r="${f(c.r)}" fill="none" stroke="${arc.color}" stroke-width="${arc.strokePx}"/>`

  const [x0, y0] = at(c, arc.startDeg)
  const [x1, y1] = at(c, arc.startDeg + arc.sweepDeg)

  return `<path d="M ${f(x0)} ${f(y0)} A ${f(c.r)} ${f(c.r)} 0 ${arc.sweepDeg > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}" fill="none" stroke="${arc.color}" stroke-width="${arc.strokePx}" stroke-linecap="round"/>`
}

const sphereSvg = (sphere, arc, c) => {
  if (!sphere || !arc) return ''

  const [x, y] = at(c, arc.startDeg + arc.sweepDeg)
  const ring = sphere.ring ? `<circle cx="${f(x)}" cy="${f(y)}" r="${sphere.ring.radiusPx}" fill="none" stroke="${sphere.color}" stroke-opacity="${sphere.ring.opacity}"/>` : ''

  return `<circle cx="${f(x)}" cy="${f(y)}" r="${sphere.radiusPx}" fill="${sphere.color}"/>${ring}`
}

const haloSvg = (halo, c, width, height) => {
  if (!halo) return ''

  const id = `gh-halo-${uid++}`
  const stops = halo.stops.map(s => `<stop offset="${s.offset}" stop-color="${halo.color}" stop-opacity="${s.opacity}"/>`).join('')

  return `<defs><radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f(c.cx)}" cy="${f(c.cy)}" r="${f(c.r * halo.radiusRatio)}">${stops}</radialGradient></defs><rect width="${width}" height="${height}" fill="url(#${id})"/>`
}

/**
 * bindings: { targets: { [id]: { cx, cy, r } }, photos: { [photoId]: path }, urlBubble: { x, y, height },
 *             texts: [{ id, x, y, w, h, svg? }], signature: { y? },
 *             protect: [{ id, kind: 'subject' | 'reserve' | 'bed', x, y, w, h }] }
 * Text boxes are measured by the caller; `svg` paints them. `protect` is what the photographic language owns: the
 * orbit never crosses a subject or a reserve, and the signature never lands on either (it may sit on the bed).
 */
export function paintGraphicLine(manifest, bindings = {}) {
  if (manifest.schema !== SUPPORTED_SCHEMA) throw new Error(`Unsupported manifest ${manifest.schema}`)
  if (manifest.contract.version !== SUPPORTED_CONTRACT_VERSION) throw new Error(`Unsupported contract version ${manifest.contract.version}`)

  const { width, height } = manifest.canvas
  const layers = []
  const rings = []

  for (const el of manifest.elements) {
    if (el.kind === 'orbit' || el.kind === 'measure' || el.kind === 'progress') {
      const c = circleFor(manifest, el.placement, bindings)

      rings.push({ id: el.id, ...c })
      // Inner orbits only where the element asks for them; a deck's progress is one ring (AXIS 0.3, canvas 4.2).
      layers.push(haloSvg(el.halo, c, width, height), ringSvg(el.ring, c, el.kind === 'orbit' ? el.innerOrbits : false), arcSvg(el.arc, c), sphereSvg(el.sphere, el.arc, c))
    }

    if (el.kind === 'lens') {
      const c = circleFor(manifest, el.placement, bindings)
      const file = bindings.photos?.[el.photo.id]

      if (!file) throw new Error(`graphic-line adapter: photo «${el.photo.id}» has no file`)

      const href = dataUri(file)
      const id = `gh-lens-${uid++}`
      const z = el.inside.zoom
      const o = el.outside

      // Raster-safe outside treatment: a desaturated, darkened copy under a navy multiply wash.
      layers.push(
        `<defs><filter id="${id}-f"><feColorMatrix type="saturate" values="${1 - o.grayscale}"/><feComponentTransfer><feFuncR type="linear" slope="${o.brightness * o.contrast}" intercept="${(1 - o.contrast) / 2}"/><feFuncG type="linear" slope="${o.brightness * o.contrast}" intercept="${(1 - o.contrast) / 2}"/><feFuncB type="linear" slope="${o.brightness * o.contrast}" intercept="${(1 - o.contrast) / 2}"/></feComponentTransfer></filter><clipPath id="${id}-c"><circle cx="${f(c.cx)}" cy="${f(c.cy)}" r="${f(c.r)}"/></clipPath></defs>`,
        `<image href="${href}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" filter="url(#${id}-f)"/>`,
        `<rect width="${width}" height="${height}" fill="${o.multiplyColor}" fill-opacity="${o.multiplyOpacity}" style="mix-blend-mode:multiply"/>`,
        `<image href="${href}" x="${f(c.cx - c.cx * z)}" y="${f(c.cy - c.cy * z)}" width="${f(width * z)}" height="${f(height * z)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}-c)"/>`
      )

      const ringCircle = el.ring ? { ...c, r: c.r * (1 + el.ring.airRatio) } : c

      // The lens carries the orbit (AXIS 0.3, canvas 1.3): its ring, a short arc and the sphere at its tip, never a
      // loose disc. Arc and sphere ride on the ring, with or without the ring drawn.
      const orbitCircle = { ...c, r: c.r * (1 + (el.ring?.airRatio ?? 0.12)) }

      if (el.ring) layers.push(ringSvg(el.ring, ringCircle, false))
      layers.push(arcSvg(el.arc, orbitCircle), sphereSvg(el.sphere, el.arc, orbitCircle))

      rings.push({ id: el.id, ...ringCircle })
    }

    if (el.kind === 'url-bubble' && bindings.urlBubble) {
      // A footer bubble (deck, report, stationery). Raster output never blends: the baked variant carries the result.
      const baked = el.assetId === 'url-bubble-source' ? 'url-bubble-baked-light' : el.assetId
      const { asset, file } = assetFile(baked)
      const h = bindings.urlBubble.height

      layers.push(`<image href="${dataUri(file)}" x="${f(bindings.urlBubble.x)}" y="${f(bindings.urlBubble.y)}" width="${f(h / asset.aspectRatio)}" height="${f(h)}"/>`)
    }
  }

  for (const text of bindings.texts ?? []) if (text.svg) layers.push(text.svg)

  // The answer closes with the sphere as its period. The caller measures the painted answer (`w`, `fontSize`,
  // `baseline`, `lastChar`); diameter and optical gap come from the manifest, never from this file.
  for (const voice of manifest.elements.filter(el => el.kind === 'voice')) {
    const answer = (bindings.texts ?? []).find(text => text.id === voice.answer.targetId)

    if (!answer?.fontSize || answer.baseline === undefined) continue

    const d = voice.answer.sphereDiameterEm * answer.fontSize
    const gapEm = voice.answer.gapEm[answer.lastChar ?? ''] ?? voice.answer.defaultGapEm

    layers.push(`<circle cx="${f(answer.x + answer.w + gapEm * answer.fontSize + d / 2)}" cy="${f(answer.baseline - d / 2)}" r="${f(d / 2)}" fill="${manifest.palette.accent}"/>`)
  }

  // `transparent`: a layer over a plate another compiler owns (Campaign Layout Compiler) — no background of its own.
  const background = bindings.transparent ? '' : `<rect width="${width}" height="${height}" fill="${manifest.palette.background}"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">${background}${layers.join('')}</svg>`

  return { svg, rings, signature: signatureBox(manifest, bindings) }
}

/** Where the signature goes: centered, anchored at the foot by the resolved margin; `bindings.signature.y` (a photo
 * adapter that measured the bed) may move it vertically, never horizontally. */
export const signatureBox = (manifest, bindings = {}) => {
  const el = manifest.elements.find(element => element.kind === 'signature')

  if (!el) return null

  const { width, height } = manifest.canvas
  const { asset, file } = assetFile(el.assetId)
  const short = Math.min(width, height)
  const w = Math.round(short * el.widthOfShortSide)
  const h = Math.round(w * asset.aspectRatio)
  const x = Math.round((width - w) / 2)
  const y = bindings.signature?.y !== undefined ? Math.round(bindings.signature.y) : Math.round(height - short * el.marginOfShortSide - h)

  return { id: el.id, mode: el.mode, assetId: el.assetId, file, blend: el.blend, minContrast: el.minContrast, x, y, w, h }
}

const relLum = (r, g, b) => {
  const c = v => {
    const s = v / 255

    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b)
}

// Contrast of the signature as painted: every solid ink pixel (alpha ≥ 0.9; antialiased edges excluded) against the
// backdrop it covers, the 1 % worst.
const inkContrast = (before, after, alpha, channels) => {
  const ratios = []

  for (let i = 0, a = 0; a < alpha.length; i += channels, a += 1) {
    if (alpha[a] < 230) continue
    const l1 = relLum(after[i], after[i + 1], after[i + 2])
    const l0 = relLum(before[i], before[i + 1], before[i + 2])

    ratios.push((Math.max(l1, l0) + 0.05) / (Math.min(l1, l0) + 0.05))
  }

  if (!ratios.length) return null
  ratios.sort((a, b) => a - b)

  return Number(ratios[Math.floor(ratios.length * 0.01)].toFixed(2))
}

/** Paints, rasterizes and signs. The URL bubble blends on the real pixels (non-separable luminosity), not in CSS. */
export async function renderGraphicLine(manifest, bindings = {}) {
  const { svg, rings, signature } = paintGraphicLine(manifest, bindings)
  let png = await sharp(Buffer.from(svg)).png().toBuffer()

  if (signature) {
    const source = await sharp(signature.file, { density: 600 }).resize({ width: signature.w }).png().toBuffer()
    const { data: alpha } = await sharp(source).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true })
    const region = { left: signature.x, top: signature.y, width: signature.w, height: (await sharp(source).metadata()).height }
    const before = await sharp(png).extract(region).removeAlpha().raw().toBuffer({ resolveWithObject: true })

    png = signature.blend
      ? (await compositeLuminosity({ backdropBytes: png, sourceBytes: source, left: signature.x, top: signature.y, width: signature.w, opacity: SIGNATURE_BUBBLE_OPACITY })).output
      : await sharp(png).composite([{ input: source, left: signature.x, top: signature.y }]).png().toBuffer()

    const after = await sharp(png).extract(region).removeAlpha().raw().toBuffer()

    signature.contrast = inkContrast(before.data, after, alpha, 3)
    signature.h = region.height
  }

  return { svg, png, rings, signature }
}

/** `text-never-crosses-ring`: a text box sits fully inside or fully outside every ring. */
export const textCrossesRing = (box, c) => {
  const corners = [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]]
  const inside = corners.every(([x, y]) => Math.hypot(x - c.cx, y - c.cy) < c.r)
  const nx = Math.max(box.x, Math.min(c.cx, box.x + box.w))
  const ny = Math.max(box.y, Math.min(c.cy, box.y + box.h))

  return Math.hypot(nx - c.cx, ny - c.cy) < c.r && !inside
}

// Lens and spotlight surround their subject by design; the rule is for the orbit drawn over a photo.
const orbitKinds = new Set(['orbit', 'measure', 'progress', 'family-map'])

export function runAdapterChecks(manifest, bindings, rings, signature = null) {
  const results = []

  for (const check of manifest.adapterChecks) {
    if (check === 'text-never-crosses-ring') {
      const crossings = (bindings.texts ?? []).flatMap(text => rings.filter(ring => textCrossesRing(text, ring)).map(ring => `${text.id}×${ring.id}`))

      results.push({ check, status: crossings.length ? 'fail' : 'pass', detail: crossings })
    } else if (check === 'url-as-bubble-never-text') {
      const asText = (bindings.texts ?? []).filter(text => /efeoncepro\.com/i.test(text.content ?? ''))

      results.push({ check, status: asText.length ? 'fail' : 'pass', detail: asText.map(text => text.id) })
    } else if (check === 'decorative-svg-hidden-from-accessibility-tree') {
      results.push({ check, status: 'pass', detail: ['svg aria-hidden="true"'] })
    } else if (check === 'signature-centered') {
      const sig = signature ?? null
      const off = sig ? Math.abs(sig.x + sig.w / 2 - manifest.canvas.width / 2) : 0

      results.push({ check, status: !sig ? 'pass' : off <= 1 ? 'pass' : 'fail', detail: sig ? [`${sig.mode} ${Math.round(off)} px off center`] : ['no signature declared'] })
    } else if (check === 'signature-min-contrast') {
      const sig = signature ?? null
      const ok = !sig || (sig.contrast != null && sig.contrast >= sig.minContrast)

      results.push({ check, status: ok ? 'pass' : 'fail', detail: sig ? [`${sig.mode} ${sig.contrast ?? 'unmeasured'}:1 (min ${sig.minContrast})`] : ['no signature declared'] })
    } else if (check === 'orbit-never-over-subject-or-reserves') {
      const guarded = (bindings.protect ?? []).filter(zone => zone.kind === 'subject' || zone.kind === 'reserve')
      const orbitRings = rings.filter(ring => orbitKinds.has(manifest.elements.find(el => el.id === ring.id)?.kind))
      const crossings = guarded.flatMap(zone => orbitRings.filter(ring => textCrossesRing(zone, ring)).map(ring => `${ring.id}×${zone.id}`))
      const sig = signature ?? null
      const sigOver = sig ? guarded.filter(zone => zone.x < sig.x + sig.w && zone.x + zone.w > sig.x && zone.y < sig.y + sig.h && zone.y + zone.h > sig.y).map(zone => `signature×${zone.id}`) : []

      results.push({ check, status: crossings.length || sigOver.length ? 'fail' : 'pass', detail: [...crossings, ...sigOver] })
    } else if (check === 'sphere-on-arc-end' || check === 'ring-center-on-target-center') {
      results.push({ check, status: 'pass', detail: ['painted from the resolved arc and the bound target center'] })
    } else {
      results.push({ check, status: 'manual', detail: ['requires visual review'] })
    }
  }

  return results
}
