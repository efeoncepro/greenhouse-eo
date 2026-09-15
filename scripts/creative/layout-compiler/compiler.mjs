import { createHash } from 'node:crypto'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import * as fontkit from 'fontkit'
import sharp from 'sharp'
import { resolveCollaborationSelectionIntent } from '@efeoncepro/axis-ui-contracts'
import { axisAdvertising } from '@efeoncepro/axis-tokens'

import { loadLayoutContract, resolveRunPath, resolveRunRoot } from './contract.mjs'
import { renderCollaborationSelection, resolveSupportingTagline, supportingTaglineCopy } from './axis-advertising.mjs'

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

const escapeXml = value =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

const exists = async filePath => {
  try {
    await access(filePath)

    return true
  } catch {
    return false
  }
}

const ensureParent = filePath => mkdir(path.dirname(filePath), { recursive: true })

const relativeToRun = (contractPath, contract, filePath) =>
  path.relative(resolveRunRoot(contractPath, contract), filePath)

const fileEvidence = async (filePath, displayPath = filePath) => {
  if (!(await exists(filePath))) return { exists: false, path: displayPath, sha256: null, bytes: null }
  const bytes = await readFile(filePath)

  return { exists: true, path: displayPath, sha256: sha256(bytes), bytes: bytes.length }
}

export const buildLayoutPlan = async contractPathInput => {
  const { contract, contractPath } = await loadLayoutContract(contractPathInput)
  const runRoot = resolveRunRoot(contractPath, contract)
  const portablePath = filePath => path.relative(runRoot, filePath)
  const portableEvidence = filePath => fileEvidence(filePath, portablePath(filePath))
  const anchorPath = resolveRunPath(contractPath, contract, contract.anchor.asset)
  const logoPath = resolveRunPath(contractPath, contract, contract.brand.logo)

  const urlBubblePath = contract.brand.url_bubble
    ? resolveRunPath(contractPath, contract, contract.brand.url_bubble)
    : null

  const collaborationIntentPath = contract.collaboration_selection
    ? resolveRunPath(contractPath, contract, contract.collaboration_selection.intent)
    : null

  const fontPaths = Object.fromEntries(
    Object.entries(contract.brand.fonts).map(([key, value]) => [key, resolveRunPath(contractPath, contract, value)])
  )

  const formatPlans = await Promise.all(
    contract.formats.map(async format => ({
      id: format.id,
      ratio: format.ratio,
      canvas: format.canvas,
      grid: format.grid,
      sourcePlate: await portableEvidence(resolveRunPath(contractPath, contract, format.source_plate)),
      finishedPlate: await portableEvidence(resolveRunPath(contractPath, contract, format.finished_plate)),
      baseline: format.baseline
        ? await portableEvidence(resolveRunPath(contractPath, contract, format.baseline.output))
        : null,
      output: format.output,
      finish: format.finish,
      copyField: format.copy_field,
      safeZones: format.safe_zones
    }))
  )

  const checkpoints = {
    anchor: contract.anchor.status,
    layout: contract.approvals.layout,
    finishes: Object.fromEntries(contract.formats.map(format => [format.id, format.finish.status])),
    humanRelease: contract.approvals.human_release
  }

  const missingRequiredInputs = [
    ['anchor', await portableEvidence(anchorPath)],
    ['logo', await portableEvidence(logoPath)],
    ...(urlBubblePath ? [['brand:url_bubble', await portableEvidence(urlBubblePath)]] : []),
    ...(await Promise.all(
      Object.entries(fontPaths).map(async ([key, filePath]) => [`font:${key}`, await portableEvidence(filePath)])
    )),
    ...formatPlans.map(format => [`source_plate:${format.id}`, format.sourcePlate]),
    ...formatPlans.map(format => [`finished_plate:${format.id}`, format.finishedPlate]),
    ...formatPlans.filter(format => format.baseline).map(format => [`baseline:${format.id}`, format.baseline]),
    ...(collaborationIntentPath
      ? [['collaboration_selection:intent', await portableEvidence(collaborationIntentPath)]]
      : [])
  ]
    .filter(([, evidence]) => !evidence.exists)
    .map(([id, evidence]) => ({ id, path: evidence.path }))

  const rejected =
    checkpoints.anchor === 'rejected' ||
    checkpoints.layout === 'rejected' ||
    Object.values(checkpoints.finishes).includes('rejected')

  const approvalsReady =
    checkpoints.anchor === 'approved' &&
    checkpoints.layout === 'approved' &&
    Object.values(checkpoints.finishes).every(status => status === 'approved')

  const status = rejected
    ? 'blocked_by_rejection'
    : approvalsReady && missingRequiredInputs.length === 0
      ? 'ready_to_compile'
      : 'plan_only_pending_inputs_or_approvals'

  const plan = {
    schema: 'campaign-layout-plan.v1',
    generatedAt: new Date().toISOString(),
    compilerMode: 'deterministic-no-provider-calls',
    campaignId: contract.campaign_id,
    contract: {
      path: portablePath(contractPath),
      sha256: sha256(await readFile(contractPath))
    },
    runRoot: '.',
    anchor: {
      id: contract.anchor.id,
      revision: contract.anchor.revision,
      evidence: await portableEvidence(anchorPath),
      locks: contract.anchor.locks
    },
    brand: {
      mode: contract.brand_mode,
      logo: await portableEvidence(logoPath),
      urlBubble: urlBubblePath ? await portableEvidence(urlBubblePath) : null,
      fonts: Object.fromEntries(
        await Promise.all(
          Object.entries(fontPaths).map(async ([key, filePath]) => [key, await portableEvidence(filePath)])
        )
      )
    },
    channelMode: contract.channel_mode,
    collaborationSelection: collaborationIntentPath
      ? {
          targetBinding: contract.collaboration_selection.target_binding,
          intent: await portableEvidence(collaborationIntentPath)
        }
      : null,
    checkpoints,
    missingRequiredInputs,
    formats: formatPlans,
    gates: contract.gates,
    status
  }

  const planPath = resolveRunPath(contractPath, contract, contract.artifacts.plan_manifest)

  await ensureParent(planPath)
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`)

  return { contract, contractPath, plan, planPath }
}

const loadFonts = (contractPath, contract) => {
  const fonts = {
    500: fontkit.openSync(resolveRunPath(contractPath, contract, contract.brand.fonts.medium)),
    700: fontkit.openSync(resolveRunPath(contractPath, contract, contract.brand.fonts.bold)),
    800: fontkit.openSync(resolveRunPath(contractPath, contract, contract.brand.fonts.extra_bold))
  }

  if (contract.brand.fonts.regular)
    fonts[400] = fontkit.openSync(resolveRunPath(contractPath, contract, contract.brand.fonts.regular))
  if (contract.brand.fonts.bold_italic)
    fonts['700-italic'] = fontkit.openSync(resolveRunPath(contractPath, contract, contract.brand.fonts.bold_italic))

  return fonts
}

const glyphPaths = (fonts, { value, x, y, size, weight, fontKey = weight, fill, tracking = 0, opacity = 1 }) => {
  const font = fonts[fontKey]
  const run = font.layout(value)
  const scale = size / font.unitsPerEm
  let cursor = 0

  const paths = run.glyphs
    .map((glyph, index) => {
      const position = run.positions[index]
      const dx = cursor + position.xOffset * scale
      const dy = -position.yOffset * scale

      cursor += position.xAdvance * scale + tracking
      const raw = glyph.path.toSVG().trim()
      const markup = raw.startsWith('<') ? raw : `<path d="${raw}"/>`

      return `<g transform="translate(${dx.toFixed(3)} ${dy.toFixed(3)}) scale(${scale.toFixed(6)} ${(-scale).toFixed(6)})">${markup}</g>`
    })
    .join('')

  return `<g data-copy="${escapeXml(value)}" transform="translate(${x} ${y})" fill="${fill}" opacity="${opacity}">${paths}</g>`
}

const measureText = (fonts, { value, size, weight, fontKey = weight, tracking = 0 }) => {
  const font = fonts[fontKey]
  const run = font.layout(value)
  const scale = size / font.unitsPerEm

  return run.positions.reduce(
    (sum, position, index) => sum + position.xAdvance * scale + (index === run.positions.length - 1 ? 0 : tracking),
    0
  )
}

const wrapText = (fonts, { value, size, weight, tracking = 0, maxWidth }) => {
  const words = value.split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word

    if (line && measureText(fonts, { value: candidate, size, weight, tracking }) > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }

  if (line) lines.push(line)

  return lines
}

const underlayMarkup = (contract, format, selectionTargetId = null) => {
  const { width, height } = format.canvas
  const underlay = contract.visual_system.underlay
  const hook = format.layout.hook
  const hookColors = contract.visual_system.hook.colors

  const hookMarkup =
    contract.visual_system.hook.type === 'frequency-rail'
      ? `<g data-layer="campaign_hook" data-axis-layout-element="hook"${selectionTargetId ? ` data-axis-selection-target="${escapeXml(selectionTargetId)}"` : ''}>
      <rect x="${hook.x}" y="${hook.y}" width="${hook.width}" height="${hook.height}" rx="${hook.width / 2}" fill="url(#campaignHook)"/>
      <circle cx="${hook.x + hook.width / 2}" cy="${hook.y + hook.height + 18}" r="${hook.width / 2}" fill="${hookColors[1]}" opacity="0.72"/>
      <circle cx="${hook.x + hook.width / 2}" cy="${hook.y + hook.height + 31}" r="${hook.width / 3}" fill="${hookColors[0]}" opacity="0.48"/>
    </g>`
      : '<g data-layer="campaign_hook" data-hook="none"/>'

  return `<defs>
    <linearGradient id="copyShade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${underlay.color}" stop-opacity="${underlay.copy_opacity_start}"/>
      <stop offset="${format.layout.copy_fade_mid}" stop-color="${underlay.color}" stop-opacity="${underlay.copy_opacity_mid}"/>
      <stop offset="${format.layout.copy_fade_end}" stop-color="${underlay.color}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="topShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${underlay.color}" stop-opacity="${underlay.top_opacity}"/>
      <stop offset="0.52" stop-color="${underlay.color}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="campaignHook" x1="0" y1="1" x2="0" y2="0">
      ${hookColors.map((color, index) => `<stop offset="${index / (hookColors.length - 1)}" stop-color="${color}"/>`).join('')}
    </linearGradient>
    <radialGradient id="vignette" cx="55%" cy="47%" r="78%">
      <stop offset="0.62" stop-color="${underlay.color}" stop-opacity="0"/>
      <stop offset="1" stop-color="${underlay.color}" stop-opacity="${underlay.vignette_opacity}"/>
    </radialGradient>
  </defs>
  <g data-layer="optical_underlay">
    <rect width="${width}" height="${height}" fill="url(#copyShade)"/>
    <rect width="${width}" height="${height}" fill="url(#topShade)"/>
    <rect width="${width}" height="${height}" fill="url(#vignette)"/>
  </g>
  ${hookMarkup}`
}

const unionBounds = (...boundsList) => ({
  left: Math.min(...boundsList.map(bounds => bounds.left)),
  top: Math.min(...boundsList.map(bounds => bounds.top)),
  right: Math.max(...boundsList.map(bounds => bounds.right)),
  bottom: Math.max(...boundsList.map(bounds => bounds.bottom))
})

const inlineCanonicalUrlBubble = (bytes, layout) => {
  const source = bytes.toString('utf8').replace(/^<\?xml[^>]*>\s*/u, '')
  const openingEnd = source.indexOf('>')
  const closingStart = source.lastIndexOf('</svg>')

  if (!source.startsWith('<svg') || openingEnd < 0 || closingStart < openingEnd)
    throw new Error('Canonical URL Bubble asset is not a valid SVG document')

  const opening = source.slice(0, openingEnd + 1)
  const viewBox = opening.match(/viewBox="([^"]+)"/u)?.[1]

  if (!viewBox) throw new Error('Canonical URL Bubble asset requires a viewBox')

  const width = layout.url.width
  const height = width * (242.53 / 1232.25)
  const body = source.slice(openingEnd + 1, closingStart)

  return `<svg data-axis-brand-primitive="url-bubble" data-copy="efeoncepro.com" x="${layout.url.x}" y="${layout.url.y}" width="${width}" height="${height}" viewBox="${viewBox}" opacity="0.72" style="mix-blend-mode:luminosity">${body}</svg>`
}

const buildVectorLayers = (fonts, contract, format, collaborationManifest = null, urlBubbleMarkup = null) => {
  const colors = contract.brand.colors
  const layout = format.layout
  const message = contract.message

  const headlineMarkup = message.headline
    .map((line, index) =>
      glyphPaths(fonts, {
        value: line,
        x: layout.headline.x,
        y: layout.headline.y + layout.headline.gap * index,
        size: layout.headline.size,
        weight: 800,
        fill: index === 0 ? colors.foreground : colors.accent,
        tracking: layout.headline.tracking
      })
    )
    .join('\n')

  const maxHeadlineWidth = Math.max(
    ...message.headline.map(value =>
      measureText(fonts, {
        value,
        size: layout.headline.size,
        weight: 800,
        tracking: layout.headline.tracking
      })
    )
  )

  const headlineBounds = {
    left: layout.headline.x,
    top: layout.headline.y - layout.headline.size,
    right: layout.headline.x + maxHeadlineWidth,
    bottom: layout.headline.y + layout.headline.gap * (message.headline.length - 1) + layout.headline.size * 0.2
  }

  let supportMarkup
  let supportLines
  let supportBounds
  let supportLayout

  if (typeof message.support === 'string') {
    supportLines = wrapText(fonts, {
      value: message.support,
      size: layout.support.size,
      weight: 500,
      tracking: layout.support.tracking,
      maxWidth: layout.support.max_width
    })

    const widths = supportLines.map(line =>
      measureText(fonts, {
        value: line,
        size: layout.support.size,
        weight: 500,
        tracking: layout.support.tracking
      })
    )

    supportMarkup = supportLines
      .map((line, index) =>
        glyphPaths(fonts, {
          value: line,
          x: layout.support.x,
          y: layout.support.y + layout.support.gap * index,
          size: layout.support.size,
          weight: 500,
          fill: colors.support,
          tracking: layout.support.tracking
        })
      )
      .join('\n')
    supportBounds = {
      left: layout.support.x,
      top: layout.support.y - layout.support.size,
      right: layout.support.x + Math.max(...widths),
      bottom: layout.support.y + layout.support.gap * (supportLines.length - 1) + layout.support.size * 0.2
    }
    supportLayout = { mode: 'legacy-wrap', size: layout.support.size, lines: supportLines, copy: message.support }
  } else {
    const roleAppearance = {
      base: { fontKey: 400, weight: 400, fill: colors.support },
      growth: { fontKey: 700, weight: 700, fill: axisAdvertising.color.growthOnDark },
      intervention: { fontKey: '700-italic', weight: 700, fill: axisAdvertising.color.accentSurface }
    }

    const measureWord = (word, size) => {
      const appearance = roleAppearance[word.role]

      return measureText(fonts, {
        value: word.text,
        size,
        weight: appearance.weight,
        fontKey: appearance.fontKey,
        tracking: layout.support.tracking
      })
    }

    const measureSpace = size =>
      measureText(fonts, { value: ' ', size, weight: 400, fontKey: 400, tracking: layout.support.tracking })

    supportLayout = resolveSupportingTagline({
      support: message.support,
      referenceWidth: maxHeadlineWidth,
      requestedSize: layout.support.size,
      minSize: layout.support.min_size ?? layout.support.size * 0.7,
      maxSize: layout.support.max_size ?? layout.support.size * 2,
      measureWord,
      measureSpace
    })
    supportLines = supportLayout.lines.map(line => line.words.map(word => word.text).join(' '))
    supportMarkup = supportLayout.lines
      .map((line, lineIndex) => {
        const lineX = layout.support.x + (supportLayout.referenceWidth - line.width) / 2

        return line.words
          .map(word => {
            const appearance = roleAppearance[word.role]

            return `<g data-axis-ad-emphasis="${word.role}">${glyphPaths(fonts, {
              value: word.text,
              x: lineX + word.x,
              y: layout.support.y + layout.support.gap * lineIndex,
              size: supportLayout.size,
              weight: appearance.weight,
              fontKey: appearance.fontKey,
              fill: appearance.fill,
              tracking: layout.support.tracking
            })}</g>`
          })
          .join('')
      })
      .join('\n')
    const maxSupportWidth = Math.max(...supportLayout.lines.map(line => line.width))

    supportBounds = {
      left: layout.support.x + (supportLayout.referenceWidth - maxSupportWidth) / 2,
      top: layout.support.y - supportLayout.size,
      right: layout.support.x + (supportLayout.referenceWidth + maxSupportWidth) / 2,
      bottom: layout.support.y + layout.support.gap * (supportLayout.lines.length - 1) + supportLayout.size * 0.2
    }
  }

  const lockupBounds = unionBounds(headlineBounds, supportBounds)

  const hookBounds = {
    left: layout.hook.x,
    top: layout.hook.y,
    right: layout.hook.x + layout.hook.width,
    bottom: layout.hook.y + layout.hook.height
  }

  const targetBoundsByBinding = {
    headline: headlineBounds,
    support: supportBounds,
    hook: hookBounds,
    lockup: lockupBounds
  }

  const selectedTargetBounds = contract.collaboration_selection
    ? targetBoundsByBinding[contract.collaboration_selection.target_binding]
    : headlineBounds

  const collaboration = collaborationManifest
    ? renderCollaborationSelection({
        manifest: collaborationManifest,
        targetBounds: selectedTargetBounds,
        canvas: format.canvas,
        measureLabel: (value, size) => measureText(fonts, { value, size, weight: 700 })
      })
    : null

  const selectedTargetId = collaborationManifest?.target.id
  const headlineTarget = contract.collaboration_selection?.target_binding === 'headline' ? selectedTargetId : null
  const supportTarget = contract.collaboration_selection?.target_binding === 'support' ? selectedTargetId : null
  const lockupTarget = contract.collaboration_selection?.target_binding === 'lockup' ? selectedTargetId : null
  const urlBubbleWidth = layout.url.width ?? 0
  const urlBubbleHeight = urlBubbleWidth * (242.53 / 1232.25)

  const urlMarkup =
    urlBubbleMarkup === null
      ? glyphPaths(fonts, {
          value: message.url,
          x: layout.url.x,
          y: layout.url.y,
          size: layout.url.size,
          weight: 700,
          fill: colors.foreground,
          tracking: layout.url.tracking
        })
      : urlBubbleMarkup

  const contentBounds = {
    left: Math.min(
      layout.logo.left,
      layout.hook.x,
      layout.kicker.x,
      layout.headline.x,
      layout.support.x,
      layout.url.x,
      layout.rule.visible ? layout.rule.x : Number.POSITIVE_INFINITY
    ),
    top: Math.min(layout.logo.top, layout.kicker.y - layout.kicker.size, layout.headline.y - layout.headline.size),
    right: Math.max(
      layout.logo.left + layout.logo.width,
      layout.kicker.x +
        measureText(fonts, {
          value: message.kicker,
          size: layout.kicker.size,
          weight: 700,
          tracking: layout.kicker.tracking
        }),
      headlineBounds.right,
      supportBounds.right,
      urlBubbleMarkup
        ? layout.url.x + urlBubbleWidth
        : layout.url.x +
            measureText(fonts, {
              value: message.url,
              size: layout.url.size,
              weight: 700,
              tracking: layout.url.tracking
            }),
      layout.rule.visible ? layout.rule.x + layout.rule.width : Number.NEGATIVE_INFINITY
    ),
    bottom: Math.max(
      urlBubbleMarkup ? layout.url.y + urlBubbleHeight : layout.url.y,
      layout.rule.visible ? layout.rule.y + layout.rule.height : Number.NEGATIVE_INFINITY,
      supportBounds.bottom
    )
  }

  return {
    contentBounds,
    supportLayout,
    collaborationEvidence: collaboration?.evidence ?? null,
    markup: `<g data-layer="type">
      ${glyphPaths(fonts, {
        value: message.kicker,
        x: layout.kicker.x,
        y: layout.kicker.y,
        size: layout.kicker.size,
        weight: 700,
        fill: colors.muted,
        tracking: layout.kicker.tracking,
        opacity: 0.92
      })}
      ${collaboration ? `<g data-layer="selection-wash">${collaboration.underlay}</g>` : ''}
      <g data-axis-layout-element="lockup"${lockupTarget ? ` data-axis-selection-target="${escapeXml(lockupTarget)}"` : ''}>
        <g data-axis-layout-element="headline"${headlineTarget ? ` data-axis-selection-target="${escapeXml(headlineTarget)}"` : ''}>${headlineMarkup}</g>
        <g data-axis-layout-element="support"${supportTarget ? ` data-axis-selection-target="${escapeXml(supportTarget)}"` : ''} data-axis-ad-composition="${typeof message.support === 'string' ? 'legacy-support' : 'supportingTagline'}" data-full-copy="${escapeXml(supportingTaglineCopy(message.support))}">${supportMarkup}</g>
      </g>
      ${layout.rule.visible ? `<rect x="${layout.rule.x}" y="${layout.rule.y}" width="${layout.rule.width}" height="${layout.rule.height}" rx="${layout.rule.height / 2}" fill="${colors.muted}" opacity="0.38"/>` : ''}
      ${urlMarkup}
      ${collaboration ? `<g data-layer="selection-controls">${collaboration.overlay}</g>` : ''}
    </g>`
  }
}

const svgDocument = (width, height, body) =>
  Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`)

const linearChannel = value => {
  const channel = value / 255

  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

const relativeLuminance = (red, green, blue) =>
  0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue)

const hexLuminance = value => {
  const channels = value
    .slice(1)
    .match(/.{2}/g)
    .map(channel => Number.parseInt(channel, 16))

  return relativeLuminance(...channels)
}

const contrast = (first, second) => (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)

const compareRaster = async (candidateBytes, baselinePath, width, height) => {
  const candidate = await sharp(candidateBytes).resize(width, height, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  const baseline = await sharp(baselinePath).resize(width, height, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  let absoluteDifference = 0
  let maxChannelDelta = 0

  for (let index = 0; index < candidate.length; index += 1) {
    const difference = Math.abs(candidate[index] - baseline[index])

    absoluteDifference += difference
    if (difference > maxChannelDelta) maxChannelDelta = difference
  }

  return {
    normalizedMae: absoluteDifference / candidate.length / 255,
    maxChannelDelta
  }
}

const copyFieldContrast = async (underlayPath, format, colors) => {
  const field = {
    left: Math.round(format.copy_field.x * format.canvas.width),
    top: Math.round(format.copy_field.y * format.canvas.height),
    width: Math.round(format.copy_field.width * format.canvas.width),
    height: Math.round(format.copy_field.height * format.canvas.height)
  }

  const { data, info } = await sharp(underlayPath)
    .extract(field)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const luminances = []

  for (let index = 0; index < data.length; index += info.channels) {
    luminances.push(relativeLuminance(data[index], data[index + 1], data[index + 2]))
  }

  luminances.sort((a, b) => a - b)
  const p95 = luminances[Math.floor(luminances.length * 0.95)] ?? 1

  return {
    field,
    foregroundP95: contrast(hexLuminance(colors.foreground), p95),
    accentP95: contrast(hexLuminance(colors.accent), p95)
  }
}

const pixelLuminosity = ([red, green, blue]) => 0.3 * red + 0.59 * green + 0.11 * blue

const clipBlendColor = color => {
  const luminosity = pixelLuminosity(color)
  const minimum = Math.min(...color)
  const maximum = Math.max(...color)
  let clipped = color

  if (minimum < 0) {
    clipped = clipped.map(channel => luminosity + ((channel - luminosity) * luminosity) / (luminosity - minimum))
  }

  if (maximum > 255) {
    clipped = clipped.map(
      channel => luminosity + ((channel - luminosity) * (255 - luminosity)) / (maximum - luminosity)
    )
  }

  return clipped
}

const setPixelLuminosity = (color, targetLuminosity) => {
  const delta = targetLuminosity - pixelLuminosity(color)

  return clipBlendColor(color.map(channel => channel + delta))
}

const compositeLuminosity = async ({ backdropBytes, sourceBytes, left, top, width, opacity }) => {
  const { data: backdrop, info } = await sharp(backdropBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  const { data: source, info: sourceInfo } = await sharp(sourceBytes)
    .resize({ width })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  let changedChannels = 0
  let maxChannelDelta = 0

  for (let sourceY = 0; sourceY < sourceInfo.height; sourceY += 1) {
    const targetY = top + sourceY

    if (targetY < 0 || targetY >= info.height) continue

    for (let sourceX = 0; sourceX < sourceInfo.width; sourceX += 1) {
      const targetX = left + sourceX

      if (targetX < 0 || targetX >= info.width) continue

      const sourceIndex = (sourceY * sourceInfo.width + sourceX) * sourceInfo.channels
      const alpha = (source[sourceIndex + 3] / 255) * opacity

      if (alpha === 0) continue

      const targetIndex = (targetY * info.width + targetX) * info.channels
      const backdropColor = [backdrop[targetIndex], backdrop[targetIndex + 1], backdrop[targetIndex + 2]]
      const sourceColor = [source[sourceIndex], source[sourceIndex + 1], source[sourceIndex + 2]]
      const blended = setPixelLuminosity(backdropColor, pixelLuminosity(sourceColor))

      for (let channel = 0; channel < 3; channel += 1) {
        const before = backdrop[targetIndex + channel]
        const after = Math.round(before * (1 - alpha) + blended[channel] * alpha)
        const delta = Math.abs(after - before)

        backdrop[targetIndex + channel] = after
        if (delta > 10) changedChannels += 1
        if (delta > maxChannelDelta) maxChannelDelta = delta
      }
    }
  }

  const output = await sharp(backdrop, {
    raw: { width: info.width, height: info.height, channels: info.channels }
  })
    .png()
    .toBuffer()

  return {
    output,
    evidence: {
      method: 'non-separable-luminosity',
      backdrop: 'composed-master-before-url-bubble',
      opacity,
      region: { left, top, width: sourceInfo.width, height: sourceInfo.height },
      changedChannels,
      maxChannelDelta,
      visible: changedChannels > 500
    }
  }
}

const renderFormat = async ({
  contract,
  contractPath,
  fonts,
  format,
  logoBytes,
  logoSha256,
  urlBubbleBytes,
  urlBubbleSha256,
  collaborationManifest
}) => {
  const { width, height } = format.canvas
  const sourcePlatePath = resolveRunPath(contractPath, contract, format.source_plate)
  const finishedPlatePath = resolveRunPath(contractPath, contract, format.finished_plate)
  const outputPath = resolveRunPath(contractPath, contract, format.output)
  const editableDir = resolveRunPath(contractPath, contract, contract.artifacts.editable_dir)

  await mkdir(editableDir, { recursive: true })
  await ensureParent(outputPath)

  const sourcePlateBytes = await readFile(sourcePlatePath)
  const finishedPlateBytes = await readFile(finishedPlatePath)

  const plateBytes = await sharp(finishedPlateBytes)
    .resize(width, height, { fit: 'fill' })
    .toColourspace('srgb')
    .png()
    .toBuffer()

  const hookSelectionTarget =
    contract.collaboration_selection?.target_binding === 'hook' ? (collaborationManifest?.target.id ?? null) : null

  const underlayBody = underlayMarkup(contract, format, hookSelectionTarget)
  const underlaySvg = svgDocument(width, height, underlayBody)
  const urlBubbleMarkup = urlBubbleBytes ? inlineCanonicalUrlBubble(urlBubbleBytes, format.layout) : null

  const {
    markup: vectorMarkup,
    contentBounds,
    supportLayout,
    collaborationEvidence
  } = buildVectorLayers(fonts, contract, format, collaborationManifest, urlBubbleMarkup)

  const overlaySvg = svgDocument(width, height, `${underlayBody}${vectorMarkup}`)
  const logoDataUri = `data:image/svg+xml;base64,${logoBytes.toString('base64')}`
  const relativePlatePath = path.relative(editableDir, finishedPlatePath).split(path.sep).join('/')

  const sourceSvg = svgDocument(
    width,
    height,
    `
    <g data-layer="clean_plate"><image href="${escapeXml(relativePlatePath)}" width="${width}" height="${height}" preserveAspectRatio="none"/></g>
    ${underlayBody}
    ${vectorMarkup}
    <g data-layer="brand"><image href="${logoDataUri}" x="${format.layout.logo.left}" y="${format.layout.logo.top}" width="${format.layout.logo.width}"/></g>
  `
  )

  const underlayPath = path.join(editableDir, `${format.id}-underlay.png`)
  const overlayPath = path.join(editableDir, `${format.id}-overlay.svg`)
  const sourcePath = path.join(editableDir, `${format.id}-layout-source.svg`)

  const underlayBytes = await sharp(plateBytes)
    .composite([{ input: underlaySvg, left: 0, top: 0 }])
    .toColourspace('srgb')
    .png()
    .toBuffer()

  await Promise.all([
    writeFile(underlayPath, underlayBytes),
    writeFile(overlayPath, overlaySvg),
    writeFile(sourcePath, sourceSvg)
  ])

  const logoRaster = await sharp(logoBytes).resize({ width: format.layout.logo.width }).png().toBuffer()

  const rasterVectorMarkup = urlBubbleBytes
    ? buildVectorLayers(fonts, contract, format, collaborationManifest, '').markup
    : vectorMarkup

  const composedWithoutUrlBubble = await sharp(underlayBytes)
    .composite([
      { input: svgDocument(width, height, rasterVectorMarkup), left: 0, top: 0 },
      { input: logoRaster, left: format.layout.logo.left, top: format.layout.logo.top }
    ])
    .flatten({ background: contract.brand.colors.background })
    .toColourspace('srgb')
    .png()
    .toBuffer()

  const urlBubbleComposite = urlBubbleBytes
    ? await compositeLuminosity({
        backdropBytes: composedWithoutUrlBubble,
        sourceBytes: urlBubbleBytes,
        left: Math.round(format.layout.url.x),
        top: Math.round(format.layout.url.y),
        width: Math.round(format.layout.url.width),
        opacity: 0.72
      })
    : null

  const composedBytes = urlBubbleComposite?.output ?? composedWithoutUrlBubble
  let pipeline = sharp(composedBytes).toColourspace('srgb').withMetadata({ density: 72 })

  pipeline =
    contract.composition.output_format === 'png'
      ? pipeline.png({ compressionLevel: 9 })
      : pipeline.jpeg({
          quality: contract.composition.quality,
          chromaSubsampling: '4:4:4',
          progressive: true,
          mozjpeg: true
        })
  const outputBytes = await pipeline.toBuffer()

  await writeFile(outputPath, outputBytes)
  const metadata = await sharp(outputBytes).metadata()
  const baselinePath = format.baseline ? resolveRunPath(contractPath, contract, format.baseline.output) : null
  const baselineComparison = baselinePath ? await compareRaster(outputBytes, baselinePath, width, height) : null
  const contrastEvidence = await copyFieldContrast(underlayPath, format, contract.brand.colors)
  const safe = format.safe_zones

  const safeBounds = {
    left: safe.left * width,
    top: safe.top * height,
    right: width * (1 - safe.right),
    bottom: height * (1 - safe.bottom)
  }

  const assertions = {
    dimensions: metadata.width === width && metadata.height === height,
    format: metadata.format === contract.composition.output_format,
    srgb: metadata.space === 'srgb',
    maxBytes: outputBytes.length <= contract.composition.max_bytes,
    finishApproved: format.finish.status === 'approved',
    inputPolicyClean: /clean plate/i.test(format.finish.input_policy),
    contentInSafeZone:
      contentBounds.left >= safeBounds.left &&
      contentBounds.top >= safeBounds.top &&
      contentBounds.right <= safeBounds.right &&
      contentBounds.bottom <= safeBounds.bottom,
    foregroundContrastP95: contrastEvidence.foregroundP95 >= 4.5,
    accentContrastP95: contrastEvidence.accentP95 >= 3
  }

  if (urlBubbleBytes) assertions.urlBubbleVisible = urlBubbleComposite.evidence.visible

  if (format.baseline) {
    assertions.baselineWithinTolerance = baselineComparison.normalizedMae <= format.baseline.max_normalized_mae
  }

  return {
    id: format.id,
    ratio: format.ratio,
    anchorId: contract.anchor.id,
    anchorRevision: contract.anchor.revision,
    topology: { kind: 'star', derivationParent: 'anchor' },
    brandMode: contract.brand_mode,
    channelMode: contract.channel_mode,
    sourcePlate: relativeToRun(contractPath, contract, sourcePlatePath),
    sourcePlateSha256: sha256(sourcePlateBytes),
    finishedPlate: relativeToRun(contractPath, contract, finishedPlatePath),
    finishedPlateSha256: sha256(finishedPlateBytes),
    finish: format.finish,
    editableSource: relativeToRun(contractPath, contract, sourcePath),
    vectorOverlay: relativeToRun(contractPath, contract, overlayPath),
    underlay: relativeToRun(contractPath, contract, underlayPath),
    output: relativeToRun(contractPath, contract, outputPath),
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    colourspace: metadata.space,
    bytes: outputBytes.length,
    sha256: sha256(outputBytes),
    logoSha256,
    urlBubbleSha256,
    urlBubbleRasterEvidence: urlBubbleComposite?.evidence ?? null,
    exactCopy: contract.message,
    supportLayout,
    collaborationSelection: collaborationEvidence,
    copyField: format.copy_field,
    contentBounds,
    safeBounds,
    contrast: {
      foregroundP95: Number(contrastEvidence.foregroundP95.toFixed(2)),
      accentP95: Number(contrastEvidence.accentP95.toFixed(2))
    },
    baselineComparison: baselineComparison
      ? {
          output: relativeToRun(contractPath, contract, baselinePath),
          maxNormalizedMae: format.baseline.max_normalized_mae,
          normalizedMae: Number(baselineComparison.normalizedMae.toFixed(6)),
          maxChannelDelta: baselineComparison.maxChannelDelta
        }
      : null,
    assertions,
    pass: Object.values(assertions).every(Boolean)
  }
}

const buildContactSheet = async ({ contract, contractPath, results }) => {
  const columns = Math.min(contract.composition.contact_sheet_columns, results.length)
  const tileWidth = 760
  const tileHeight = 780
  const gap = 40
  const rows = Math.ceil(results.length / columns)
  const canvasWidth = columns * tileWidth + (columns + 1) * gap
  const canvasHeight = rows * tileHeight + (rows + 1) * gap
  const composites = []

  for (const [index, result] of results.entries()) {
    const column = index % columns
    const row = Math.floor(index / columns)
    const itemsInRow = Math.min(columns, results.length - row * columns)
    const rowOffset = ((columns - itemsInRow) * (tileWidth + gap)) / 2
    const left = gap + rowOffset + column * (tileWidth + gap)
    const top = gap + row * (tileHeight + gap)
    const outputPath = resolveRunPath(contractPath, contract, result.output)

    const thumbnail = await sharp(outputPath)
      .resize(tileWidth - 80, tileHeight - 130, { fit: 'inside', withoutEnlargement: true })
      .toBuffer({ resolveWithObject: true })

    const imageLeft = left + Math.round((tileWidth - thumbnail.info.width) / 2)
    const imageTop = top + 55 + Math.round((tileHeight - 130 - thumbnail.info.height) / 2)
    const label = result.id === result.ratio.replace(':', 'x') ? result.ratio : `${result.id} · ${result.ratio}`

    const tile = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tileWidth}" height="${tileHeight}">
      <rect x="1" y="1" width="${tileWidth - 2}" height="${tileHeight - 2}" rx="20" fill="#0C1F3D" stroke="#2A4568" stroke-width="2"/>
      <text x="32" y="40" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="22" font-weight="700">${escapeXml(label)}</text>
    </svg>`)

    composites.push({ input: tile, left, top }, { input: thumbnail.data, left: imageLeft, top: imageTop })
  }

  const contactSheet = await sharp({
    create: { width: canvasWidth, height: canvasHeight, channels: 3, background: contract.brand.colors.background }
  })
    .composite(composites)
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toBuffer()

  const contactSheetPath = resolveRunPath(contractPath, contract, contract.artifacts.contact_sheet)

  await ensureParent(contactSheetPath)
  await writeFile(contactSheetPath, contactSheet)

  return { path: contactSheetPath, sha256: sha256(contactSheet), bytes: contactSheet.length }
}

export const compileLayoutCampaign = async contractPathInput => {
  const { contract, contractPath, plan, planPath } = await buildLayoutPlan(contractPathInput)

  if (plan.status !== 'ready_to_compile') {
    throw new Error(`Layout compiler is not ready: ${plan.status}. Review ${planPath}`)
  }

  const fonts = loadFonts(contractPath, contract)
  const logoPath = resolveRunPath(contractPath, contract, contract.brand.logo)
  const logoBytes = await readFile(logoPath)
  const logoSha256 = sha256(logoBytes)

  const urlBubblePath = contract.brand.url_bubble
    ? resolveRunPath(contractPath, contract, contract.brand.url_bubble)
    : null

  const urlBubbleBytes = urlBubblePath ? await readFile(urlBubblePath) : null
  const urlBubbleSha256 = urlBubbleBytes ? sha256(urlBubbleBytes) : null
  let collaborationManifest = null

  if (contract.collaboration_selection) {
    const intentPath = resolveRunPath(contractPath, contract, contract.collaboration_selection.intent)
    const intent = JSON.parse(await readFile(intentPath, 'utf8'))

    collaborationManifest = resolveCollaborationSelectionIntent(intent)

    const expectedTargetKinds = {
      headline: 'text',
      support: 'text',
      hook: 'object',
      lockup: 'group'
    }

    const expectedTargetKind = expectedTargetKinds[contract.collaboration_selection.target_binding]

    if (collaborationManifest.target.kind !== expectedTargetKind)
      throw new Error(
        `Collaboration target kind ${collaborationManifest.target.kind} does not match binding ${contract.collaboration_selection.target_binding} (${expectedTargetKind})`
      )
  }

  const results = []

  for (const format of contract.formats) {
    results.push(
      await renderFormat({
        contract,
        contractPath,
        fonts,
        format,
        logoBytes,
        logoSha256,
        urlBubbleBytes,
        urlBubbleSha256,
        collaborationManifest
      })
    )
  }

  const contactSheet = await buildContactSheet({ contract, contractPath, results })

  const manifest = {
    schema: 'campaign-layout-composition.v1',
    compiledAt: new Date().toISOString(),
    campaignId: contract.campaign_id,
    compiler: 'scripts/creative/layout-compiler',
    mode: 'deterministic-no-provider-calls',
    contractSha256: plan.contract.sha256,
    planManifest: relativeToRun(contractPath, contract, planPath),
    renderer: 'sharp + fontkit outlined typography',
    logo: relativeToRun(contractPath, contract, logoPath),
    logoSha256,
    urlBubble: urlBubblePath ? relativeToRun(contractPath, contract, urlBubblePath) : null,
    urlBubbleSha256,
    contactSheet: relativeToRun(contractPath, contract, contactSheet.path),
    contactSheetSha256: contactSheet.sha256,
    checkpoints: plan.checkpoints,
    collaborationSelection: collaborationManifest,
    status:
      contract.approvals.human_release === 'approved'
        ? 'creative_release_candidate'
        : 'masters_compiled_human_release_pending',
    results
  }

  const manifestPath = resolveRunPath(contractPath, contract, contract.artifacts.composition_manifest)

  await ensureParent(manifestPath)
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  const qa = await verifyCompiledCampaign(contractPath, { contract, contractPath, manifest, manifestPath })

  return { plan, manifest, qa, planPath, manifestPath }
}

export const verifyCompiledCampaign = async (contractPathInput, compiled) => {
  const loaded = compiled ?? null
  let contract
  let contractPath
  let manifest
  let manifestPath

  if (loaded) {
    ;({ contract, contractPath, manifest, manifestPath } = loaded)
  } else {
    ;({ contract, contractPath } = await loadLayoutContract(contractPathInput))
    manifestPath = resolveRunPath(contractPath, contract, contract.artifacts.composition_manifest)
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  }

  const checks = []

  for (const result of manifest.results) {
    const outputPath = resolveRunPath(contractPath, contract, result.output)
    const outputBytes = await readFile(outputPath)
    const metadata = await sharp(outputBytes).metadata()
    const overlayPath = resolveRunPath(contractPath, contract, result.vectorOverlay)
    const overlay = await readFile(overlayPath, 'utf8')

    const copyPresent =
      [contract.message.kicker, ...contract.message.headline, contract.message.url].every(value =>
        overlay.includes(`data-copy="${escapeXml(value)}"`)
      ) && overlay.includes(`data-full-copy="${escapeXml(supportingTaglineCopy(contract.message.support))}"`)

    const assertions = {
      rendererAssertions: result.pass && Object.values(result.assertions).every(Boolean),
      dimensions: metadata.width === result.width && metadata.height === result.height,
      format: metadata.format === result.format,
      srgb: metadata.space === 'srgb',
      exactCopyInVectorSource: copyPresent,
      outputHash: sha256(outputBytes) === result.sha256,
      logoHash: result.logoSha256 === manifest.logoSha256,
      urlBubbleAsset:
        !contract.brand.url_bubble ||
        (result.urlBubbleSha256 === manifest.urlBubbleSha256 &&
          result.urlBubbleRasterEvidence?.method === 'non-separable-luminosity' &&
          result.urlBubbleRasterEvidence?.visible === true &&
          overlay.includes('data-axis-brand-primitive="url-bubble"') &&
          overlay.includes('style="mix-blend-mode:luminosity"') &&
          overlay.includes('opacity="0.72"')),
      editableSourcePresent: await exists(resolveRunPath(contractPath, contract, result.editableSource)),
      collaborationSelectionResolved:
        !contract.collaboration_selection ||
        (result.collaborationSelection?.schema === 'axis.collaboration-selection-composition.v1' &&
          result.collaborationSelection.noFreeCoordinates === true &&
          result.collaborationSelection.withinCanvas === true &&
          result.collaborationSelection.cursorEvidence.every(cursor =>
            cursor.state === 'moving' ? cursor.clearOfTarget === true : cursor.touchesTarget === true
          )),
      collaborationTargetBound:
        !contract.collaboration_selection ||
        overlay.includes(`data-axis-selection-target="${escapeXml(manifest.collaborationSelection.target.id)}"`)
    }

    checks.push({ id: result.id, output: result.output, assertions, pass: Object.values(assertions).every(Boolean) })
  }

  const qa = {
    schema: 'campaign-layout-qa.v1',
    checkedAt: new Date().toISOString(),
    campaignId: contract.campaign_id,
    manifest: relativeToRun(contractPath, contract, manifestPath),
    humanRelease: contract.approvals.human_release,
    pass: checks.every(check => check.pass),
    checks
  }

  const qaPath = resolveRunPath(contractPath, contract, contract.artifacts.qa_report)

  await ensureParent(qaPath)
  await writeFile(qaPath, `${JSON.stringify(qa, null, 2)}\n`)

  if (!qa.pass) {
    const failures = checks
      .filter(check => !check.pass)
      .map(check => ({
        id: check.id,
        failed: Object.entries(check.assertions)
          .filter(([, pass]) => !pass)
          .map(([name]) => name)
      }))

    throw new Error(`Layout compiler QA failed: ${JSON.stringify(failures)}. Review ${qaPath}`)
  }

  return qa
}
