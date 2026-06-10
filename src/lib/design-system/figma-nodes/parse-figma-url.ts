/**
 * parseFigmaUrl — pure dissection of a Figma URL into { fileKey, fileName, nodeId }.
 *
 * Inverse of `buildFigmaNodeUrl` (GreenhouseFigmaNodeButton). The URL carries the
 * node id in the `-` form (`205-234905`); we normalize it to the canonical API form
 * (`205:234905`). Pure, no side-effects, no IO — safe on client + server.
 *
 * Accepts:
 *   - figma.com/design/:fileKey/:fileName?node-id=205-234905
 *   - figma.com/file/:fileKey/:fileName?node-id=205-234905   (legacy)
 *   - figma.com/design/:fileKey/branch/:branchKey/:fileName?node-id=…  (branch)
 * Returns null when it is not a Figma URL or has no node-id.
 *
 * Canonical reference: TASK-1072 (designer role + Figma node linking).
 */

export interface ParsedFigmaUrl {
  fileKey: string
  fileName: string | null
  /** Canonical API form, `205:234905` (URL `-` normalized to `:`). */
  nodeId: string
}

const FIGMA_HOST = /(^|\.)figma\.com$/i
const FILE_PATH = /^\/(design|file|board)\/([A-Za-z0-9]+)(?:\/(.*))?$/

export const parseFigmaUrl = (raw: string | null | undefined): ParsedFigmaUrl | null => {
  if (!raw || typeof raw !== 'string') return null

  // Tolerate paste artifacts: a leading "@" (Figma / editor "copy link as mention"),
  // angle-bracket wrapping (<url>), and surrounding quotes/whitespace.
  const normalized = raw
    .trim()
    .replace(/^<(.*)>$/, '$1')
    .replace(/^['"]|['"]$/g, '')
    .replace(/^@+/, '')
    .trim()

  if (!normalized) return null

  let url: URL

  try {
    url = new URL(normalized)
  } catch {
    return null
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (!FIGMA_HOST.test(url.hostname)) return null

  const pathMatch = url.pathname.match(FILE_PATH)

  if (!pathMatch) return null

  const fileKey = pathMatch[2]

  if (!fileKey) return null

  const rawNode = url.searchParams.get('node-id')

  if (!rawNode || !rawNode.trim()) return null

  // node-id in the URL uses `-`; canonical API form uses `:`. Validate the shape.
  const nodeId = rawNode.trim().replace(/-/g, ':')

  if (!/^\d+:\d+$/.test(nodeId)) return null

  // fileName: the segment after the fileKey, minus a leading `branch/<key>/` if present.
  let rest = pathMatch[3] ?? ''
  const branchMatch = rest.match(/^branch\/[A-Za-z0-9]+\/(.*)$/)

  if (branchMatch) rest = branchMatch[1]
  const fileName = rest ? decodeURIComponent(rest.split('/')[0]) || null : null

  return { fileKey, fileName, nodeId }
}
