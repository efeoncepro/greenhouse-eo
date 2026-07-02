import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { PNG } from 'pngjs'

type FrameContract = {
  path: string
  kind: 'renderer-live' | 'renderer-fixture' | 'renderer-real-composition' | 'renderer-interaction'
  viewport: 'desktop' | 'mobile390'
  minWidth: number
  minHeight: number
}

type FrameReview = FrameContract & {
  width: number
  height: number
  fileSize: number
  modifiedAt: string
  sampledPixels: number
  uniqueSampledColors: number
  nonWhiteRatio: number
  transparentRatio: number
}

type ControlBox = {
  selector: string
  left: number
  top: number
  width: number
  height: number
}

type ViewportManifestResult = {
  name: string
  screenshot: string
  dropdownScreenshot?: string
  inputs: ControlBox[]
  selects: ControlBox[]
  button: ControlBox
}

type ControlPixelStats = {
  selector: string
  sampledPixels: number
  averageLuminance: number
  nearWhiteRatio: number
  darkRatio: number
  tealRatio: number
}

type VisualPixelReview = {
  manifestPath: string
  screenshot: string
  viewport: string
  inputStats: ControlPixelStats[]
  selectStats: ControlPixelStats[]
  buttonStats: ControlPixelStats
}

const maxFrameAgeMs = 15 * 60 * 1000
const outputPath = '.captures/aeo-form-visual-frame-review.json'

const frames: FrameContract[] = [
  {
    path: '.captures/aeo-form-visual-integrity-desktop.png',
    kind: 'renderer-live',
    viewport: 'desktop',
    minWidth: 900,
    minHeight: 600,
  },
  {
    path: '.captures/aeo-form-visual-integrity-mobile390.png',
    kind: 'renderer-live',
    viewport: 'mobile390',
    minWidth: 320,
    minHeight: 600,
  },
  {
    path: '.captures/aeo-renderer-ohio-fixture-desktop.png',
    kind: 'renderer-fixture',
    viewport: 'desktop',
    minWidth: 700,
    minHeight: 500,
  },
  {
    path: '.captures/aeo-renderer-ohio-fixture-mobile390.png',
    kind: 'renderer-fixture',
    viewport: 'mobile390',
    minWidth: 320,
    minHeight: 500,
  },
  {
    path: '.captures/aeo-renderer-ohio-fixture-dropdown-desktop.png',
    kind: 'renderer-fixture',
    viewport: 'desktop',
    minWidth: 700,
    minHeight: 500,
  },
  {
    path: '.captures/aeo-renderer-ohio-fixture-dropdown-mobile390.png',
    kind: 'renderer-fixture',
    viewport: 'mobile390',
    minWidth: 320,
    minHeight: 500,
  },
  {
    path: '.captures/aeo-renderer-real-composition-preview-desktop.png',
    kind: 'renderer-real-composition',
    viewport: 'desktop',
    minWidth: 900,
    minHeight: 600,
  },
  {
    path: '.captures/aeo-renderer-real-composition-preview-mobile390.png',
    kind: 'renderer-real-composition',
    viewport: 'mobile390',
    minWidth: 320,
    minHeight: 600,
  },
  {
    path: '.captures/aeo-renderer-real-composition-preview-dropdown-desktop.png',
    kind: 'renderer-real-composition',
    viewport: 'desktop',
    minWidth: 900,
    minHeight: 600,
  },
  {
    path: '.captures/aeo-renderer-real-composition-preview-dropdown-mobile390.png',
    kind: 'renderer-real-composition',
    viewport: 'mobile390',
    minWidth: 320,
    minHeight: 600,
  },
  {
    path: '.captures/aeo-renderer-interaction-focus-desktop.png',
    kind: 'renderer-interaction',
    viewport: 'desktop',
    minWidth: 900,
    minHeight: 600,
  },
  {
    path: '.captures/aeo-renderer-interaction-focus-mobile390.png',
    kind: 'renderer-interaction',
    viewport: 'mobile390',
    minWidth: 320,
    minHeight: 600,
  },
  {
    path: '.captures/aeo-renderer-interaction-error-desktop.png',
    kind: 'renderer-interaction',
    viewport: 'desktop',
    minWidth: 900,
    minHeight: 600,
  },
  {
    path: '.captures/aeo-renderer-interaction-error-mobile390.png',
    kind: 'renderer-interaction',
    viewport: 'mobile390',
    minWidth: 320,
    minHeight: 600,
  },
  {
    path: '.captures/aeo-renderer-interaction-reduced-motion-desktop.png',
    kind: 'renderer-interaction',
    viewport: 'desktop',
    minWidth: 900,
    minHeight: 600,
  },
]

const pixelManifests = [
  '.captures/aeo-form-visual-integrity-manifest.json',
  '.captures/aeo-renderer-ohio-fixture-manifest.json',
  '.captures/aeo-renderer-real-composition-preview-manifest.json',
]

const isNearWhite = (r: number, g: number, b: number, alpha: number) => {
  return alpha >= 245 && r >= 245 && g >= 245 && b >= 245
}

const isDark = (r: number, g: number, b: number, alpha: number) => {
  return alpha >= 245 && r <= 80 && g <= 80 && b <= 80
}

const isApprovedTeal = (r: number, g: number, b: number, alpha: number) => {
  return alpha >= 245 && r >= 35 && r <= 90 && g >= 165 && g <= 225 && b >= 155 && b <= 215
}

const luminance = (r: number, g: number, b: number) => {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const reviewFrame = (contract: FrameContract): FrameReview => {
  const stat = statSync(contract.path)
  const png = PNG.sync.read(readFileSync(contract.path))
  const now = Date.now()
  const ageMs = now - stat.mtimeMs

  if (ageMs > maxFrameAgeMs) {
    throw new Error(
      `${contract.path} is stale (${Math.round(ageMs / 1000)}s old); rerun visual gates before frame review`
    )
  }

  if (png.width < contract.minWidth || png.height < contract.minHeight) {
    throw new Error(
      `${contract.path} is ${png.width}x${png.height}; expected at least ${contract.minWidth}x${contract.minHeight}`
    )
  }

  const colors = new Set<string>()
  let sampledPixels = 0
  let nonWhitePixels = 0
  let transparentPixels = 0
  const xStep = Math.max(1, Math.floor(png.width / 120))
  const yStep = Math.max(1, Math.floor(png.height / 120))

  for (let y = 0; y < png.height; y += yStep) {
    for (let x = 0; x < png.width; x += xStep) {
      const index = (png.width * y + x) << 2
      const r = png.data[index] ?? 0
      const g = png.data[index + 1] ?? 0
      const b = png.data[index + 2] ?? 0
      const a = png.data[index + 3] ?? 0

      sampledPixels += 1
      colors.add(`${r}:${g}:${b}:${a}`)

      if (a < 245) {
        transparentPixels += 1
      }

      if (!isNearWhite(r, g, b, a)) {
        nonWhitePixels += 1
      }
    }
  }

  const uniqueSampledColors = colors.size
  const nonWhiteRatio = nonWhitePixels / sampledPixels
  const transparentRatio = transparentPixels / sampledPixels

  if (uniqueSampledColors < 24) {
    throw new Error(`${contract.path} looks too visually flat (${uniqueSampledColors} sampled colors)`)
  }

  if (nonWhiteRatio < 0.02) {
    throw new Error(`${contract.path} looks nearly blank (${(nonWhiteRatio * 100).toFixed(2)}% non-white sample)`)
  }

  if (transparentRatio > 0.02) {
    throw new Error(`${contract.path} has unexpected transparency (${(transparentRatio * 100).toFixed(2)}%)`)
  }

  return {
    ...contract,
    width: png.width,
    height: png.height,
    fileSize: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    sampledPixels,
    uniqueSampledColors,
    nonWhiteRatio: Number(nonWhiteRatio.toFixed(4)),
    transparentRatio: Number(transparentRatio.toFixed(4)),
  }
}

const sampleControlBox = (png: PNG, box: ControlBox): ControlPixelStats => {
  const left = Math.max(0, Math.floor(box.left))
  const top = Math.max(0, Math.floor(box.top))
  const right = Math.min(png.width, Math.ceil(box.left + box.width))
  const bottom = Math.min(png.height, Math.ceil(box.top + box.height))
  const insetX = Math.max(4, Math.floor((right - left) * 0.04))
  const insetY = Math.max(4, Math.floor((bottom - top) * 0.18))
  const startX = Math.min(right - 1, left + insetX)
  const endX = Math.max(startX + 1, right - insetX)
  const startY = Math.min(bottom - 1, top + insetY)
  const endY = Math.max(startY + 1, bottom - insetY)
  const xStep = Math.max(1, Math.floor((endX - startX) / 48))
  const yStep = Math.max(1, Math.floor((endY - startY) / 14))

  let sampledPixels = 0
  let luminanceTotal = 0
  let nearWhitePixels = 0
  let darkPixels = 0
  let tealPixels = 0

  for (let y = startY; y < endY; y += yStep) {
    for (let x = startX; x < endX; x += xStep) {
      const index = (png.width * y + x) << 2
      const r = png.data[index] ?? 0
      const g = png.data[index + 1] ?? 0
      const b = png.data[index + 2] ?? 0
      const a = png.data[index + 3] ?? 0

      sampledPixels += 1
      luminanceTotal += luminance(r, g, b)

      if (isNearWhite(r, g, b, a)) nearWhitePixels += 1
      if (isDark(r, g, b, a)) darkPixels += 1
      if (isApprovedTeal(r, g, b, a)) tealPixels += 1
    }
  }

  if (sampledPixels === 0) {
    throw new Error(`${box.selector} produced no sampled pixels`)
  }

  return {
    selector: box.selector,
    sampledPixels,
    averageLuminance: Number((luminanceTotal / sampledPixels).toFixed(2)),
    nearWhiteRatio: Number((nearWhitePixels / sampledPixels).toFixed(4)),
    darkRatio: Number((darkPixels / sampledPixels).toFixed(4)),
    tealRatio: Number((tealPixels / sampledPixels).toFixed(4)),
  }
}

const assertFieldPixels = (label: string, stats: ControlPixelStats) => {
  const surfaceLooksWhite = stats.nearWhiteRatio >= 0.72 && (stats.averageLuminance >= 244 || stats.nearWhiteRatio >= 0.88)

  if (!surfaceLooksWhite) {
    throw new Error(
      `${label} does not look like a white bordered input in the frame: luminance=${stats.averageLuminance}, nearWhiteRatio=${stats.nearWhiteRatio}`
    )
  }
}

const assertSelectPixels = (label: string, stats: ControlPixelStats) => {
  assertFieldPixels(label, stats)

  if (stats.darkRatio > 0.12) {
    throw new Error(
      `${label} has too many dark pixels in the select field (${stats.darkRatio}); possible chevron-wall or host texture regression`
    )
  }
}

const assertButtonPixels = (label: string, stats: ControlPixelStats) => {
  if (stats.tealRatio < 0.38) {
    throw new Error(
      `${label} does not look like the approved teal CTA in the frame: tealRatio=${stats.tealRatio}, luminance=${stats.averageLuminance}`
    )
  }
}

const readViewportManifest = (manifestPath: string): ViewportManifestResult[] => {
  const manifestStat = statSync(manifestPath)
  const ageMs = Date.now() - manifestStat.mtimeMs

  if (ageMs > maxFrameAgeMs) {
    throw new Error(`${manifestPath} is stale (${Math.round(ageMs / 1000)}s old); rerun visual gates before frame review`)
  }

  const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as { results?: ViewportManifestResult[] }

  if (!Array.isArray(parsed.results) || parsed.results.length === 0) {
    throw new Error(`${manifestPath} does not expose viewport results for pixel review`)
  }

  return parsed.results
}

const reviewControlPixels = (): VisualPixelReview[] => {
  const reviews: VisualPixelReview[] = []

  for (const manifestPath of pixelManifests) {
    for (const result of readViewportManifest(manifestPath)) {
      const png = PNG.sync.read(readFileSync(result.screenshot))
      const inputStats = result.inputs.map(box => sampleControlBox(png, box))
      const selectStats = result.selects.map(box => sampleControlBox(png, box))
      const buttonStats = sampleControlBox(png, result.button)

      inputStats.forEach((stats, index) => assertFieldPixels(`${manifestPath} ${result.name} input ${index + 1}`, stats))
      selectStats.forEach((stats, index) => assertSelectPixels(`${manifestPath} ${result.name} select ${index + 1}`, stats))
      assertButtonPixels(`${manifestPath} ${result.name} CTA`, buttonStats)

      reviews.push({
        manifestPath,
        screenshot: result.screenshot,
        viewport: result.name,
        inputStats,
        selectStats,
        buttonStats,
      })
    }
  }

  return reviews
}

const main = () => {
  const reviews = frames.map(reviewFrame)
  const pixelReviews = reviewControlPixels()

  const byKind = reviews.reduce<Record<string, string[]>>((accumulator, review) => {
    accumulator[review.kind] = [...(accumulator[review.kind] ?? []), `${review.viewport}:${review.width}x${review.height}`]

    return accumulator
  }, {})

  const payload = {
    ok: true,
    contract: 'AEO form visual frames exist, are fresh, nonblank, cover live renderer + hostile fixture + composition/focus/error/reduced-motion states, and pixel-sample controls for white fields, clean dropdowns, and teal CTA',
    maxFrameAgeSeconds: maxFrameAgeMs / 1000,
    outputPath,
    byKind,
    reviews,
    pixelReviews,
  }

  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(JSON.stringify(payload, null, 2))
}

try {
  main()
} catch (error) {
  console.error(
    `public-website:review-aeo-form-visual-frames failed in ${dirname(outputPath)}: ${
      error instanceof Error ? error.message : String(error)
    }`
  )
  process.exit(1)
}
