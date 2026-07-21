'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'

import CompositionShell from '../composition-shell/CompositionShell'
import type { CompositionShellRegion } from '../composition-shell/composition-shell-types'
import { SURFACE_RECIPE_COMPOSITIONS } from './surface-system-controller'
import type { SurfaceRecipeKind } from './surface-system-types'

export interface SurfaceRecipeProps {
  kind: SurfaceRecipeKind
  header?: ReactNode
  regions: Partial<Record<CompositionShellRegion, ReactNode>>
  instanceId: string
  asideLabel?: string
  detailLabel?: string
  drawerCloseLabel?: string
  leadLabel?: string
  dataCapture?: string
  telemetrySource?: string
  children?: ReactNode
}

const shouldUseWorkPlane = (region: CompositionShellRegion) => region !== 'dock' && region !== 'overlay'

const SurfaceRecipe = ({
  kind,
  header,
  regions,
  instanceId,
  asideLabel,
  detailLabel,
  drawerCloseLabel,
  leadLabel,
  dataCapture,
  telemetrySource,
  children
}: SurfaceRecipeProps) => {
  const composition = SURFACE_RECIPE_COMPOSITIONS[kind]

  const resolvedRegions = Object.fromEntries(
    Object.entries(regions).map(([region, content]) => {
      if (!content || !shouldUseWorkPlane(region as CompositionShellRegion)) return [region, content]

      return [
        region,
        <Box
          key={region}
          data-recipe-plane={region}
          data-ui-surface='contained'
          sx={theme => ({
            minWidth: 0,
            blockSize: '100%',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: `${theme.shape.customBorderRadius.xl}px`,
            boxShadow: theme.greenhouseElevation.raised.boxShadow,
            p: { xs: 3, md: 5 }
          })}
        >
          {content}
        </Box>
      ]
    })
  ) as Partial<Record<CompositionShellRegion, ReactNode>>

  return (
    <Stack
      data-surface-recipe={kind}
      data-recipe-composition={composition}
      data-capture={dataCapture}
      spacing={4}
      sx={{ minWidth: 0 }}
    >
      {header}
      <CompositionShell
        composition={composition}
        fluidity='rich'
        instanceId={instanceId}
        asideLabel={asideLabel}
        detailLabel={detailLabel}
        drawerCloseLabel={drawerCloseLabel}
        leadLabel={leadLabel}
        telemetrySource={telemetrySource}
        regions={resolvedRegions}
      />
      {children}
    </Stack>
  )
}

export default SurfaceRecipe
