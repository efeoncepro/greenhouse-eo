'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import {
  GreenhouseAnchoredDisclosure,
  GreenhouseFigmaNodeButton
} from '@/components/greenhouse/primitives'
import { AXIS_FILE_KEY } from '@/components/greenhouse/primitives/GreenhouseFigmaNodeButton'
import { parseFigmaUrl } from '@/lib/design-system/figma-nodes/parse-figma-url'

import FigmaNodeLinkEditor, { type FigmaNodeLinkStatus } from './FigmaNodeLinkEditor'

export interface FigmaNodeLinkResult {
  ok: boolean
  error?: string
}

export interface FigmaNodeLinkAffordanceProps {
  /** Current linked node id (null/empty when the page has none). */
  nodeId?: string | null
  fileName?: string
  /** Designer capability `design_system.figma_node.link`. When false, only the button. */
  canLink: boolean
  /** Persist the link. Returns `{ ok }` or `{ ok:false, error }`. */
  onLink: (url: string) => Promise<FigmaNodeLinkResult>
  /** Harness-only: force the editor open for GVC. */
  defaultOpen?: boolean
}

/**
 * FigmaNodeLinkAffordance — the "+" link control left of the Figma node button (TASK-1072).
 *
 * Consumes the canonical `GreenhouseAnchoredDisclosure kind='figmaNodeLink'` (designer-only):
 * a rotating "+" trigger anchors the inline editor to link/change the page's AXIS Figma node,
 * with the node button as the `companion` on the right. When `canLink` is false, only the node
 * button renders — seeing the Design System (view) ≠ linking a node (entitlement). This view
 * owns the parse/link state; the trigger/surface/companion layout is the primitive.
 */
const FigmaNodeLinkAffordance = ({
  nodeId,
  fileName,
  canLink,
  onLink,
  defaultOpen = false
}: FigmaNodeLinkAffordanceProps) => {
  const [open, setOpen] = useState(defaultOpen)
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<FigmaNodeLinkStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [nodeThumbnailUrl, setNodeThumbnailUrl] = useState<string | null>(null)
  const [thumbnailStatus, setThumbnailStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')

  const parsed = useMemo(() => parseFigmaUrl(value), [value])
  const mode: 'link' | 'change' = nodeId ? 'change' : 'link'

  // Slice 4 — real node render preview. Debounced fetch when the pasted URL parses to
  // a valid AXIS node; degrades honest to identity fallback when no token / API fails.
  const previewKey = status === 'valid' && parsed ? `${parsed.fileKey}|${parsed.nodeId}` : null
  const latestPreviewKey = useRef<string | null>(null)

  useEffect(() => {
    latestPreviewKey.current = previewKey

    if (!previewKey || !parsed) {
      setNodeThumbnailUrl(null)
      setThumbnailStatus('idle')

      return
    }

    setNodeThumbnailUrl(null)
    setThumbnailStatus('loading')

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/design-system/figma-nodes/preview?fileKey=${encodeURIComponent(parsed.fileKey)}&nodeId=${encodeURIComponent(parsed.nodeId)}`
        )

        if (latestPreviewKey.current !== previewKey) return

        if (!res.ok) {
          setThumbnailStatus('unavailable')

          return
        }

        const payload = (await res.json()) as { imageUrl?: string | null; status?: string }

        if (latestPreviewKey.current !== previewKey) return

        if (payload.status === 'ready' && payload.imageUrl) {
          setNodeThumbnailUrl(payload.imageUrl)
          setThumbnailStatus('ready')
        } else {
          setThumbnailStatus('unavailable')
        }
      } catch {
        if (latestPreviewKey.current === previewKey) setThumbnailStatus('unavailable')
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [previewKey, parsed])

  const handleChange = (next: string) => {
    setValue(next)
    setErrorMessage(null)

    if (next.trim() === '') {
      setStatus('idle')

      return
    }

    const p = parseFigmaUrl(next)

    if (!p) {
      setStatus('invalid')
      setErrorMessage('No parece un enlace de nodo Figma')

      return
    }

    if (p.fileKey !== AXIS_FILE_KEY) {
      setStatus('wrong-file')
      setErrorMessage('El nodo debe ser del archivo AXIS')

      return
    }

    setStatus('valid')
  }

  const resetForm = () => {
    setValue('')
    setStatus('idle')
    setErrorMessage(null)
    setNodeThumbnailUrl(null)
    setThumbnailStatus('idle')
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) resetForm()
  }

  const handleSubmit = async () => {
    if (status !== 'valid') return

    setStatus('validating')

    try {
      const result = await onLink(value)

      if (!result.ok) {
        setStatus('error')
        setErrorMessage(result.error ?? null)

        return
      }

      setOpen(false)
      resetForm()
    } catch {
      setStatus('error')
      setErrorMessage('No se pudo vincular el nodo. Reintenta.')
    }
  }

  if (!canLink) {
    return <GreenhouseFigmaNodeButton nodeId={nodeId} fileName={fileName} />
  }

  return (
    <GreenhouseAnchoredDisclosure
      kind='figmaNodeLink'
      triggerAriaLabel={mode === 'change' ? 'Cambiar nodo Figma' : 'Vincular nodo Figma'}
      triggerDataCapture='figma-node-link-trigger'
      surfaceWidth={360}
      open={open}
      onOpenChange={handleOpenChange}
      companion={<GreenhouseFigmaNodeButton nodeId={nodeId} fileName={fileName} />}
      content={({ close }) => (
        <FigmaNodeLinkEditor
          mode={mode}
          value={value}
          onChange={handleChange}
          parsed={parsed}
          status={status}
          errorMessage={errorMessage}
          currentNodeId={nodeId}
          nodeThumbnailUrl={nodeThumbnailUrl}
          thumbnailStatus={thumbnailStatus}
          onSubmit={handleSubmit}
          onClose={close}
        />
      )}
    />
  )
}

export default FigmaNodeLinkAffordance
