'use client'

import { useMemo, useState } from 'react'

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

  const parsed = useMemo(() => parseFigmaUrl(value), [value])
  const mode: 'link' | 'change' = nodeId ? 'change' : 'link'

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
          onSubmit={handleSubmit}
          onClose={close}
        />
      )}
    />
  )
}

export default FigmaNodeLinkAffordance
