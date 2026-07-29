'use client'

import type { ComponentProps } from 'react'

import Box from '@mui/material/Box'

import { findPattern } from '@efeoncepro/axis-ui-registry'

import GreenhouseStepperProgressMicro from './GreenhouseStepperProgressMicro'

const AXIS_PROGRESS = findPattern('efeonce.progress')

if (AXIS_PROGRESS === undefined) {
  throw new Error('AXIS progress contract is missing from the registry')
}

export type AxisProgressProps = ComponentProps<typeof GreenhouseStepperProgressMicro>

/** Greenhouse/MUI adapter for the governed AXIS progress contract. */
const AxisProgress = (props: AxisProgressProps) => (
  <Box
    tabIndex={0}
    data-axis-contract={AXIS_PROGRESS.id}
    data-axis-contract-version={AXIS_PROGRESS.version}
    data-axis-owner={AXIS_PROGRESS.owner}
  >
    <GreenhouseStepperProgressMicro {...props} />
  </Box>
)

export default AxisProgress
