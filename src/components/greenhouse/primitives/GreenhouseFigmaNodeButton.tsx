'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'

import GreenhouseButton from './GreenhouseButton'
import type { GreenhouseButtonProps } from './GreenhouseButton'
import { AXIS_FILE_KEY, AXIS_FILE_NAME, buildFigmaNodeUrl } from '@/lib/design-system/figma-nodes/axis-file'

/**
 * GreenhouseFigmaNodeButton — canonical "open the AXIS Figma node" control.
 *
 * Wraps `GreenhouseButton` (never reinvents the base). Given a Figma `nodeId`
 * it builds the canonical AXIS node URL (`figma.com/design/<fileKey>/...?node-id=`)
 * and opens it in a new tab. When NO node is associated it renders **disabled**
 * with a hint tooltip — a deliberate signal to the team that the surface still
 * needs an AXIS node created and linked. Default file = the AXIS master
 * (`yyMksCoijfMaIoYplXKZaR`), so callers usually only pass `nodeId`.
 */

// Re-export desde el módulo universal (SoT) para backward-compat del barrel + tests.
// Importar estos valores desde este módulo 'use client' hacia código server los
// volvía client-refs en el bundle de Vercel (rompía `fileKey === AXIS_FILE_KEY`
// server-side); el server ahora importa directo de `axis-file`. TASK-1072.
export { AXIS_FILE_KEY, AXIS_FILE_NAME, buildFigmaNodeUrl }

const DEFAULT_LABEL = 'Nodo Figma'
const DEFAULT_OPEN_TOOLTIP = 'Abrir el nodo en AXIS (Figma)'
const DEFAULT_PENDING_TOOLTIP = 'Sin nodo AXIS asociado — créalo en Figma y enlázalo aquí'

export interface GreenhouseFigmaNodeButtonProps {
  /**
   * Figma node id. Accepts both the API form `205:234905` and the URL form
   * `205-234905`. When `null`/empty/undefined the button renders disabled to
   * flag that this surface still needs an AXIS node.
   */
  nodeId?: string | null
  /** Figma file key. Defaults to the AXIS master file. */
  fileKey?: string
  /** Figma file name slug used in the URL. Defaults to the AXIS file. */
  fileName?: string
  label?: string
  /** Tooltip shown when a node IS linked. */
  openTooltip?: string
  /** Tooltip shown when no node is linked (the create-it hint). */
  pendingTooltip?: string
  variant?: GreenhouseButtonProps['variant']
  tone?: GreenhouseButtonProps['tone']
  size?: GreenhouseButtonProps['size']
  dataCapture?: string
}

const GreenhouseFigmaNodeButton = ({
  nodeId,
  fileKey = AXIS_FILE_KEY,
  fileName = AXIS_FILE_NAME,
  label = DEFAULT_LABEL,
  openTooltip = DEFAULT_OPEN_TOOLTIP,
  pendingTooltip = DEFAULT_PENDING_TOOLTIP,
  variant = 'outlined',
  tone,
  size = 'small',
  dataCapture = 'figma-node-button'
}: GreenhouseFigmaNodeButtonProps) => {
  const trimmed = nodeId?.trim()

  if (!trimmed) {
    return (
      <Tooltip title={pendingTooltip}>
        {/* span keeps the tooltip reachable while the button is disabled */}
        <Box component='span' sx={{ display: 'inline-flex' }}>
          <GreenhouseButton
            disabled
            kind='inlineAction'
            variant={variant}
            tone={tone}
            size={size}
            leadingIconClassName='tabler-brand-figma'
            dataCapture={`${dataCapture}-pending`}
          >
            {label}
          </GreenhouseButton>
        </Box>
      </Tooltip>
    )
  }

  // `target`/`rel` are valid anchor attrs once `component={Link}` is set, but
  // GreenhouseButtonProps (a fixed Omit<ButtonProps>) doesn't surface them.
  const externalTabProps = { target: '_blank', rel: 'noopener noreferrer' } as unknown as Partial<GreenhouseButtonProps>

  return (
    <Tooltip title={openTooltip}>
      <GreenhouseButton
        component={Link}
        href={buildFigmaNodeUrl(trimmed, fileKey, fileName)}
        kind='inlineAction'
        variant={variant}
        tone={tone}
        size={size}
        leadingIconClassName='tabler-brand-figma'
        dataCapture={dataCapture}
        {...externalTabProps}
      >
        {label}
      </GreenhouseButton>
    </Tooltip>
  )
}

export default GreenhouseFigmaNodeButton
