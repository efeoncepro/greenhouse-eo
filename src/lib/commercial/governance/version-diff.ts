import 'server-only'

import type { VersionDiff, VersionDiffChange, VersionDiffLineItem } from './contracts'

export interface SnapshotLine {
  lineItemId?: string
  label: string
  quantity?: number | null
  unitPrice?: number | null
  subtotalPrice?: number | null
  subtotalAfterDiscount?: number | null
  effectiveMarginPct?: number | null
}

export interface SnapshotTotals {
  totalPrice: number | null
  effectiveMarginPct: number | null
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const round2 = (value: number): number => Math.round(value * 100) / 100

const diffPct = (previous: number | null, current: number | null): number | null => {
  if (previous === null || current === null || previous === 0) return null

  return round2(((current - previous) / Math.abs(previous)) * 100)
}

const toDiffLine = (line: SnapshotLine): VersionDiffLineItem => ({
  label: line.label,
  unitPrice: toNumberOrNull(line.unitPrice),
  quantity: toNumberOrNull(line.quantity),
  subtotalPrice: toNumberOrNull(line.subtotalAfterDiscount ?? line.subtotalPrice)
})

const buildKey = (line: SnapshotLine, index: number): string => {
  if (line.lineItemId) return `id:${line.lineItemId}`

  return `label:${line.label}:${index}`
}

export const computeVersionDiff = (
  previous: { lines: SnapshotLine[]; totals: SnapshotTotals },
  current: { lines: SnapshotLine[]; totals: SnapshotTotals }
): VersionDiff => {
  const prevMap = new Map<string, SnapshotLine>()
  const currMap = new Map<string, SnapshotLine>()

  previous.lines.forEach((line, index) => prevMap.set(buildKey(line, index), line))
  current.lines.forEach((line, index) => currMap.set(buildKey(line, index), line))

  const added: VersionDiffLineItem[] = []
  const removed: VersionDiffLineItem[] = []
  const changed: VersionDiffChange[] = []

  for (const [key, currLine] of currMap) {
    const prevLine = prevMap.get(key)

    if (!prevLine) {
      added.push(toDiffLine(currLine))

      continue
    }

    const prevUnit = toNumberOrNull(prevLine.unitPrice)
    const currUnit = toNumberOrNull(currLine.unitPrice)

    if (prevUnit !== currUnit) {
      changed.push({
        label: currLine.label,
        field: 'unit_price',
        oldValue: prevUnit,
        newValue: currUnit,
        deltaPct: diffPct(prevUnit, currUnit)
      })
    }

    const prevQty = toNumberOrNull(prevLine.quantity)
    const currQty = toNumberOrNull(currLine.quantity)

    if (prevQty !== currQty) {
      changed.push({
        label: currLine.label,
        field: 'quantity',
        oldValue: prevQty,
        newValue: currQty,
        deltaPct: diffPct(prevQty, currQty)
      })
    }

    const prevSubtotal = toNumberOrNull(prevLine.subtotalAfterDiscount ?? prevLine.subtotalPrice)
    const currSubtotal = toNumberOrNull(currLine.subtotalAfterDiscount ?? currLine.subtotalPrice)

    if (prevSubtotal !== currSubtotal) {
      changed.push({
        label: currLine.label,
        field: 'subtotal',
        oldValue: prevSubtotal,
        newValue: currSubtotal,
        deltaPct: diffPct(prevSubtotal, currSubtotal)
      })
    }
  }

  for (const [key, prevLine] of prevMap) {
    if (!currMap.has(key)) {
      removed.push(toDiffLine(prevLine))
    }
  }

  const prevTotal = toNumberOrNull(previous.totals.totalPrice)
  const currTotal = toNumberOrNull(current.totals.totalPrice)
  const prevMargin = toNumberOrNull(previous.totals.effectiveMarginPct)
  const currMargin = toNumberOrNull(current.totals.effectiveMarginPct)

  return {
    added,
    removed,
    changed,
    impact: {
      previousTotal: prevTotal,
      currentTotal: currTotal,
      totalDeltaPct: diffPct(prevTotal, currTotal),
      previousMargin: prevMargin,
      currentMargin: currMargin,
      marginDelta:
        prevMargin !== null && currMargin !== null ? round2(currMargin - prevMargin) : null
    }
  }
}

export const deserializeSnapshotLines = (snapshot: unknown): SnapshotLine[] => {
  if (!snapshot) return []

  if (typeof snapshot === 'string') {
    try {
      const parsed = JSON.parse(snapshot)

      return Array.isArray(parsed) ? (parsed as SnapshotLine[]) : []
    } catch {
      return []
    }
  }

  if (Array.isArray(snapshot)) {
    return snapshot as SnapshotLine[]
  }

  return []
}
