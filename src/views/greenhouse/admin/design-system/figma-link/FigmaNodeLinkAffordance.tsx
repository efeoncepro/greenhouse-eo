'use client'

import { useMemo, useState } from 'react'

import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

import useReducedMotion from '@/hooks/useReducedMotion'
import {
  GreenhouseFloatingSurface,
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
 * A circular "+" icon (designer-only) anchors a `GreenhouseFloatingSurface inlineEditor`
 * to link/change the page's AXIS Figma node. The "+" rotates 45° (→ ×) while open and
 * returns on close (reduced-motion baked). When `canLink` is false, only the node button
 * renders — seeing the Design System (view) ≠ linking a node (entitlement).
 */
const FigmaNodeLinkAffordance = ({
  nodeId,
  fileName,
  canLink,
  onLink,
  defaultOpen = false
}: FigmaNodeLinkAffordanceProps) => {
  const reduced = useReducedMotion()
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
    <Stack direction='row' alignItems='center' spacing={2}>
      <GreenhouseFloatingSurface
        variant='inlineEditor'
        width={360}
        open={open}
        onOpenChange={handleOpenChange}
        anchor={anchorProps => (
          <Tooltip title={mode === 'change' ? 'Cambiar nodo Figma' : 'Vincular nodo Figma'} disableInteractive>
            <IconButton
              {...anchorProps}
              size='small'
              aria-label={mode === 'change' ? 'Cambiar nodo Figma' : 'Vincular nodo Figma'}
              sx={{
                inlineSize: 32,
                blockSize: 32,
                color: 'text.secondary',
                border: theme => `1px solid ${theme.palette.divider}`,
                transition: reduced
                  ? 'none'
                  : theme => theme.transitions.create(['background-color', 'border-color', 'color']),
                '& i': {
                  fontSize: 18,
                  transition: reduced
                    ? 'none'
                    : theme => theme.transitions.create('transform', { duration: theme.transitions.duration.standard }),
                  transform: open ? 'rotate(45deg)' : 'rotate(0deg)'
                },
                '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main', color: 'primary.main' }
              }}
            >
              <i className='tabler-plus' aria-hidden='true' />
            </IconButton>
          </Tooltip>
        )}
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
      <GreenhouseFigmaNodeButton nodeId={nodeId} fileName={fileName} />
    </Stack>
  )
}

export default FigmaNodeLinkAffordance
