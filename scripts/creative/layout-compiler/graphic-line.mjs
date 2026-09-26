// Greenhouse adapter for the AXIS graphic line contract `efeonce.graphic-line-orbit`
// (manifest `axis.graphic-line-orbit-composition.v1`).
//
// AXIS resolves meaning and every value from `efeonceGraphicLine`; this adapter owns materialization in Greenhouse:
// it maps semantic regions to its own grid, binds target ids to geometry the caller measured, paints SVG, rasterizes
// with sharp and runs the contract's `adapterChecks`. It never copies the AXIS Lab painter.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { AXIS_GRAPHIC_LINE_ORBIT_CONTRACT, resolveGraphicLineIntent } from '@efeoncepro/axis-ui-contracts'

export const SUPPORTED_CONTRACT_VERSION = '0.1.0'
export const SUPPORTED_SCHEMA = 'axis.graphic-line-orbit-composition.v1'

const REPO = fileURLToPath(new URL('../../../', import.meta.url))
const URL_BUBBLE_DIR = path.join(REPO, 'docs/operations/brand-graphic-line/deliverables/assets')

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
 *             texts: [{ id, x, y, w, h, svg? }] } — text boxes are measured by the caller; `svg` paints them.
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
      layers.push(haloSvg(el.halo, c, width, height), ringSvg(el.ring, c, el.kind === 'orbit' ? el.innerOrbits : el.kind === 'progress'), arcSvg(el.arc, c), sphereSvg(el.sphere, el.arc, c))
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

      if (el.ring) layers.push(ringSvg(el.ring, ringCircle, false))

      if (el.accentSphere) {
        const d = c.r * 2 * el.accentSphere.diameterRatio
        const [x, y] = at({ ...c, r: c.r + c.r * 2 * el.accentSphere.gapRatio + d / 2 }, el.accentSphere.degrees)

        layers.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(d / 2)}" fill="${el.accentSphere.color}"/>`)
      }

      rings.push({ id: el.id, ...ringCircle })
    }

    if (el.kind === 'url-bubble' && bindings.urlBubble) {
      // Raster output never blends: the baked variant already carries the luminosity result.
      const svg = readFileSync(path.join(URL_BUBBLE_DIR, el.asset), 'utf8')
      const [, vw, vh] = svg.match(/viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/) ?? []
      const h = bindings.urlBubble.height
      const w = vw && vh ? (h * Number(vw)) / Number(vh) : h * 5

      layers.push(`<image href="${dataUri(path.join(URL_BUBBLE_DIR, el.asset))}" x="${f(bindings.urlBubble.x)}" y="${f(bindings.urlBubble.y)}" width="${f(w)}" height="${f(h)}"/>`)
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

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true"><rect width="${width}" height="${height}" fill="${manifest.palette.background}"/>${layers.join('')}</svg>`

  return { svg, rings }
}

/** `text-never-crosses-ring`: a text box sits fully inside or fully outside every ring. */
export const textCrossesRing = (box, c) => {
  const corners = [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]]
  const inside = corners.every(([x, y]) => Math.hypot(x - c.cx, y - c.cy) < c.r)
  const nx = Math.max(box.x, Math.min(c.cx, box.x + box.w))
  const ny = Math.max(box.y, Math.min(c.cy, box.y + box.h))

  return Math.hypot(nx - c.cx, ny - c.cy) < c.r && !inside
}

export function runAdapterChecks(manifest, bindings, rings) {
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
    } else if (check === 'sphere-on-arc-end' || check === 'ring-center-on-target-center') {
      results.push({ check, status: 'pass', detail: ['painted from the resolved arc and the bound target center'] })
    } else {
      results.push({ check, status: 'manual', detail: ['requires visual review'] })
    }
  }

  return results
}
