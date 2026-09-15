import {
  AXIS_ADVERTISING_TYPOGRAPHY_CONTRACT,
  AXIS_COLLABORATION_SELECTION_CONTRACT
} from '@efeoncepro/axis-ui-contracts'
import { axisAdvertising } from '@efeoncepro/axis-tokens'

const directionVectors = {
  'north-west': { x: -Math.SQRT1_2, y: -Math.SQRT1_2, angle: 0 },
  north: { x: 0, y: -1, angle: 45 },
  'north-east': { x: Math.SQRT1_2, y: -Math.SQRT1_2, angle: 90 },
  east: { x: 1, y: 0, angle: 135 },
  'south-east': { x: Math.SQRT1_2, y: Math.SQRT1_2, angle: 180 },
  south: { x: 0, y: 1, angle: 225 },
  'south-west': { x: -Math.SQRT1_2, y: Math.SQRT1_2, angle: 270 },
  west: { x: -1, y: 0, angle: 315 }
}

const canvasRegions = {
  'upper-start': [0.18, 0.18],
  'upper-center': [0.5, 0.18],
  'upper-end': [0.82, 0.18],
  'center-start': [0.18, 0.5],
  center: [0.5, 0.5],
  'center-end': [0.82, 0.5],
  'lower-start': [0.18, 0.82],
  'lower-center': [0.5, 0.82],
  'lower-end': [0.82, 0.82]
}

const escapeXml = value =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

const round = value => Number(value.toFixed(3))

const tokenizeTagline = segments =>
  segments.flatMap(segment =>
    segment.text
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(text => ({ text, role: segment.role }))
  )

const measureWords = ({ words, size, measureWord, measureSpace }) =>
  words.reduce(
    (width, word, index) => width + measureWord(word, size) + (index === words.length - 1 ? 0 : measureSpace(size)),
    0
  )

const placeWords = ({ words, size, measureWord, measureSpace }) => {
  let x = 0

  return words.map((word, index) => {
    const width = measureWord(word, size)
    const placed = { ...word, x: round(x), width: round(width) }

    x += width + (index === words.length - 1 ? 0 : measureSpace(size))

    return placed
  })
}

const bestBalancedBreak = ({ words, size, measureWord, measureSpace }) => {
  const candidates = []

  for (let index = 1; index < words.length; index += 1) {
    const first = words.slice(0, index)
    const second = words.slice(index)
    const firstWidth = measureWords({ words: first, size, measureWord, measureSpace })
    const secondWidth = measureWords({ words: second, size, measureWord, measureSpace })

    candidates.push({
      lines: [first, second],
      maxWidth: Math.max(firstWidth, secondWidth),
      imbalance: Math.abs(firstWidth - secondWidth)
    })
  }

  return candidates.sort((first, second) => first.maxWidth - second.maxWidth || first.imbalance - second.imbalance)[0]
}

export const assertAxisAdvertisingPackages = () => {
  if (AXIS_ADVERTISING_TYPOGRAPHY_CONTRACT.version !== '0.2.1')
    throw new Error(`Unsupported AXIS advertising contract ${AXIS_ADVERTISING_TYPOGRAPHY_CONTRACT.version}`)
  if (AXIS_COLLABORATION_SELECTION_CONTRACT.version !== '0.2.0')
    throw new Error(`Unsupported AXIS collaboration contract ${AXIS_COLLABORATION_SELECTION_CONTRACT.version}`)
  if (axisAdvertising.compositions.supportingTagline.fitStrategy !== 'uniform-scale-to-reference')
    throw new Error('Unsupported AXIS supportingTagline fitting strategy')
}

export const supportingTaglineCopy = support =>
  typeof support === 'string'
    ? support
    : tokenizeTagline(support.segments)
        .map(word => word.text)
        .join(' ')

export const resolveSupportingTagline = ({
  support,
  referenceWidth,
  requestedSize,
  minSize,
  maxSize,
  measureWord,
  measureSpace
}) => {
  assertAxisAdvertisingPackages()
  const words = tokenizeTagline(support.segments)
  const emphasisCount = support.segments.filter(segment => segment.role !== 'base').length

  if (emphasisCount > axisAdvertising.compositions.supportingTagline.maxEmphasisSegments)
    throw new Error('supportingTagline accepts at most two semantic emphasis segments')
  if (words.length === 0) throw new Error('supportingTagline requires visible copy')

  const requestedWidth = measureWords({ words, size: requestedSize, measureWord, measureSpace })
  const singleLineSize = requestedSize * (referenceWidth / requestedWidth)

  if (singleLineSize >= minSize) {
    const size = Math.min(singleLineSize, maxSize)
    const placed = placeWords({ words, size, measureWord, measureSpace })

    return {
      copy: words.map(word => word.text).join(' '),
      mode: 'single-line',
      size: round(size),
      lines: [{ words: placed, width: round(measureWords({ words, size, measureWord, measureSpace })) }],
      referenceWidth: round(referenceWidth),
      recipe: axisAdvertising.compositions.supportingTagline
    }
  }

  const balanced = bestBalancedBreak({ words, size: minSize, measureWord, measureSpace })

  if (!balanced) throw new Error('supportingTagline cannot wrap a one-word sentence below its readable minimum')

  const wrappedSize = Math.min(maxSize, minSize * (referenceWidth / balanced.maxWidth))

  if (wrappedSize < minSize)
    throw new Error('supportingTagline does not fit its reference measure at the declared readable minimum')

  return {
    copy: words.map(word => word.text).join(' '),
    mode: 'balanced-wrap',
    size: round(wrappedSize),
    lines: balanced.lines.map(line => ({
      words: placeWords({ words: line, size: wrappedSize, measureWord, measureSpace }),
      width: round(measureWords({ words: line, size: wrappedSize, measureWord, measureSpace }))
    })),
    referenceWidth: round(referenceWidth),
    recipe: axisAdvertising.compositions.supportingTagline
  }
}

const expandedBounds = (targetBounds, paddingRatio, canvasWidth) => ({
  left: targetBounds.left - paddingRatio.inline * canvasWidth,
  top: targetBounds.top - paddingRatio.block * canvasWidth,
  right: targetBounds.right + paddingRatio.inline * canvasWidth,
  bottom: targetBounds.bottom + paddingRatio.block * canvasWidth
})

const anchorPoint = (bounds, anchor) => {
  const centerX = (bounds.left + bounds.right) / 2
  const centerY = (bounds.top + bounds.bottom) / 2

  const points = {
    'top-start': [bounds.left, bounds.top],
    'top-center': [centerX, bounds.top],
    'top-end': [bounds.right, bounds.top],
    'end-center': [bounds.right, centerY],
    'bottom-end': [bounds.right, bounds.bottom],
    'bottom-center': [centerX, bounds.bottom],
    'bottom-start': [bounds.left, bounds.bottom],
    'start-center': [bounds.left, centerY]
  }

  const [x, y] = points[anchor]

  return { x, y }
}

const pointInside = (point, bounds, clearance = 0) =>
  point.x >= bounds.left - clearance &&
  point.x <= bounds.right + clearance &&
  point.y >= bounds.top - clearance &&
  point.y <= bounds.bottom + clearance

const movingHotspot = ({ canvas, region, selectionBounds, clearance }) => {
  const [xRatio, yRatio] = canvasRegions[region]
  const base = { x: canvas.width * xRatio, y: canvas.height * yRatio }

  const offsets = [
    [0, 0],
    [-0.08, 0],
    [0.08, 0],
    [0, -0.08],
    [0, 0.08]
  ]

  return offsets
    .map(([x, y]) => ({ x: base.x + canvas.width * x, y: base.y + canvas.height * y }))
    .find(point => !pointInside(point, selectionBounds, clearance))
}

const labelPlacement = ({ hotspot, direction, labelWidth, labelHeight, cursorSize, gap }) => {
  const vector = directionVectors[direction]
  let x = hotspot.x - labelWidth / 2
  let y = hotspot.y - labelHeight / 2

  if (vector.x > 0.4) x = hotspot.x - cursorSize - gap - labelWidth
  else if (vector.x < -0.4) x = hotspot.x + cursorSize + gap

  if (vector.y > 0.4) y = hotspot.y - cursorSize - gap - labelHeight
  else if (vector.y < -0.4) y = hotspot.y + cursorSize + gap

  return { x, y }
}

const selectionControls = ({ bounds, variant, stroke, handleSize }) => {
  const width = bounds.right - bounds.left
  const height = bounds.bottom - bounds.top

  const points = [
    anchorPoint(bounds, 'top-start'),
    anchorPoint(bounds, 'top-center'),
    anchorPoint(bounds, 'top-end'),
    anchorPoint(bounds, 'end-center'),
    anchorPoint(bounds, 'bottom-end'),
    anchorPoint(bounds, 'bottom-center'),
    anchorPoint(bounds, 'bottom-start'),
    anchorPoint(bounds, 'start-center')
  ]

  if (variant === 'open-brackets') {
    const arm = Math.min(width, height) * 0.12

    return `<path d="M ${round(bounds.left + arm)} ${round(bounds.top)} H ${round(bounds.left)} V ${round(bounds.top + arm)} M ${round(bounds.right - arm)} ${round(bounds.top)} H ${round(bounds.right)} V ${round(bounds.top + arm)} M ${round(bounds.right)} ${round(bounds.bottom - arm)} V ${round(bounds.bottom)} H ${round(bounds.right - arm)} M ${round(bounds.left + arm)} ${round(bounds.bottom)} H ${round(bounds.left)} V ${round(bounds.bottom - arm)}" fill="none" stroke="${stroke}" stroke-width="${round(handleSize * 0.22)}"/>`
  }

  const activePoints = variant === 'four-corners' ? [points[0], points[2], points[4], points[6]] : points
  const boundary = `<rect x="${round(bounds.left)}" y="${round(bounds.top)}" width="${round(width)}" height="${round(height)}" fill="none" stroke="${stroke}" stroke-width="${round(handleSize * 0.16)}" stroke-dasharray="${round(handleSize * 0.46)} ${round(handleSize * 0.3)}"/>`

  const handles = activePoints
    .map(
      point =>
        `<rect x="${round(point.x - handleSize / 2)}" y="${round(point.y - handleSize / 2)}" width="${round(handleSize)}" height="${round(handleSize)}" fill="#ffffff" stroke="${stroke}" stroke-width="${round(handleSize * 0.14)}"/>`
    )
    .join('')

  return `${boundary}${handles}`
}

const cursorPath = ({ hotspot, direction, size, fill, stroke, strokeWidth, id, kind, state, action }) => {
  const angle = directionVectors[direction].angle
  const scale = size / 34

  return `<g data-axis-cursor-id="${escapeXml(id)}" data-axis-cursor-kind="${kind}" data-axis-cursor-state="${state}" data-axis-cursor-action="${action}" data-axis-cursor-direction="${direction}" data-axis-cursor-hotspot-x="${round(hotspot.x)}" data-axis-cursor-hotspot-y="${round(hotspot.y)}" transform="translate(${round(hotspot.x)} ${round(hotspot.y)}) rotate(${angle}) scale(${round(scale)})"><path d="M 0 0 L 32 13 L 19 18 L 14 33 Z" fill="${fill}" stroke="${stroke}" stroke-width="${round(strokeWidth / scale)}" stroke-linejoin="round"/></g>`
}

export const renderCollaborationSelection = ({ manifest, targetBounds, canvas, measureLabel }) => {
  assertAxisAdvertisingPackages()
  if (manifest.schema !== 'axis.collaboration-selection-composition.v1')
    throw new Error(`Unsupported collaboration manifest schema ${manifest.schema ?? 'missing'}`)
  if (
    manifest.contract?.id !== AXIS_COLLABORATION_SELECTION_CONTRACT.id ||
    manifest.contract?.version !== AXIS_COLLABORATION_SELECTION_CONTRACT.version
  )
    throw new Error('Collaboration manifest contract does not match the installed AXIS package')

  const bounds = expandedBounds(targetBounds, manifest.selection.paddingRatio, canvas.width)
  const handleSize = Math.max(7, canvas.width * 0.008)
  const localSize = Math.max(32, canvas.width * 0.047)
  const collaboratorSize = Math.max(18, canvas.width * 0.026)
  const labelFontSize = Math.max(11, canvas.width * 0.012)
  const labelHeight = labelFontSize * 2.15
  const gap = Math.max(3, canvas.width * 0.004)
  const palette = ['#5d50ff', axisAdvertising.color.growthOnDark, '#0375db', axisAdvertising.color.accentSurface]

  const overlay =
    manifest.selection.overlayOpacity > 0
      ? `<rect data-axis-selection-overlay-layer="true" x="${round(bounds.left)}" y="${round(bounds.top)}" width="${round(bounds.right - bounds.left)}" height="${round(bounds.bottom - bounds.top)}" fill="#808080" opacity="${manifest.selection.overlayOpacity}" style="mix-blend-mode:${manifest.selection.overlayBlendMode}"/>`
      : ''

  const controls = selectionControls({ bounds, variant: manifest.selection.variant, stroke: '#a6cdf5', handleSize })
  const cursors = []
  const cursorEvidence = []
  let collaboratorIndex = 0

  for (const cursor of manifest.cursors) {
    if (cursor.kind === 'local') {
      const hotspot = anchorPoint(bounds, cursor.anchor)

      cursors.push(
        cursorPath({
          hotspot,
          direction: cursor.direction,
          size: localSize,
          fill: '#111111',
          stroke: '#ffffff',
          strokeWidth: Math.max(2, canvas.width * 0.003),
          id: cursor.id,
          kind: cursor.kind,
          state: 'acting',
          action: cursor.action
        })
      )
      cursorEvidence.push({
        id: cursor.id,
        state: 'acting',
        action: cursor.action,
        direction: cursor.direction,
        anchor: cursor.anchor,
        hotspot: { x: round(hotspot.x), y: round(hotspot.y) },
        touchesTarget: true
      })
      continue
    }

    const state = cursor.state ?? 'acting'

    const hotspot =
      state === 'moving'
        ? movingHotspot({
            canvas,
            region: cursor.canvasRegion,
            selectionBounds: bounds,
            clearance: collaboratorSize * 2.5
          })
        : anchorPoint(bounds, cursor.anchor)

    if (!hotspot) throw new Error(`No free semantic canvas position for moving cursor ${cursor.id}`)

    const color = palette[collaboratorIndex % palette.length]

    const labelInk =
      color === axisAdvertising.color.growthOnDark || color === axisAdvertising.color.accentSurface
        ? '#00284d'
        : '#ffffff'

    const labelWidth = measureLabel(cursor.label, labelFontSize) + labelFontSize * 1.6

    const label = labelPlacement({
      hotspot,
      direction: cursor.direction,
      labelWidth,
      labelHeight,
      cursorSize: collaboratorSize,
      gap
    })

    cursors.push(`<g data-axis-collaborator="${escapeXml(cursor.label)}" data-axis-participant-kind="${cursor.participantKind}" data-axis-cursor-attachment="${cursor.attachment}">
      <rect x="${round(label.x)}" y="${round(label.y)}" width="${round(labelWidth)}" height="${round(labelHeight)}" rx="${round(labelHeight * 0.28)}" fill="${color}"/>
      <text x="${round(label.x + labelFontSize * 0.8)}" y="${round(label.y + labelHeight * 0.68)}" fill="${labelInk}" font-family="Poppins, sans-serif" font-size="${round(labelFontSize)}" font-weight="700">${escapeXml(cursor.label)}</text>
      ${cursorPath({ hotspot, direction: cursor.direction, size: collaboratorSize, fill: color, stroke: color, strokeWidth: 1, id: cursor.id, kind: cursor.kind, state, action: cursor.action })}
    </g>`)
    cursorEvidence.push({
      id: cursor.id,
      state,
      action: cursor.action,
      direction: cursor.direction,
      anchor: state === 'acting' ? cursor.anchor : undefined,
      canvasRegion: state === 'moving' ? cursor.canvasRegion : undefined,
      hotspot: { x: round(hotspot.x), y: round(hotspot.y) },
      touchesTarget: state === 'acting',
      clearOfTarget: state === 'moving' ? !pointInside(hotspot, bounds, collaboratorSize * 2.5) : undefined,
      label: cursor.label,
      participantKind: cursor.participantKind,
      attachment: cursor.attachment,
      labelGap: round(gap),
      labelBounds: {
        left: round(label.x),
        top: round(label.y),
        right: round(label.x + labelWidth),
        bottom: round(label.y + labelHeight)
      }
    })
    collaboratorIndex += 1
  }

  return {
    bounds: Object.fromEntries(Object.entries(bounds).map(([key, value]) => [key, round(value)])),
    underlay: overlay,
    overlay: `<g data-axis-collaboration-selection="${escapeXml(manifest.target.id)}" data-axis-selection-variant="${manifest.selection.variant}">${controls}${cursors.join('')}</g>`,
    evidence: {
      schema: manifest.schema,
      contract: manifest.contract,
      target: manifest.target,
      selection: manifest.selection,
      cursorEvidence,
      noFreeCoordinates: true,
      targetGeometrySource: 'rendered-content-bounds',
      withinCanvas:
        bounds.left >= 0 &&
        bounds.top >= 0 &&
        bounds.right <= canvas.width &&
        bounds.bottom <= canvas.height &&
        cursorEvidence.every(
          cursor =>
            !cursor.labelBounds ||
            (cursor.labelBounds.left >= 0 &&
              cursor.labelBounds.top >= 0 &&
              cursor.labelBounds.right <= canvas.width &&
              cursor.labelBounds.bottom <= canvas.height)
        )
    }
  }
}
