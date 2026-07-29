'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'

import { findPattern } from '@efeoncepro/axis-ui-registry'

export type AxisStatusState = 'neutral' | 'success' | 'warning' | 'danger' | 'unknown'

const AXIS_STATUS = findPattern('efeonce.status')

if (AXIS_STATUS === undefined) {
  throw new Error('AXIS status contract is missing from the registry')
}

const CHIP_COLOR: Record<AxisStatusState, 'default' | 'success' | 'warning' | 'error'> = {
  neutral: 'default',
  success: 'success',
  warning: 'warning',
  danger: 'error',
  unknown: 'default'
}

export type AxisStatusProps = {
  label: ReactNode
  state?: AxisStatusState
  hint?: string
}

/** Greenhouse/MUI adapter for the governed AXIS status contract. */
const AxisStatus = ({ label, state = 'neutral', hint }: AxisStatusProps) => (
  <Chip
    color={CHIP_COLOR[state]}
    data-axis-contract={AXIS_STATUS.id}
    data-axis-contract-version={AXIS_STATUS.version}
    icon={
      <Box
        component='span'
        aria-hidden='true'
        sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: state === 'danger' ? 'error.main' : `${CHIP_COLOR[state]}.main`
        }}
      />
    }
    label={label}
    title={hint}
    variant='outlined'
  />
)

export default AxisStatus
